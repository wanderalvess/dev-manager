import { describe, it, expect } from 'vitest';
import {
  filterTerminalLogs,
  formatTerminalLogsForCopy,
  getNextHistoryIndex,
  getPreviousHistoryIndex,
  getTerminalEntryStyle,
  getTerminalStringLogColor,
  type TerminalLog
} from './terminalViewerUtils';

const makeEntry = (type: 'info' | 'success' | 'warning' | 'error', message: string): TerminalLog =>
  ({ timestamp: '10:00:00', type, message }) as TerminalLog;

describe('formatTerminalLogsForCopy', () => {
  it('formata strings e entradas estruturadas', () => {
    expect(formatTerminalLogsForCopy(['a', makeEntry('error', 'boom')])).toBe('a\n[10:00:00] [ERROR] boom');
  });
});

describe('filterTerminalLogs', () => {
  const logs: TerminalLog[] = ['[ERRO] falhou', '[ OK ] feito', '[AVISO] atenção', makeEntry('error', 'Falha X')];

  it('filtra strings por tipo e entradas pelo campo type', () => {
    expect(filterTerminalLogs(logs, 'error', '')).toEqual(['[ERRO] falhou', logs[3]]);
    expect(filterTerminalLogs(logs, 'success', '')).toEqual(['[ OK ] feito']);
    expect(filterTerminalLogs(logs, 'warning', '')).toEqual(['[AVISO] atenção']);
  });

  it('busca ignora caixa', () => {
    expect(filterTerminalLogs(logs, 'all', 'falha x')).toEqual([logs[3]]);
  });
});

describe('estilos', () => {
  it('classifica cor de string', () => {
    expect(getTerminalStringLogColor('> cmd')).toBe('text-primary font-semibold');
    expect(getTerminalStringLogColor('texto')).toBe('text-slate-300');
    expect(getTerminalStringLogColor('[ERRO] x')).toContain('text-rose-400');
  });

  it('usa estilo info como padrão', () => {
    expect(getTerminalEntryStyle('info').color).toBe('text-primary-foreground');
    expect(getTerminalEntryStyle('warning').color).toBe('text-amber-300');
  });
});

describe('navegação de histórico', () => {
  it('seta para cima', () => {
    expect(getPreviousHistoryIndex(0, -1)).toBeNull();
    expect(getPreviousHistoryIndex(3, -1)).toBe(2);
    expect(getPreviousHistoryIndex(3, 0)).toBe(0);
  });

  it('seta para baixo', () => {
    expect(getNextHistoryIndex(3, -1)).toBeNull();
    expect(getNextHistoryIndex(3, 1)).toBe(2);
    expect(getNextHistoryIndex(3, 2)).toBe(-1);
  });
});
