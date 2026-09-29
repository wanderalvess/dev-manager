import React, { useCallback, useEffect, useState } from 'react';
import {
  Radio,
  Play,
  Square,
  Trash2,
  AlertCircle,
  Copy,
  Check,
  Users,
  History,
  Sliders,
  RefreshCw,
  X,
  Sparkles
} from 'lucide-react';
import {
  DatabaseConnectionConfig,
  OracleCaptureState,
  OracleCapturedBind,
  OracleSessionCaptureEntry,
  OracleRecentStatement
} from '../../../../shared/types';
import { interpolateOracleSqlWithBinds } from '../../../../shared/oracleSqlInterpolator';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { apiBridge } from '../../services/apiBridge';

export interface StatementTracerPanelProps {
  activeConnection: DatabaseConnectionConfig | undefined;
  onSelectSql?: (sql: string) => void;
}

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

type TracerView = 'sessions' | 'recent';

const INTERVAL_OPTIONS = [
  { label: '2s', value: 2000 },
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
  { label: '30s', value: 30000 }
];

const UI_REFRESH_MS = 2000;

const EMPTY_STATE: OracleCaptureState = {
  isCapturing: false,
  startedAt: null,
  intervalMs: 0,
  pollCount: 0,
  lastPolledAt: null,
  lastError: null,
  statements: [],
  sessionEvents: []
};

