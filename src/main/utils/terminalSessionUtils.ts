import fs from 'node:fs';
import path from 'node:path';
import type { TerminalProfileKind } from '../../shared/terminalTypes';
import { isValidIdentifier } from './security';

export interface ShellSpawnSpec {
  command: string;
  args: string[];
  kind: TerminalProfileKind;
  label: string;
  prompt: string;
  initInput?: string;
}

/**
 * Remove sequências ANSI/VT100 (CSI, OSC e carriage returns isolados) para manter
 * a saída legível linha a linha no visualizador integrado.
 */
export function stripAnsiSequences(text: string): string {
  if (!text) return '';
  return text
    // OSC: ESC ] ... BEL ou ESC \
    // eslint-disable-next-line no-control-regex
    .replace(/\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)/g, '')
    // CSI e sequências ESC de 2 bytes
    // eslint-disable-next-line no-control-regex
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/\u001b[@-Z\\-_]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

/** Valida alvo SSH no formato usuario@host ou host (opcionalmente :porta), bloqueando flags e metacaracteres. */
export function parseSshTarget(rawTarget: string, explicitPort?: number): { target: string; port?: number } | null {
  const trimmed = String(rawTarget || '').trim();
  if (!trimmed || trimmed.startsWith('-') || trimmed.length > 200) return null;

  const match = /^([a-zA-Z0-9._-]+(?:@[a-zA-Z0-9._-]+)?)(?::(\d{1,5}))?$/.exec(trimmed);
  if (!match) return null;

  const target = match[1];
  if (target.startsWith('-')) return null;

  const portCandidate = explicitPort ?? (match[2] ? Number(match[2]) : undefined);
  if (portCandidate !== undefined) {
    if (!Number.isInteger(portCandidate) || portCandidate < 1 || portCandidate > 65535) return null;
  }

  return { target, port: portCandidate };
}

export function findGitBashExecutable(platform: NodeJS.Platform = process.platform): string | null {
  if (platform !== 'win32') return null;
  const localAppData = process.env.LOCALAPPDATA || '';
  const candidates = [
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
    localAppData ? path.join(localAppData, 'Programs', 'Git', 'bin', 'bash.exe') : ''
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p)) || null;
}

export function buildShellSpawnSpec(
  profileId: string,
  options: {
    platform?: NodeJS.Platform;
    gitBashPath?: string | null;
    sshTarget?: string;
    sshPort?: number;
  } = {}
): ShellSpawnSpec | null {
  const platform = options.platform ?? process.platform;

  if (profileId === 'powershell') {
    if (platform === 'win32') {
      return {
        command: 'powershell.exe',
        args: ['-NoLogo', '-NoExit', '-Command', '-'],
        kind: 'powershell',
        label: 'Windows PowerShell',
        prompt: 'PS>',
        initInput: '[Console]::InputEncoding = [System.Text.Encoding]::UTF8; [Console]::OutputEncoding = [System.Text.Encoding]::UTF8'
      };
    }
    return {
      command: 'pwsh',
      args: ['-NoLogo', '-NoExit', '-Command', '-'],
      kind: 'powershell',
      label: 'PowerShell',
      prompt: 'PS>'
    };
  }

  if (profileId === 'pwsh') {
    return {
      command: platform === 'win32' ? 'pwsh.exe' : 'pwsh',
      args: ['-NoLogo', '-NoExit', '-Command', '-'],
      kind: 'powershell',
      label: 'PowerShell 7',
      prompt: 'PS>'
    };
  }

  if (profileId === 'cmd' && platform === 'win32') {
    const comspec = process.env.ComSpec || process.env.COMSPEC || 'C:\\Windows\\System32\\cmd.exe';
    return {
      command: comspec,
      args: ['/Q', '/K', 'chcp 65001>nul'],
      kind: 'cmd',
      label: 'Command Prompt',
      prompt: 'cmd>'
    };
  }

  if (profileId === 'git-bash' && platform === 'win32') {
    const exe = options.gitBashPath ?? findGitBashExecutable(platform);
    if (!exe) return null;
    return {
      command: exe,
      args: [],
      kind: 'git-bash',
      label: 'Git Bash',
      prompt: 'bash$'
    };
  }

  if (profileId === 'bash') {
    const bashExe = platform !== 'win32' && fs.existsSync('/bin/bash') ? '/bin/bash' : 'bash';
    return {
      command: bashExe,
      args: [],
      kind: 'bash',
      label: 'Bash',
      prompt: 'bash$'
    };
  }

  if (profileId === 'sh') {
    return {
      command: '/bin/sh',
      args: [],
      kind: 'bash',
      label: 'Shell (sh)',
      prompt: 'sh$'
    };
  }

  if (profileId === 'zsh') {
    return {
      command: fs.existsSync('/bin/zsh') ? '/bin/zsh' : 'zsh',
      args: [],
      kind: 'bash',
      label: 'Zsh',
      prompt: 'zsh%'
    };
  }

  if (profileId.startsWith('wsl:') && platform === 'win32') {
    const distro = profileId.slice(4).trim();
    if (!distro || !isValidIdentifier(distro)) return null;
    return {
      command: 'wsl.exe',
      args: ['-d', distro, '--', 'sh', '-c', 'command -v bash >/dev/null 2>&1 && exec bash || exec sh'],
      kind: 'wsl',
      label: distro,
      prompt: `${distro}$`
    };
  }

  if (profileId === 'ssh') {
    const parsed = parseSshTarget(options.sshTarget || '', options.sshPort);
    if (!parsed) return null;
    const args = ['-T', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=8'];
    if (parsed.port) args.push('-p', String(parsed.port));
    args.push(parsed.target);
    return {
      command: 'ssh',
      args,
      kind: 'ssh',
      label: `SSH ${parsed.target}`,
      prompt: `${parsed.target}$`
    };
  }

  return null;
}
