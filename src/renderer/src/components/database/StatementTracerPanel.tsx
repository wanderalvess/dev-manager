import React, { useCallback, useEffect, useState } from 'react';
import { Radio, Play, Square, Trash2, AlertCircle, Copy, Check, Users, History } from 'lucide-react';
import { DatabaseConnectionConfig, OracleCaptureState } from '../../../../shared/types';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';

export interface StatementTracerPanelProps {
  activeConnection: DatabaseConnectionConfig | undefined;
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

export const StatementTracerPanel: React.FC<StatementTracerPanelProps> = ({ activeConnection }) => {
  const { copy, copiedKey } = useCopyToClipboard();
  const [view, setView] = useState<TracerView>('sessions');
  const [schemaFilter, setSchemaFilter] = useState('');
  const [textFilter, setTextFilter] = useState('');
  const [intervalMs, setIntervalMs] = useState(5000);
  const [state, setState] = useState<OracleCaptureState>(EMPTY_STATE);
  const [isBusy, setIsBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  const isOracle = activeConnection?.type === 'oracle';
  const connectionId = activeConnection?.id;

  const refreshState = useCallback(async () => {
    if (!connectionId || !window.electronAPI?.getOracleCaptureState) return;
    try {
      const res = await window.electronAPI.getOracleCaptureState(connectionId);
      setState(res);
    } catch {
      // Falha pontual de leitura de estado não deve derrubar a UI; a próxima leva tenta de novo.
    }
  }, [connectionId]);

  // Hidrata o estado assim que a conexão muda (inclui reabrir a aba depois de navegar
  // pra outra tela do app — a captura em si roda no processo principal e não para).
  useEffect(() => {
    setState(EMPTY_STATE);
    if (connectionId) refreshState();
  }, [connectionId, refreshState]);

  useEffect(() => {
    if (!connectionId) return;
    const timer = setInterval(refreshState, UI_REFRESH_MS);
    return () => clearInterval(timer);
  }, [connectionId, refreshState]);

  // Só pra recalcular "capturando há Xs" no texto de status sem depender do refresh do backend.
  useEffect(() => {
    if (!state.isCapturing) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [state.isCapturing]);

  const handleStart = async () => {
    if (!activeConnection || !window.electronAPI?.startOracleCapture) return;
    setIsBusy(true);
    try {
      const res = await window.electronAPI.startOracleCapture(activeConnection, {
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
    if (!connectionId || !window.electronAPI?.stopOracleCapture) return;
    setIsBusy(true);
    try {
      const res = await window.electronAPI.stopOracleCapture(connectionId);
      setState(res);
    } catch (err: any) {
      setState((prev) => ({ ...prev, isCapturing: false, lastError: err?.message || 'Falha ao parar a captura.' }));
    } finally {
      setIsBusy(false);
    }
  };

  const handleClear = async () => {
    if (!connectionId || !window.electronAPI?.clearOracleCapture) return;
    setIsBusy(true);
    try {
      const res = await window.electronAPI.clearOracleCapture(connectionId);
      setState(res);
    } catch (err: any) {
      setState((prev) => ({ ...prev, lastError: err?.message || 'Falha ao limpar a captura.' }));
    } finally {
      setIsBusy(false);
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
        />
        <input
          type="text"
          value={textFilter}
          onChange={(e) => setTextFilter(e.target.value)}
          disabled={state.isCapturing}
          placeholder="Filtrar por texto na SQL..."
          className="px-2.5 py-1.5 bg-card border border-border/70 rounded-lg text-xs w-52 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-primary"
        />

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
          subtitle='Clique em "Iniciar Captura" e vá disparar a ação no outro app — a captura roda em segundo plano e continua mesmo se você trocar de aba ou de página aqui no Dev Manager.'
        />
      ) : view === 'sessions' ? (
        <SessionsTimeline events={state.sessionEvents} onCopy={copy} copiedKey={copiedKey} />
      ) : (
        <StatementsTable statements={state.statements} onCopy={copy} copiedKey={copiedKey} />
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
    onClick={() => onCopy(sql, keyId)}
    title="Copiar SQL completa"
    className="text-muted-foreground hover:text-primary transition cursor-pointer shrink-0"
  >
    {copiedKey === keyId ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
  </button>
);

const SessionsTimeline: React.FC<{
  events: OracleCaptureState['sessionEvents'];
  onCopy: (text: string, key?: string) => void;
  copiedKey: string | null;
}> = ({ events, onCopy, copiedKey }) => {
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
    <div className="border border-border/70 rounded-xl overflow-auto">
      <table className="w-full text-[11px] font-mono">
        <thead className="bg-card/80 text-muted-foreground sticky top-0">
          <tr className="text-left">
            <th className="px-2 py-1.5 font-semibold">Capturado em</th>
            <th className="px-2 py-1.5 font-semibold">SID/SERIAL</th>
            <th className="px-2 py-1.5 font-semibold">Schema</th>
            <th className="px-2 py-1.5 font-semibold">Programa / Máquina</th>
            <th className="px-2 py-1.5 font-semibold">Módulo / Ação</th>
            <th className="px-2 py-1.5 font-semibold">SQL</th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev, idx) => {
            const rowKey = `${ev.sid}-${ev.serialNum}-${ev.capturedAt}-${idx}`;
            return (
              <tr key={rowKey} className="border-t border-border/50 hover:bg-card/40 align-top">
                <td className="px-2 py-1.5 whitespace-nowrap text-muted-foreground">
                  {new Date(ev.capturedAt).toLocaleTimeString('pt-BR')}
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap">
                  {ev.sid}/{ev.serialNum}
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap">{ev.username || '-'}</td>
                <td className="px-2 py-1.5">
                  <div>{ev.program || '-'}</div>
                  <div className="text-muted-foreground">{ev.machine || '-'}</div>
                </td>
                <td className="px-2 py-1.5">
                  <div>{ev.module || '-'}</div>
                  <div className="text-muted-foreground">{ev.action || '-'}</div>
                </td>
                <td className="px-2 py-1.5 min-w-[280px] max-w-[480px]">
                  {ev.sqlText ? (
                    <div className="flex items-start gap-1.5">
                      <span className="truncate" title={ev.sqlText}>
                        {ev.sqlText}
                      </span>
                      <CopySqlButton sql={ev.sqlText} keyId={`ev-${rowKey}`} onCopy={onCopy} copiedKey={copiedKey} />
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
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
}> = ({ statements, onCopy, copiedKey }) => {
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
    <div className="border border-border/70 rounded-xl overflow-auto">
      <table className="w-full text-[11px] font-mono">
        <thead className="bg-card/80 text-muted-foreground sticky top-0">
          <tr className="text-left">
            <th className="px-2 py-1.5 font-semibold">SQL_ID</th>
            <th className="px-2 py-1.5 font-semibold">Schema</th>
            <th className="px-2 py-1.5 font-semibold">Módulo / Ação</th>
            <th className="px-2 py-1.5 font-semibold">Execuções</th>
            <th className="px-2 py-1.5 font-semibold">Última atividade</th>
            <th className="px-2 py-1.5 font-semibold">SQL</th>
          </tr>
        </thead>
        <tbody>
          {statements.map((st) => (
            <tr key={st.sqlId} className="border-t border-border/50 hover:bg-card/40 align-top">
              <td className="px-2 py-1.5 whitespace-nowrap">{st.sqlId}</td>
              <td className="px-2 py-1.5 whitespace-nowrap">{st.parsingSchemaName || '-'}</td>
              <td className="px-2 py-1.5">
                <div>{st.module || '-'}</div>
                <div className="text-muted-foreground">{st.action || '-'}</div>
              </td>
              <td className="px-2 py-1.5 whitespace-nowrap">{st.executions ?? '-'}</td>
              <td className="px-2 py-1.5 whitespace-nowrap">{st.lastActiveTime || '-'}</td>
              <td className="px-2 py-1.5 min-w-[280px] max-w-[480px]">
                <div className="flex items-start gap-1.5">
                  <span className="truncate" title={st.sqlText}>
                    {st.sqlText}
                  </span>
                  <CopySqlButton sql={st.sqlText} keyId={`stmt-${st.sqlId}`} onCopy={onCopy} copiedKey={copiedKey} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
