import type { EnvironmentLog } from '../../../shared/types';

export type TerminalLog = string | EnvironmentLog;
export type TerminalFilterType = 'all' | 'info' | 'success' | 'warning' | 'error';

export function formatTerminalLogsForCopy(logs: TerminalLog[]): string {
  return logs
    .map((l) => (typeof l === 'string' ? l : `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`))
    .join('\n');
}

export function filterTerminalLogs(
  logs: TerminalLog[],
  filterType: TerminalFilterType,
  searchFilter: string
): TerminalLog[] {
  return logs.filter((log) => {
    if (typeof log === 'string') {
      if (searchFilter && !log.toLowerCase().includes(searchFilter.toLowerCase())) return false;
      if (filterType === 'error') return log.includes('[ERRO]') || log.includes('ERROR') || log.includes('[FALHA]');
      if (filterType === 'success') return log.includes('[ OK ]') || log.includes('SUCCESS') || log.includes('✨');
      if (filterType === 'warning') return log.includes('[AVISO]') || log.includes('WARN');
      return true;
    }
    if (searchFilter && !log.message.toLowerCase().includes(searchFilter.toLowerCase())) return false;
    if (filterType !== 'all' && log.type !== filterType) return false;
    return true;
  });
}

export function getTerminalStringLogColor(log: string): string {
  if (log.includes('[ERRO]') || log.includes('[FALHA]') || log.includes('ERROR')) {
    return 'text-rose-400 font-semibold bg-rose-950/20 px-1 py-0.5 rounded';
  }
  if (log.includes('[ OK ]') || log.includes('SUCCESS') || log.includes('sucesso') || log.includes('✨')) {
    return 'text-emerald-400 font-medium';
  }
  if (log.includes('[AVISO]') || log.includes('[INFO]') || log.includes('WARN')) {
    return 'text-amber-300';
  }
  if (log.startsWith('>')) return 'text-primary font-semibold';
  return 'text-slate-300';
}

export function getTerminalEntryStyle(type: EnvironmentLog['type']): { color: string; badge: string } {
  switch (type) {
    case 'success':
      return {
        color: 'text-emerald-300 font-medium',
        badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      };
    case 'error':
      return {
        color: 'text-rose-400 font-semibold bg-rose-950/20 px-1 py-0.5 rounded',
        badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30'
      };
    case 'warning':
      return { color: 'text-amber-300', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
    case 'info':
    default:
      return { color: 'text-primary-foreground', badge: 'bg-primary/10 text-primary border-primary/30' };
  }
}

/** Próximo índice do histórico ao pressionar seta para cima (-1 = fora do histórico). */
export function getPreviousHistoryIndex(historyLength: number, currentIndex: number): number | null {
  if (historyLength === 0) return null;
  return currentIndex === -1 ? historyLength - 1 : Math.max(0, currentIndex - 1);
}

/** Próximo índice ao pressionar seta para baixo; -1 significa voltar ao input vazio. */
export function getNextHistoryIndex(historyLength: number, currentIndex: number): number | null {
  if (currentIndex === -1) return null;
  const next = currentIndex + 1;
  return next >= historyLength ? -1 : next;
}
