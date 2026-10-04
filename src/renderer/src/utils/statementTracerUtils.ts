import type {
  OracleCaptureState,
  OracleCapturedBind,
  OracleRecentStatement,
  OracleSessionCaptureEntry
} from '../../../shared/types';

export interface SelectedStatementInfo {
  sqlId: string;
  sqlText: string;
  username?: string | null;
  program?: string | null;
  machine?: string | null;
  module?: string | null;
  action?: string | null;
  timestamp?: string | null;
  binds?: OracleCapturedBind[];
  interpolatedSql?: string;
}

export type TracerView = 'sessions' | 'recent';

export const INTERVAL_OPTIONS = [
  { label: '2s', value: 2000 },
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
  { label: '30s', value: 30000 }
];

export const UI_REFRESH_MS = 2000;

export const EMPTY_STATE: OracleCaptureState = {
  isCapturing: false,
  startedAt: null,
  intervalMs: 0,
  pollCount: 0,
  lastPolledAt: null,
  lastError: null,
  statements: [],
  sessionEvents: []
};

export function buildSelectionFromSessionEvent(ev: OracleSessionCaptureEntry): SelectedStatementInfo {
  return {
    sqlId: ev.sqlId || '',
    sqlText: ev.sqlText || '',
    username: ev.username,
    program: ev.program,
    machine: ev.machine,
    module: ev.module,
    action: ev.action,
    timestamp: ev.capturedAt,
    binds: ev.binds,
    interpolatedSql: ev.interpolatedSql
  };
}

export function buildSelectionFromStatement(st: OracleRecentStatement): SelectedStatementInfo {
  return {
    sqlId: st.sqlId,
    sqlText: st.sqlText,
    username: st.parsingSchemaName,
    module: st.module,
    action: st.action,
    timestamp: st.lastActiveTime,
    binds: st.binds,
    interpolatedSql: st.interpolatedSql
  };
}

/**
 * Se o novo snapshot trouxe binds para o item selecionado (que ainda não os tinha),
 * devolve o item atualizado; caso contrário devolve null (nada a fazer).
 */
export function mergeSnapshotBinds(
  selected: SelectedStatementInfo | null,
  statements: OracleCaptureState['statements']
): SelectedStatementInfo | null {
  if (!selected?.sqlId) return null;
  const matching = statements.find((s) => s.sqlId === selected.sqlId);
  if (matching?.binds && matching.binds.length > 0 && (!selected.binds || selected.binds.length === 0)) {
    return {
      ...selected,
      binds: matching.binds,
      interpolatedSql: matching.interpolatedSql || selected.interpolatedSql
    };
  }
  return null;
}

export function computeElapsedSec(startedAt: string | null, now: number): number {
  return startedAt ? Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000)) : 0;
}

export function formatBindsCount(count: number): string {
  return `${count} ${count === 1 ? 'bind' : 'binds'}`;
}
