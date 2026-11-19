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
  stripAnsiSequences
} from '../utils/terminalSessionUtils';
import { discoverTerminalProfiles } from './terminalProfileDiscovery';

const execFileAsync = promisify(execFile);
const MAX_ACTIVE_SESSIONS = 12;

interface ManagedSession {
  info: TerminalSessionInfo;
  proc: ChildProcess;
  lineEnding: string;
}

/**
 * Gerencia sessões persistentes de shell (PowerShell, CMD, Git Bash, WSL, Bash, SSH)
 * compartilhado entre o processo principal do Electron e o servidor Web Express/WS.
 */
export class TerminalSessionService {
  private sessions = new Map<string, ManagedSession>();

  public async listProfiles(): Promise<TerminalProfile[]> {
    return discoverTerminalProfiles();
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
