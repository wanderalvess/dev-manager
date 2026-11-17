import { spawn, execFile, type ChildProcess } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import { promisify } from 'node:util';
import type {
  TerminalCreateRequest,
  TerminalDataEvent,
  TerminalExitEvent,
  TerminalProfile,
  TerminalSessionInfo
} from '../../shared/terminalTypes';
import { createStreamDecoder, killProcessTree } from '../utils/process';
import { isSafeLocalPath } from '../utils/security';
import {
  buildShellSpawnSpec,
  findGitBashExecutable,
  stripAnsiSequences
} from '../utils/terminalSessionUtils';
import { decodeWslOutput } from '../utils/wslExec';

const execFileAsync = promisify(execFile);
const MAX_ACTIVE_SESSIONS = 12;

interface ManagedSession {
  info: TerminalSessionInfo;
  proc: ChildProcess;
  lineEnding: string;
}

async function hasExecutable(bin: string): Promise<boolean> {
  try {
    const cmd = process.platform === 'win32' ? 'where.exe' : 'which';
    await execFileAsync(cmd, [bin], { timeout: 1500, windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

async function detectWslDistros(): Promise<string[]> {
  if (process.platform !== 'win32') return [];
  try {
    const { stdout } = await execFileAsync('wsl.exe', ['-l', '-q'], {
      timeout: 2500,
      windowsHide: true,
      encoding: 'buffer'
    });
    return decodeWslOutput(stdout)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Gerencia sessões persistentes de shell (PowerShell, CMD, Git Bash, WSL, Bash, SSH)
 * compartilhado entre o processo principal do Electron e o servidor Web Express/WS.
 */
export class TerminalSessionService {
  private sessions = new Map<string, ManagedSession>();

  public async listProfiles(): Promise<TerminalProfile[]> {
    const profiles: TerminalProfile[] = [];
    const platform = process.platform;

    if (platform === 'win32') {
      profiles.push({
        id: 'powershell',
        label: 'Windows PowerShell',
        kind: 'powershell',
        prompt: 'PS>',
        subtitle: 'powershell.exe',
        isDefault: true
      });
      if (await hasExecutable('pwsh.exe')) {
        profiles.push({
          id: 'pwsh',
          label: 'PowerShell 7',
          kind: 'powershell',
          prompt: 'PS>',
          subtitle: 'pwsh.exe'
        });
      }
      profiles.push({
        id: 'cmd',
        label: 'Command Prompt',
        kind: 'cmd',
        prompt: 'cmd>',
        subtitle: 'cmd.exe'
      });
      const gitBash = findGitBashExecutable('win32');
      if (gitBash) {
        profiles.push({
          id: 'git-bash',
          label: 'Git Bash',
          kind: 'git-bash',
          prompt: 'bash$',
          subtitle: 'Git for Windows'
        });
      }
      const distros = await detectWslDistros();
      for (const distro of distros) {
        profiles.push({
          id: `wsl:${distro}`,
          label: distro,
          kind: 'wsl',
          prompt: `${distro}$`,
          subtitle: 'WSL'
        });
      }
    } else {
      const hasBash = fs.existsSync('/bin/bash') || (await hasExecutable('bash'));
      if (hasBash) {
        profiles.push({
          id: 'bash',
          label: 'Bash',
          kind: 'bash',
          prompt: 'bash$',
          subtitle: '/bin/bash',
          isDefault: true
        });
      } else {
        profiles.push({
          id: 'sh',
          label: 'Shell (sh)',
          kind: 'bash',
          prompt: 'sh$',
          subtitle: '/bin/sh',
          isDefault: true
        });
      }
      if (fs.existsSync('/bin/zsh') || (await hasExecutable('zsh'))) {
        profiles.push({
          id: 'zsh',
          label: 'Zsh',
          kind: 'bash',
          prompt: 'zsh%',
          subtitle: 'zsh'
        });
      }
      if (await hasExecutable('pwsh')) {
        profiles.push({
          id: 'pwsh',
          label: 'PowerShell',
          kind: 'powershell',
          prompt: 'PS>',
          subtitle: 'pwsh'
        });
      }
    }

    if (await hasExecutable('ssh')) {
      profiles.push({
        id: 'ssh',
        label: 'Nova Sessão SSH...',
        kind: 'ssh',
        prompt: 'ssh$',
        subtitle: 'Chave SSH (BatchMode)'
      });
    }

    return profiles;
  }

  public resolveWorkingDir(requestedCwd?: string, fallbackDir?: string): string {
    const candidates = [requestedCwd, fallbackDir, os.homedir(), process.cwd()];
    for (const candidate of candidates) {
      if (candidate && isSafeLocalPath(candidate)) {
        try {
          if (fs.statSync(candidate).isDirectory()) return candidate;
        } catch {
          // tenta o próximo candidato
        }
      }
    }
    return process.cwd();
  }

  public createSession(
    req: TerminalCreateRequest,
    defaultCwd: string | undefined,
    onData: (event: TerminalDataEvent) => void,
    onExit: (event: TerminalExitEvent) => void
  ): TerminalSessionInfo {
    if (this.sessions.size >= MAX_ACTIVE_SESSIONS) {
      throw new Error(`Limite de ${MAX_ACTIVE_SESSIONS} terminais simultâneos atingido.`);
    }

    const spec = buildShellSpawnSpec(req.profileId, {
      sshTarget: req.sshTarget,
      sshPort: req.sshPort
    });
    if (!spec) {
      throw new Error(`Perfil ou destino inválido para terminal: ${req.profileId}`);
    }

    const cwd = this.resolveWorkingDir(req.cwd, defaultCwd);
    const sessionId = crypto.randomUUID();
    const childEnv: NodeJS.ProcessEnv = {
      ...process.env,
      TERM: 'dumb',
      NO_COLOR: '1',
      PYTHONIOENCODING: 'utf-8'
    };

    const proc = spawn(spec.command, spec.args, {
      cwd,
      env: childEnv,
      shell: false,
      windowsHide: true,
      detached: process.platform !== 'win32'
    });

    const info: TerminalSessionInfo = {
      sessionId,
      profileId: req.profileId,
      kind: spec.kind,
      title: spec.label,
      prompt: spec.prompt,
      cwd,
      pid: proc.pid,
      alive: true
    };

    const lineEnding = spec.kind === 'cmd' ? '\r\n' : '\n';
    this.sessions.set(sessionId, { info, proc, lineEnding });

    const outDecoder = createStreamDecoder();
    const errDecoder = createStreamDecoder();
    const emitText = (raw: string) => {
      const cleaned = stripAnsiSequences(raw);
      if (cleaned) onData({ sessionId, chunk: cleaned });
    };

    proc.stdout?.on('data', (chunk: Buffer) => emitText(outDecoder.write(chunk)));
    proc.stderr?.on('data', (chunk: Buffer) => emitText(errDecoder.write(chunk)));

    proc.on('close', (code) => {
      emitText(outDecoder.flush());
      emitText(errDecoder.flush());
      const session = this.sessions.get(sessionId);
      if (session) session.info.alive = false;
      onExit({ sessionId, code: code ?? null });
    });

    proc.on('error', (err) => {
      emitText(`[ERRO] Falha ao iniciar ${spec.label}: ${err.message}\n`);
      const session = this.sessions.get(sessionId);
      if (session) session.info.alive = false;
      onExit({ sessionId, code: 1 });
    });

    if (spec.initInput && proc.stdin && !proc.stdin.destroyed) {
      proc.stdin.write(spec.initInput + lineEnding);
    }

    return info;
  }

  public writeInput(sessionId: string, input: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !session.info.alive || !session.proc.stdin || session.proc.stdin.destroyed) {
      return false;
    }
    const normalized = String(input || '').replace(/\0/g, '').replace(/\r?\n$/, '');
    if (!normalized) return true;
    session.proc.stdin.write(normalized + session.lineEnding);
    return true;
  }

  public async interruptSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.info.alive || !session.proc.pid) return false;
    if (process.platform !== 'win32') {
      try {
        await execFileAsync('pkill', ['-INT', '-P', String(session.proc.pid)], { timeout: 1500 });
        return true;
      } catch {
        return false;
      }
    }
    try {
      session.proc.stdin?.write('\u0003');
      return true;
    } catch {
      return false;
    }
  }

  public closeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.info.alive = false;
    if (session.proc.pid) {
      killProcessTree(session.proc.pid);
    } else {
      session.proc.kill();
    }
    this.sessions.delete(sessionId);
    return true;
  }

  public disposeAll(): void {
    for (const id of [...this.sessions.keys()]) {
      this.closeSession(id);
    }
  }
}
