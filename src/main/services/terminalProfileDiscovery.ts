import { execFile } from 'node:child_process';
import fs from 'node:fs';
import { promisify } from 'node:util';
import type { TerminalProfile } from '../../shared/terminalTypes';
import { findGitBashExecutable } from '../utils/terminalSessionUtils';
import { decodeWslOutput } from '../utils/wslExec';

const execFileAsync = promisify(execFile);

export async function hasExecutable(bin: string): Promise<boolean> {
  try {
    const cmd = process.platform === 'win32' ? 'where.exe' : 'which';
    await execFileAsync(cmd, [bin], { timeout: 1500, windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

export async function detectWslDistros(): Promise<string[]> {
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

/** Descobre perfis de terminal disponíveis no sistema host (PowerShell, WSL, Git Bash, Bash, etc.). */
export async function discoverTerminalProfiles(): Promise<TerminalProfile[]> {
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
        subtitle: '/bin/zsh'
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
