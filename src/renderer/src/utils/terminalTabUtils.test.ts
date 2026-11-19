import { describe, expect, it } from 'vitest';
import {
  MAX_SHELL_LINES,
  appendTerminalChunk,
  formatPromptEcho,
  getDefaultShellProfile,
  isLocalClearCommand,
  toDisplayLines
} from './terminalTabUtils';
import type { TerminalProfile } from '../../../shared/terminalTypes';

describe('terminalTabUtils', () => {
  it('reagrupa chunks parciais entre quebras de linha e exibe linha pendente', () => {
    let buf = appendTerminalChunk({ lines: [], partialLine: '' }, 'ola ');
    expect(buf.lines).toEqual([]);
    expect(toDisplayLines(buf)).toEqual(['ola ']);

    buf = appendTerminalChunk(buf, 'mundo\nsegunda linha\r\n');
    expect(buf.lines).toEqual(['ola mundo', 'segunda linha']);
    expect(buf.partialLine).toBe('');
    expect(toDisplayLines(buf)).toEqual(['ola mundo', 'segunda linha']);
  });

  it('limita o historico ao teto MAX_SHELL_LINES mantendo as linhas mais recentes', () => {
    const bulk = Array.from({ length: MAX_SHELL_LINES + 25 }, (_, i) => `l-${i}`).join('\n') + '\n';
    const buf = appendTerminalChunk({ lines: [], partialLine: '' }, bulk);
    expect(buf.lines).toHaveLength(MAX_SHELL_LINES);
    expect(buf.lines[0]).toBe('l-25');
    expect(buf.lines[MAX_SHELL_LINES - 1]).toBe(`l-${MAX_SHELL_LINES + 24}`);
  });

  it('seleciona perfil padrao ignorando SSH e formata echo/clear', () => {
    const profiles: TerminalProfile[] = [
      { id: 'ssh', label: 'SSH', kind: 'ssh', prompt: 'ssh$', isDefault: true },
      { id: 'bash', label: 'Bash', kind: 'bash', prompt: 'bash$', isDefault: true },
      { id: 'pwsh', label: 'PowerShell', kind: 'powershell', prompt: 'PS>' }
    ];
    expect(getDefaultShellProfile(profiles)?.id).toBe('bash');
    expect(formatPromptEcho('bash$', 'ls -la')).toBe('bash$ ls -la');
    expect(isLocalClearCommand(' clear ')).toBe(true);
    expect(isLocalClearCommand('CLS')).toBe(true);
    expect(isLocalClearCommand('ls -la')).toBe(false);
  });
});
