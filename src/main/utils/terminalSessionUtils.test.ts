import { describe, expect, it } from 'vitest';
import { buildShellSpawnSpec, parseSshTarget, stripAnsiSequences } from './terminalSessionUtils';

describe('terminalSessionUtils', () => {
  it('strips ANSI CSI and OSC escape codes cleanly', () => {
    const raw = '\u001b[?2004h\u001b[01;32muser@host\u001b[0m:\u001b[01;34m~/app\u001b[0m$ ls\r\nfile.txt\u001b]0;title\u0007';
    expect(stripAnsiSequences(raw)).toBe('user@host:~/app$ ls\nfile.txt');
  });

  it('validates safe SSH targets and rejects flags or injection', () => {
    expect(parseSshTarget('dev@192.168.0.10:2222')).toEqual({ target: 'dev@192.168.0.10', port: 2222 });
    expect(parseSshTarget('prod-box')).toEqual({ target: 'prod-box', port: undefined });
    expect(parseSshTarget('-oProxyCommand=evil')).toBeNull();
    expect(parseSshTarget('user@host;rm -rf /')).toBeNull();
  });

  it('builds validated shell spawn specs per platform', () => {
    expect(buildShellSpawnSpec('powershell', { platform: 'win32' })?.command).toBe('powershell.exe');
    expect(buildShellSpawnSpec('cmd', { platform: 'win32' })?.kind).toBe('cmd');
    expect(buildShellSpawnSpec('wsl:ubuntu2604-winthor-teste', { platform: 'win32' })?.args).toContain('ubuntu2604-winthor-teste');
    expect(buildShellSpawnSpec('wsl:bad;cmd', { platform: 'win32' })).toBeNull();
    expect(buildShellSpawnSpec('bash', { platform: 'linux' })?.kind).toBe('bash');
    expect(buildShellSpawnSpec('ssh', { sshTarget: 'deploy@srv01' })?.args).toContain('deploy@srv01');
  });
});