export const StatementTracerPanel: React.FC<StatementTracerPanelProps> = ({ activeConnection, onSelectSql }) => {
  const { copy, copiedKey } = useCopyToClipboard();
  const [view, setView] = useState<TracerView>('sessions');
  const [schemaFilter, setSchemaFilter] = useState('');
  const [textFilter, setTextFilter] = useState('');
  const [intervalMs, setIntervalMs] = useState(5000);
  const [state, setState] = useState<OracleCaptureState>(EMPTY_STATE);
  const [isBusy, setIsBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [selectedItem, setSelectedItem] = useState<SelectedStatementInfo | null>(null);
  const [isFetchingBinds, setIsFetchingBinds] = useState(false);

  const isOracle = activeConnection?.type === 'oracle';
  const connectionId = activeConnection?.id;

  const refreshState = useCallback(async () => {
    if (!connectionId) return;
    try {
      const res = await apiBridge.getOracleCaptureState(connectionId);
      setState(res);

      // Se há um item selecionado, atualiza binds se disponíveis no novo snapshot
      if (selectedItem?.sqlId) {
        const matchingStmt = res.statements.find((s) => s.sqlId === selectedItem.sqlId);
        if (matchingStmt?.binds && matchingStmt.binds.length > 0 && (!selectedItem.binds || selectedItem.binds.length === 0)) {
          setSelectedItem((prev) => prev ? {
            ...prev,
            binds: matchingStmt.binds,
            interpolatedSql: matchingStmt.interpolatedSql || prev.interpolatedSql
          } : null);
        }
      }
    } catch {
      // Falha pontual de leitura de estado não deve derrubar a UI; a próxima leva tenta de novo.
    }
  }, [connectionId, selectedItem]);

  // Hidrata o estado assim que a conexão muda
  useEffect(() => {
    setState(EMPTY_STATE);
    setSelectedItem(null);
    if (connectionId) refreshState();
  }, [connectionId, refreshState]);

  useEffect(() => {
    if (!connectionId) return;
    const timer = setInterval(refreshState, UI_REFRESH_MS);
    return () => clearInterval(timer);
  }, [connectionId, refreshState]);

  // Recalcular tempo decorrido
  useEffect(() => {
    if (!state.isCapturing) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [state.isCapturing]);

  const handleStart = async () => {
    if (!activeConnection) return;
    setIsBusy(true);
    try {
      const res = await apiBridge.startOracleCapture(activeConnection, {
        intervalMs,
        schemaFilter: schemaFilter.trim() || undefined,
        textFilter: textFilter.trim() || undefined
      });
      setState(res);
    } catch (err: any) {
      setState((prev) => ({ ...prev, lastError: err?.message || 'Falha ao iniciar a captura.' }));
    } finally {
      setIsBusy(false);
    }
  };

  const handleStop = async () => {
    if (!connectionId) return;
    setIsBusy(true);
    try {
      const res = await apiBridge.stopOracleCapture(connectionId);
      setState(res);
    } catch (err: any) {
      setState((prev) => ({ ...prev, isCapturing: false, lastError: err?.message || 'Falha ao parar a captura.' }));
    } finally {
      setIsBusy(false);
    }
  };

  const handleClear = async () => {
    if (!connectionId) return;
    setIsBusy(true);
    try {
      const res = await apiBridge.clearOracleCapture(connectionId);
      setState(res);
      setSelectedItem(null);
    } catch (err: any) {
      setState((prev) => ({ ...prev, lastError: err?.message || 'Falha ao limpar a captura.' }));
    } finally {
      setIsBusy(false);
    }
  };

  const handleFetchBinds = async (sqlId: string, sqlText?: string) => {
    if (!activeConnection) return;
    setIsFetchingBinds(true);
    try {
      const res = await apiBridge.getOracleStatementBinds(activeConnection, sqlId, sqlText);
      if (res.success && res.binds) {
        setSelectedItem((prev) => {
          if (!prev || prev.sqlId !== sqlId) return prev;
          return {
            ...prev,
            binds: res.binds,
            interpolatedSql: res.interpolatedSql || prev.interpolatedSql
          };
        });
      }
    } catch (err) {
      console.warn('[StatementTracer] Falha ao consultar binds no Oracle:', err);
    } finally {
      setIsFetchingBinds(false);
    }
  };

  const handleSelectSessionEvent = (ev: OracleSessionCaptureEntry) => {
    const item: SelectedStatementInfo = {
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
    setSelectedItem(item);
    if (ev.sqlId && (!ev.binds || ev.binds.length === 0)) {
      handleFetchBinds(ev.sqlId, ev.sqlText || undefined);
    }
  };

  const handleSelectStatement = (st: OracleRecentStatement) => {
    const item: SelectedStatementInfo = {
      sqlId: st.sqlId,
      sqlText: st.sqlText,
      username: st.parsingSchemaName,
      module: st.module,
      action: st.action,
      timestamp: st.lastActiveTime,
      binds: st.binds,
      interpolatedSql: st.interpolatedSql
    };
    setSelectedItem(item);
    if (st.sqlId && (!st.binds || st.binds.length === 0)) {
      handleFetchBinds(st.sqlId, st.sqlText);
    }
  };

  if (!activeConnection) {
    return (
      <TracerEmptyState
        icon={<Radio className="w-8 h-8 mx-auto opacity-30 text-sky-500" />}
        title="Nenhuma conexão selecionada."
        subtitle="Selecione uma conexão Oracle na barra lateral para usar o Statement Tracer."
      />
    );
  }

  if (!isOracle) {
    return (
      <TracerEmptyState
        icon={<Radio className="w-8 h-8 mx-auto opacity-30 text-sky-500" />}
        title="Statement Tracer disponível apenas para Oracle."
        subtitle="Selecione uma conexão do tipo Oracle para capturar sessões ativas (v$session) ou SQL recente (v$sql)."
      />
    );
  }

  const elapsedSec = state.startedAt ? Math.max(0, Math.floor((now - new Date(state.startedAt).getTime()) / 1000)) : 0;

  return (
    <div className="p-3 space-y-3">
      {/* Barra de Filtros e Controles */}
      <div className="flex flex-wrap items-center gap-2">
        {!state.isCapturing ? (
          <button
            type="button"
            onClick={handleStart}
            disabled={isBusy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-500 border border-emerald-500/30 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            Iniciar Captura
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStop}
            disabled={isBusy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 border border-rose-500/30 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50"
          >
            <Square className="w-3.5 h-3.5" />
            Parar Captura
          </button>
        )}

        <select
          value={intervalMs}
          onChange={(e) => setIntervalMs(Number(e.target.value))}
          disabled={state.isCapturing}
          title="Intervalo entre consultas ao Oracle (v$session/v$sql são views leves, mas quanto menor o intervalo, mais carga)"
          className="px-2 py-1.5 bg-card border border-border/70 rounded-lg text-xs disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {INTERVAL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              a cada {opt.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={schemaFilter}
          onChange={(e) => setSchemaFilter(e.target.value)}
          disabled={state.isCapturing}
          placeholder="Filtrar por schema/username..."
          className="px-2.5 py-1.5 bg-card border border-border/70 rounded-lg text-xs w-48 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-primary"
        >
        </input>
        <input
          type="text"
          value={textFilter}
          onChange={(e) => setTextFilter(e.target.value)}
          disabled={state.isCapturing}
          placeholder="Filtrar por texto na SQL..."
          className="px-2.5 py-1.5 bg-card border border-border/70 rounded-lg text-xs w-52 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-primary"
        >
        </input>

        <button
          type="button"
          onClick={handleClear}
          disabled={isBusy || (state.statements.length === 0 && state.sessionEvents.length === 0)}
          title="Limpar dados capturados"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-muted-foreground hover:text-rose-500 border border-border/70 hover:border-rose-500/40 rounded-lg text-xs font-medium transition cursor-pointer disabled:opacity-30"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Limpar
        </button>

        <div className="ml-auto flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
          {state.isCapturing ? (
            <span className="flex items-center gap-1.5 text-emerald-500 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Capturando há {elapsedSec}s · {state.pollCount} consulta(s)
            </span>
          ) : state.pollCount > 0 ? (
            <span>Captura parada · {state.pollCount} consulta(s) ao Oracle</span>
          ) : null}
        </div>
      </div>

      {/* Alternância de Abas (Linha do Tempo vs SQL Capturado) */}
      <div className="flex items-center bg-card/60 border border-border/70 rounded-lg overflow-hidden text-xs w-fit">
        <button
          type="button"
          onClick={() => setView('sessions')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 font-semibold transition cursor-pointer ${
            view === 'sessions' ? 'bg-sky-500/20 text-sky-500' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Linha do tempo ({state.sessionEvents.length})
        </button>
        <button
          type="button"
          onClick={() => setView('recent')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 font-semibold transition cursor-pointer border-l border-border/70 ${
            view === 'recent' ? 'bg-sky-500/20 text-sky-500' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          SQL capturado ({state.statements.length})
        </button>
      </div>

      {state.lastError ? (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-800 dark:text-rose-300 text-xs">
          <div className="flex items-center space-x-2 font-bold mb-1">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>Falha na última consulta ao Oracle:</span>
          </div>
          <pre className="font-mono text-[11px] whitespace-pre-wrap bg-card p-3 rounded-lg border border-border text-rose-700 dark:text-rose-300 mt-2">
            {state.lastError}
          </pre>
        </div>
      ) : null}

      {!state.isCapturing && state.pollCount === 0 ? (
        <TracerEmptyState
          icon={<Radio className="w-8 h-8 mx-auto opacity-30 text-sky-500" />}
          title="Nenhuma captura em andamento."
          subtitle='Clique em "Iniciar Captura" e vá disparar a ação no outro app (Delphi/Karaf) — a captura roda em segundo plano e continua mesmo se você trocar de aba ou de página aqui no Dev Manager.'
        />
      ) : view === 'sessions' ? (
        <SessionsTimeline
          events={state.sessionEvents}
          onCopy={copy}
          copiedKey={copiedKey}
          onSelect={handleSelectSessionEvent}
          selectedSqlId={selectedItem?.sqlId}
        />
      ) : (
        <StatementsTable
          statements={state.statements}
          onCopy={copy}
          copiedKey={copiedKey}
          onSelect={handleSelectStatement}
          selectedSqlId={selectedItem?.sqlId}
        />
      )}

      {/* Painel Inspetor de Binds e SQL Interpolado */}
      {selectedItem && (
        <StatementInspector
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onCopy={copy}
          copiedKey={copiedKey}
          onSelectSql={onSelectSql}
          onFetchBinds={handleFetchBinds}
          isFetchingBinds={isFetchingBinds}
        />
      )}
    </div>
  );
};

const TracerEmptyState: React.FC<{ icon: React.ReactNode; title: string; subtitle: string }> = ({ icon, title, subtitle }) => (
  <div className="text-center py-12 text-muted-foreground text-xs space-y-2">
    {icon}
    <p className="font-semibold text-foreground">{title}</p>
    <span className="text-[11px] opacity-70">{subtitle}</span>
  </div>
);

const CopySqlButton: React.FC<{ sql: string; keyId: string; onCopy: (text: string, key?: string) => void; copiedKey: string | null }> = ({
  sql,
  keyId,
  onCopy,
  copiedKey
}) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onCopy(sql, keyId);
    }}
    title="Copiar texto"
    className="text-muted-foreground hover:text-primary transition cursor-pointer shrink-0"
  >
    {copiedKey === keyId ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
  </button>
);

const SessionsTimeline: React.FC<{
  events: OracleCaptureState['sessionEvents'];
  onCopy: (text: string, key?: string) => void;
  copiedKey: string | null;
  onSelect: (ev: OracleSessionCaptureEntry) => void;
  selectedSqlId?: string;
}> = ({ events, onCopy, copiedKey, onSelect, selectedSqlId }) => {
  if (events.length === 0) {
    return (
      <TracerEmptyState
        icon={<Users className="w-8 h-8 mx-auto opacity-30 text-sky-500" />}
        title="Nenhuma troca de SQL observada ainda."
        subtitle="Cada linha aqui aparece quando uma sessão passa a rodar uma instrução diferente da anterior."
      />
    );
  }

  return (
    <div className="border border-border/70 rounded-xl overflow-auto max-h-[360px]">
      <table className="w-full text-[11px] font-mono">
        <thead className="bg-card/90 text-muted-foreground sticky top-0 z-10 border-b border-border/70">
          <tr className="text-left">
            <th className="px-2.5 py-1.5 font-semibold">Capturado em</th>
            <th className="px-2.5 py-1.5 font-semibold">SID/SERIAL</th>
            <th className="px-2.5 py-1.5 font-semibold">Schema</th>
            <th className="px-2.5 py-1.5 font-semibold">Programa / Máquina</th>
            <th className="px-2.5 py-1.5 font-semibold">Módulo / Ação</th>
            <th className="px-2.5 py-1.5 font-semibold">Binds</th>
            <th className="px-2.5 py-1.5 font-semibold">SQL</th>
            <th className="px-2 py-1.5 text-right">Ação</th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev, idx) => {
            const rowKey = `${ev.sid}-${ev.serialNum}-${ev.capturedAt}-${idx}`;
            const isSelected = selectedSqlId && ev.sqlId === selectedSqlId;
            const bindsCount = ev.binds?.length ?? 0;

            return (
              <tr
                key={rowKey}
                onClick={() => onSelect(ev)}
                className={`border-t border-border/50 transition-colors cursor-pointer align-top ${
                  isSelected ? 'bg-sky-500/15 border-l-2 border-l-sky-500' : 'hover:bg-card/60'
                }`}
              >
                <td className="px-2.5 py-2 whitespace-nowrap text-muted-foreground">
                  {new Date(ev.capturedAt).toLocaleTimeString('pt-BR')}
                </td>
                <td className="px-2.5 py-2 whitespace-nowrap">
                  {ev.sid}/{ev.serialNum}
                </td>
                <td className="px-2.5 py-2 whitespace-nowrap font-medium text-foreground">{ev.username || '-'}</td>
                <td className="px-2.5 py-2">
                  <div className="font-medium text-foreground truncate max-w-[160px]">{ev.program || '-'}</div>
                  <div className="text-muted-foreground text-[10px] truncate max-w-[160px]">{ev.machine || '-'}</div>
                </td>
                <td className="px-2.5 py-2">
                  <div className="truncate max-w-[140px]">{ev.module || '-'}</div>
                  <div className="text-muted-foreground text-[10px] truncate max-w-[140px]">{ev.action || '-'}</div>
                </td>
                <td className="px-2.5 py-2 whitespace-nowrap">
                  {bindsCount > 0 ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                      {bindsCount} {bindsCount === 1 ? 'bind' : 'binds'}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-[10px]">-</span>
                  )}
                </td>
                <td className="px-2.5 py-2 min-w-[280px] max-w-[420px]">
                  {ev.sqlText ? (
                    <div className="flex items-start gap-1.5">
                      <span className="truncate" title={ev.interpolatedSql || ev.sqlText}>
                        {ev.sqlText}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="px-2 py-2 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    {ev.sqlText && (
                      <CopySqlButton sql={ev.interpolatedSql || ev.sqlText} keyId={`ev-${rowKey}`} onCopy={onCopy} copiedKey={copiedKey} />
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(ev);
                      }}
                      className="p-1 text-muted-foreground hover:text-sky-400 transition cursor-pointer rounded hover:bg-muted/40"
                      title="Inspecionar parâmetros e SQL interpolado"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const StatementsTable: React.FC<{
  statements: OracleCaptureState['statements'];
  onCopy: (text: string, key?: string) => void;
  copiedKey: string | null;
  onSelect: (st: OracleRecentStatement) => void;
  selectedSqlId?: string;
}> = ({ statements, onCopy, copiedKey, onSelect, selectedSqlId }) => {
  if (statements.length === 0) {
    return (
      <TracerEmptyState
        icon={<History className="w-8 h-8 mx-auto opacity-30 text-sky-500" />}
        title="Nenhuma instrução capturada ainda."
        subtitle="Instruções distintas vistas no cursor cache do Oracle (v$sql) aparecem aqui, deduplicadas por SQL_ID."
      />
    );
  }

  return (
    <div className="border border-border/70 rounded-xl overflow-auto max-h-[360px]">
      <table className="w-full text-[11px] font-mono">
        <thead className="bg-card/90 text-muted-foreground sticky top-0 z-10 border-b border-border/70">
          <tr className="text-left">
            <th className="px-2.5 py-1.5 font-semibold">SQL_ID</th>
            <th className="px-2.5 py-1.5 font-semibold">Schema</th>
            <th className="px-2.5 py-1.5 font-semibold">Módulo / Ação</th>
            <th className="px-2.5 py-1.5 font-semibold">Execuções</th>
            <th className="px-2.5 py-1.5 font-semibold">Última atividade</th>
            <th className="px-2.5 py-1.5 font-semibold">Binds</th>
            <th className="px-2.5 py-1.5 font-semibold">SQL</th>
            <th className="px-2 py-1.5 text-right">Ação</th>
          </tr>
        </thead>
        <tbody>
          {statements.map((st) => {
            const isSelected = selectedSqlId && st.sqlId === selectedSqlId;
            const bindsCount = st.binds?.length ?? 0;

            return (
              <tr
                key={st.sqlId}
                onClick={() => onSelect(st)}
                className={`border-t border-border/50 transition-colors cursor-pointer align-top ${
                  isSelected ? 'bg-sky-500/15 border-l-2 border-l-sky-500' : 'hover:bg-card/60'
                }`}
              >
                <td className="px-2.5 py-2 whitespace-nowrap font-bold text-sky-400">{st.sqlId}</td>
                <td className="px-2.5 py-2 whitespace-nowrap font-medium text-foreground">{st.parsingSchemaName || '-'}</td>
                <td className="px-2.5 py-2">
                  <div className="truncate max-w-[140px]">{st.module || '-'}</div>
                  <div className="text-muted-foreground text-[10px] truncate max-w-[140px]">{st.action || '-'}</div>
                </td>
                <td className="px-2.5 py-2 whitespace-nowrap">{st.executions ?? '-'}</td>
                <td className="px-2.5 py-2 whitespace-nowrap text-muted-foreground text-[10px]">
                  {st.lastActiveTime || '-'}
                </td>
                <td className="px-2.5 py-2 whitespace-nowrap">
                  {bindsCount > 0 ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                      {bindsCount} {bindsCount === 1 ? 'bind' : 'binds'}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-[10px]">-</span>
                  )}
                </td>
                <td className="px-2.5 py-2 min-w-[280px] max-w-[420px]">
                  <div className="flex items-start gap-1.5">
                    <span className="truncate" title={st.interpolatedSql || st.sqlText}>
                      {st.sqlText}
                    </span>
                  </div>
                </td>
                <td className="px-2 py-2 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    <CopySqlButton sql={st.interpolatedSql || st.sqlText} keyId={`stmt-${st.sqlId}`} onCopy={onCopy} copiedKey={copiedKey} />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(st);
                      }}
                      className="p-1 text-muted-foreground hover:text-sky-400 transition cursor-pointer rounded hover:bg-muted/40"
                      title="Inspecionar parâmetros e SQL interpolado"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const StatementInspector: React.FC<{
  item: SelectedStatementInfo;
  onClose: () => void;
  onCopy: (text: string, key?: string) => void;
  copiedKey: string | null;
  onSelectSql?: (sql: string) => void;
  onFetchBinds: (sqlId: string, sqlText?: string) => void;
  isFetchingBinds: boolean;
}> = ({ item, onClose, onCopy, copiedKey, onSelectSql, onFetchBinds, isFetchingBinds }) => {
  const binds = item.binds || [];
  const interpolatedSql =
    item.interpolatedSql || (binds.length > 0 ? interpolateOracleSqlWithBinds(item.sqlText, binds) : undefined);

  return (
    <div className="cockpit-panel rounded-2xl p-4 border border-sky-500/30 bg-card/90 shadow-xl space-y-3 transition-all animate-fadeIn">
      {/* Cabeçalho do Inspetor */}
      <div className="flex items-center justify-between pb-2 border-b border-border/70">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <span>Inspeção de Binds & SQL Executável</span>
          </h4>
          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30 font-bold">
            SQL_ID: {item.sqlId || '-'}
          </span>
          {item.username && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-muted/80 text-foreground border border-border/60 font-semibold">
              Schema: {item.username}
            </span>
          )}
          {item.program && (
            <span
              className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold truncate max-w-[220px]"
              title={item.program}
            >
              {item.program}
            </span>
          )}
          {item.timestamp && (
            <span className="text-[10px] text-muted-foreground font-mono">
              {new Date(item.timestamp).toLocaleTimeString('pt-BR')}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition cursor-pointer"
          title="Fechar painel de inspeção"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Seção 1: Parâmetros Capturados (V$SQL_BIND_CAPTURE) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              <span>Parâmetros de Execução (V$SQL_BIND_CAPTURE)</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
              {binds.length} {binds.length === 1 ? 'parâmetro' : 'parâmetros'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onFetchBinds(item.sqlId, item.sqlText)}
            disabled={isFetchingBinds}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 border border-sky-500/30 rounded-lg transition cursor-pointer disabled:opacity-50"
            title="Consultar novamente a view v$sql_bind_capture no banco"
          >
            <RefreshCw className={`w-3 h-3 ${isFetchingBinds ? 'animate-spin' : ''}`} />
            <span>{isFetchingBinds ? 'Buscando Binds...' : 'Atualizar Binds'}</span>
          </button>
        </div>

        {binds.length > 0 ? (
          <div className="border border-border/70 rounded-xl overflow-hidden bg-card/60">
            <table className="w-full text-[11px] font-mono">
              <thead className="bg-card/90 text-muted-foreground border-b border-border/70">
                <tr className="text-left">
                  <th className="px-3 py-1.5 font-semibold w-12 text-center">Pos</th>
                  <th className="px-3 py-1.5 font-semibold w-32">Nome / Bind</th>
                  <th className="px-3 py-1.5 font-semibold w-36">Tipo de Dado</th>
                  <th className="px-3 py-1.5 font-semibold">Valor Real Passado</th>
                  <th className="px-3 py-1.5 font-semibold w-36">Última Captura</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {binds.map((b, idx) => {
                  const bindKey = `bind-${item.sqlId}-${b.position}-${idx}`;
                  return (
                    <tr key={bindKey} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-1.5 text-center font-bold text-muted-foreground">
                        #{b.position}
                      </td>
                      <td className="px-3 py-1.5 text-sky-400 font-bold">
                        {b.name || `:${b.position}`}
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground text-[10px]">
                        {b.datatype || '-'}
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 max-w-[400px] truncate"
                            title={b.value ?? 'NULL'}
                          >
                            {b.value ?? 'NULL'}
                          </span>
                          {b.value && (
                            <CopySqlButton sql={b.value} keyId={`val-${bindKey}`} onCopy={onCopy} copiedKey={copiedKey} />
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground text-[10px] whitespace-nowrap">
                        {b.lastCaptured ? new Date(b.lastCaptured).toLocaleTimeString('pt-BR') : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-3 bg-muted/20 border border-border/60 rounded-xl text-xs text-muted-foreground flex items-center justify-between">
            <span>
              Nenhuma variável de bind capturada pelo Oracle para esta query no momento (o cursor cache pode não ter registrado os binds ou a query foi executada sem parâmetros).
            </span>
          </div>
        )}
      </div>

      {/* Seção 2: SQL com Parâmetros Aplicados (Pronto para Execução) */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>{interpolatedSql ? 'SQL Montado com Parâmetros Aplicados' : 'Instrução SQL'}</span>
            {interpolatedSql && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Pronto para Executar
              </span>
            )}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onCopy(interpolatedSql || item.sqlText, `interpolated-${item.sqlId}`)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 rounded-lg transition cursor-pointer"
              title="Copiar SQL com parâmetros para colar no SQL Developer ou DB Studio"
            >
              {copiedKey === `interpolated-${item.sqlId}` ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar SQL</span>
                </>
              )}
            </button>

            {onSelectSql && (
              <button
                type="button"
                onClick={() => onSelectSql(interpolatedSql || item.sqlText)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-lg transition cursor-pointer"
                title="Carregar esta consulta diretamente no Editor SQL do DB Studio"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Abrir no Editor SQL</span>
              </button>
            )}
          </div>
        </div>

        <div className="bg-[#0B0F17] border border-border/80 rounded-xl p-3 max-h-48 overflow-y-auto font-mono text-[11px] text-emerald-300 leading-relaxed whitespace-pre-wrap select-text shadow-inner">
          {interpolatedSql || item.sqlText}
        </div>
      </div>

      {/* SQL Original com Placeholders se foi interpolado */}
      {interpolatedSql && interpolatedSql !== item.sqlText && (
        <details className="text-[11px] text-muted-foreground group">
          <summary className="cursor-pointer hover:text-foreground font-semibold py-1">
            Ver SQL Original com Placeholders (:1, :param, ?)
          </summary>
          <div className="mt-1 bg-card/60 border border-border/70 rounded-lg p-2 font-mono text-[10px] text-muted-foreground whitespace-pre-wrap max-h-28 overflow-y-auto">
            {item.sqlText}
          </div>
        </details>
      )}
    </div>
  );
};
