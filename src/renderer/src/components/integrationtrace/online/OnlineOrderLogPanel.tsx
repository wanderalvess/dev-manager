import React from 'react';
import { AlertTriangle, Loader2, Search } from 'lucide-react';
import { describeOrderJson, prettyOrderJson, type OnlineOrderLogEntry, type OnlineOrderStatusFilter, type OnlineOrderTone } from '../../../../../shared/onlineOrderLog';
import { useOnlineOrderLog } from '../../../hooks/integration/useOnlineOrderLog';
import { formatTraceTime } from '../../../utils/integrationTraceView';
import { OnlineRejectionSummary } from './OnlineRejectionSummary';

const FIELD_CLASS = 'h-9 bg-card border border-border rounded-[10px] px-3 text-sm text-foreground focus:outline-hidden focus:border-primary';
const LABEL_CLASS = 'flex items-center gap-2 text-xs font-bold text-foreground';

const STATUS_OPTIONS: { value: OnlineOrderStatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'R', label: 'Rejeitados' },
  { value: 'P', label: 'Processando' },
  { value: 'A', label: 'Aceitos' }
];

const PERIOD_OPTIONS: { hours: number; label: string }[] = [
  { hours: 6, label: 'Últimas 6 horas' },
  { hours: 24, label: 'Últimas 24 horas' },
  { hours: 72, label: 'Últimos 3 dias' },
  { hours: 168, label: 'Últimos 7 dias' },
  { hours: 720, label: 'Últimos 30 dias' }
];

// Literais completos para o scanner do Tailwind
const TONE_BADGE: Record<OnlineOrderTone, string> = {
  ok: 'bg-success/10 text-success',
  error: 'bg-danger/10 text-danger',
  pending: 'bg-warning/10 text-warning',
  other: 'bg-muted text-muted-foreground'
};

const EntryRow: React.FC<{ entry: OnlineOrderLogEntry }> = ({ entry }) => (
  <li>
    <details className="group">
      <summary className="px-3 py-2 cursor-pointer list-none grid grid-cols-[minmax(0,9rem)_minmax(0,7rem)_minmax(0,1fr)_auto] items-center gap-3 text-xs hover:bg-muted/60">
        <span className="font-mono text-muted-foreground">{entry.date ? formatTraceTime(entry.date) : '—'}</span>
        <span className="font-mono text-foreground truncate" title="NUMPED">{entry.orderNumber}</span>
        <span className="text-foreground min-w-0">
          {entry.operationLabel}
          {entry.position && <span className="text-muted-foreground"> · posição {entry.position}</span>}
          {entry.reason && (
            <span className="block text-danger break-words">
              {entry.reason.code && <span className="font-mono">{entry.reason.code}: </span>}
              {entry.reason.message}
              {entry.reason.detail && <span className="block text-muted-foreground">{entry.reason.detail}</span>}
            </span>
          )}
          {entry.unanswered && <span className="block text-warning">O WinThor não gravou aceito nem rejeitado depois deste envio.</span>}
        </span>
        <span
          className={`px-2 py-0.5 rounded-full text-2xs font-medium whitespace-nowrap ${TONE_BADGE[entry.tone]}`}
          title={entry.unanswered ? 'Status P (processando) sem desfecho' : undefined}
        >
          {entry.statusLabel}
        </span>
      </summary>
      <div className="px-3 pb-3">
        {entry.json ? (
          <>
            <p className="text-2xs font-medium text-muted-foreground mb-1">{describeOrderJson(entry.status)}</p>
            <pre className="max-h-80 overflow-auto bg-muted/50 rounded-lg p-2 text-2xs font-mono text-foreground whitespace-pre-wrap break-all">
              {prettyOrderJson(entry.json, entry.jsonTruncated)}
            </pre>
            {entry.jsonTruncated && <p className="text-2xs text-muted-foreground mt-1">Mostrando o início do JSON: o registro é maior.</p>}
          </>
        ) : (
          <p className="text-2xs text-muted-foreground italic">Sem JSON gravado nesta linha.</p>
        )}
      </div>
    </details>
  </li>
);

/** Busca na PCLOGPEDIDOAPI: o que o WTA registrou ao receber a inclusão, alteração ou cancelamento de um pedido do PDV. */
export const OnlineOrderLogPanel: React.FC = () => {
  const { entries, limit, loading, error, search, filters } = useOnlineOrderLog();
  const byOrder = filters.orderNumber.trim() !== '';
  return (
    <section className="border border-border rounded-xl bg-card overflow-hidden" aria-label="Pedidos online">
      <form
        className="px-3 py-2 space-y-1.5 border-b border-border"
        onSubmit={(event) => {
          event.preventDefault();
          if (!loading) void search();
        }}
      >
        <h3 className="text-xs font-semibold text-foreground">Pedidos online: o que o WinThor registrou (PCLOGPEDIDOAPI)</h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <label className={LABEL_CLASS}>
            Pedido
            <input
              id="online-order-number"
              type="text"
              inputMode="numeric"
              value={filters.orderNumber}
              onChange={(e) => filters.setOrderNumber(e.target.value)}
              className={`${FIELD_CLASS} w-40 font-mono font-normal`}
              placeholder="NUMPED"
              autoComplete="off"
            />
          </label>
          <label className={LABEL_CLASS}>
            Status
            <select
              id="online-order-status"
              value={filters.status}
              onChange={(e) => filters.setStatus(e.target.value as OnlineOrderStatusFilter)}
              className={`${FIELD_CLASS} font-normal`}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <select
            id="online-order-period"
            aria-label="Período"
            value={filters.lookbackHours}
            onChange={(e) => filters.setLookbackHours(Number(e.target.value))}
            disabled={byOrder}
            title={byOrder ? 'Com o número do pedido, a busca traz todo o histórico dele' : undefined}
            className={`${FIELD_CLASS} disabled:opacity-50`}
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.hours} value={option.hours}>{option.label}</option>
            ))}
          </select>
          <button
            type="submit"
            className="h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm rounded-[10px] transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>{loading ? 'Buscando...' : 'Buscar'}</span>
          </button>
          {entries && (
            <span className="ml-auto text-xs text-muted-foreground" aria-live="polite">
              {entries.length} registro(s)
              {limit && entries.length >= limit ? ` · os ${limit} mais recentes, refine a busca` : ''}
            </span>
          )}
        </div>
        {error && (
          <p role="alert" className="text-xs text-danger flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {error}
          </p>
        )}
      </form>

      {entries === null ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">
          Informe o pedido para ver todo o histórico dele, ou busque pelo período. Cada envio do PDV grava um P (processando) e depois
          um A (aceito) ou um R (rejeitado, com o motivo). Clique numa linha para ver o JSON.
        </p>
      ) : entries.length === 0 ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">
          {byOrder ? 'Nenhum registro deste pedido na PCLOGPEDIDOAPI.' : 'Nenhum registro no período.'}
        </p>
      ) : (
        <>
          <OnlineRejectionSummary entries={entries} />
          <ul aria-label="Registros do log de pedidos" className="max-h-[60vh] overflow-y-auto divide-y divide-border">
            {entries.map((entry, index) => (
              <EntryRow key={`${entry.orderNumber}-${entry.date ?? ''}-${index}`} entry={entry} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
};
