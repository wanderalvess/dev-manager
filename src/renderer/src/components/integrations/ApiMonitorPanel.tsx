import React, { useMemo, useState } from 'react';
import { Activity, Check, Copy, Pause, Play, RefreshCw, Trash2 } from 'lucide-react';
import type { HttpProbeMethod, HttpProbeResult } from '../../../../shared/types';
import { useApiMonitor } from '../../hooks/integrations/useApiMonitor';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import {
  API_MONITOR_INTERVALS,
  formatBytes,
  formatProbeBody,
  probeTone,
  summarizeProbeHistory,
  type ProbeTone
} from '../../utils/apiMonitorUtils';

const TONE_PILL: Record<ProbeTone, string> = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger'
};

const TONE_BAR: Record<ProbeTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger'
};

const FIELD =
  'h-10 bg-card border border-input rounded-[10px] px-3 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring';
const SECONDARY_BUTTON =
  'h-10 px-3 rounded-[10px] text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed';

const formatTime = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR');

/** Testa um endpoint qualquer e mostra o retorno; opcionalmente repete em intervalo para acompanhar. */
export const ApiMonitorPanel: React.FC = () => {
  const monitor = useApiMonitor();
  const { prefs, latest, history, checking, watching } = monitor;
  const [showHeaders, setShowHeaders] = useState(false);
  const canWatch = prefs.intervalSeconds > 0;

  return (
    <section
      aria-label="Monitorar uma API"
      data-testid="api-monitor"
      className="bg-card border border-border rounded-[14px] shadow-xs p-4 md:p-5 space-y-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-[11px] bg-accent text-accent-foreground flex items-center justify-center shrink-0">
          <Activity className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground leading-tight">Monitorar uma API</h2>
          <p className="text-sm text-muted-foreground">
            Chame um endpoint e veja status, tempo e o corpo da resposta. Só GET e HEAD, sem seguir redirect.
          </p>
        </div>
      </div>

      <form
        className="flex flex-col lg:flex-row gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void monitor.check();
        }}
      >
        <select
          aria-label="Método"
          value={prefs.method}
          onChange={(e) => monitor.setMethod(e.target.value as HttpProbeMethod)}
          className={`${FIELD} lg:w-24 font-mono`}
        >
          <option value="GET">GET</option>
          <option value="HEAD">HEAD</option>
        </select>
        <input
          aria-label="URL da API"
          value={prefs.url}
          onChange={(e) => monitor.setUrl(e.target.value)}
          placeholder="http://localhost:8181/api/health"
          spellCheck={false}
          className={`${FIELD} flex-1 min-w-0 font-mono`}
        />
        <button
          type="submit"
          disabled={checking}
          className="h-10 px-4 rounded-[10px] bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-wait"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Testando…' : 'Testar agora'}
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Repetir"
          value={prefs.intervalSeconds}
          onChange={(e) => monitor.setIntervalSeconds(Number(e.target.value))}
          className={FIELD}
        >
          {API_MONITOR_INTERVALS.map((i) => (
            <option key={i.seconds} value={i.seconds}>
              {i.label}
            </option>
          ))}
        </select>
        {watching ? (
          <button type="button" onClick={monitor.stopWatching} className={SECONDARY_BUTTON}>
            <Pause className="w-4 h-4" /> Parar
          </button>
        ) : (
          <button
            type="button"
            onClick={monitor.startWatching}
            disabled={!canWatch}
            title={canWatch ? undefined : 'Escolha um intervalo para repetir a checagem'}
            className={SECONDARY_BUTTON}
          >
            <Play className="w-4 h-4" /> Monitorar
          </button>
        )}
        <button type="button" onClick={() => setShowHeaders((v) => !v)} className={SECONDARY_BUTTON} aria-expanded={showHeaders}>
          Cabeçalhos{monitor.headersText.trim() ? ' ●' : ''}
        </button>
        {watching && (
          <span className="inline-flex items-center gap-1.5 text-[13px] text-success">
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            Monitorando · {API_MONITOR_INTERVALS.find((i) => i.seconds === prefs.intervalSeconds)?.label.toLowerCase()}
          </span>
        )}
      </div>

      {showHeaders && (
        <div className="space-y-1">
          <textarea
            aria-label="Cabeçalhos da requisição"
            value={monitor.headersText}
            onChange={(e) => monitor.setHeadersText(e.target.value)}
            placeholder={'Authorization: Bearer seu-token\nX-Tenant: 1'}
            rows={3}
            spellCheck={false}
            className="w-full bg-card border border-input rounded-[10px] px-3 py-2 text-sm font-mono text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
          />
          <p className="text-[13px] text-muted-foreground">Um por linha, no formato Nome: valor. Não ficam salvos ao fechar a tela.</p>
        </div>
      )}

      {monitor.inputError && <p className="text-sm text-danger">{monitor.inputError}</p>}

      {latest ? (
        <ProbeResultView latest={latest} history={history} onClear={monitor.clearHistory} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhuma checagem ainda. Informe a URL e clique em <span className="font-medium text-foreground">Testar agora</span>.
        </p>
      )}
    </section>
  );
};

const ProbeResultView: React.FC<{ latest: HttpProbeResult; history: HttpProbeResult[]; onClear: () => void }> = ({
  latest,
  history,
  onClear
}) => {
  const [tab, setTab] = useState<'body' | 'headers'>('body');
  const { copiedKey, copy } = useCopyToClipboard();
  const tone = probeTone(latest);
  const summary = useMemo(() => summarizeProbeHistory(history), [history]);
  const body = useMemo(() => formatProbeBody(latest), [latest]);
  const headerEntries = Object.entries(latest.headers);
  const chronological = useMemo(() => [...history].reverse(), [history]);

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[13px] font-medium ${TONE_PILL[tone]}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {latest.status > 0 ? `${latest.status} ${latest.statusText}`.trim() : 'Sem resposta'}
        </span>
        <span className="text-sm text-foreground tabular-nums">{latest.durationMs} ms</span>
        {latest.status > 0 && <span className="text-sm text-muted-foreground tabular-nums">{formatBytes(latest.sizeBytes)}</span>}
        {latest.contentType && <span className="text-sm text-muted-foreground font-mono truncate max-w-[260px]">{latest.contentType}</span>}
        <span className="text-[13px] text-muted-foreground ml-auto">às {formatTime(latest.checkedAt)}</span>
      </div>

      {latest.error && <div className="px-3 py-2 rounded-[10px] bg-danger/10 text-danger text-sm">{latest.error}</div>}
      {latest.redirectLocation && (
        <div className="px-3 py-2 rounded-[10px] bg-warning/10 text-warning text-sm break-all">
          Redireciona para <span className="font-mono">{latest.redirectLocation}</span> (não seguido). Teste a URL de destino direto.
        </div>
      )}

      {summary.total > 1 && (
        <div className="space-y-1.5">
          <div
            className="flex items-end gap-[3px] h-8"
            role="img"
            aria-label={`Últimas ${summary.total} checagens: ${summary.okCount} com sucesso`}
          >
            {chronological.map((r, idx) => (
              <span
                key={`${r.checkedAt}-${idx}`}
                title={`${formatTime(r.checkedAt)} · ${r.status || 'erro'} · ${r.durationMs} ms`}
                className={`w-2 rounded-sm ${TONE_BAR[probeTone(r)]}`}
                style={{ height: `${Math.max(18, Math.round((r.durationMs / Math.max(summary.maxMs, 1)) * 100))}%` }}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground tabular-nums">
            <span>
              Disponível <span className="text-foreground font-medium">{summary.uptimePct}%</span>
            </span>
            <span>média {summary.avgMs} ms</span>
            <span>pior {summary.maxMs} ms</span>
            <span>{summary.total} checagens</span>
            <button type="button" onClick={onClear} className="ml-auto inline-flex items-center gap-1 hover:text-foreground cursor-pointer">
              <Trash2 className="w-3.5 h-3.5" /> Limpar histórico
            </button>
          </div>
        </div>
      )}

      {latest.status > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-4 border-b border-border" role="tablist" aria-label="Detalhes da resposta">
            {(
              [
                ['body', 'Corpo'],
                ['headers', `Cabeçalhos (${headerEntries.length})`]
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`-mb-px pb-2 text-sm border-b-2 transition-colors cursor-pointer ${
                  tab === id ? 'border-primary text-foreground font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
            {tab === 'body' && body.text && (
              <button
                type="button"
                onClick={() => copy(body.text, 'body')}
                className="ml-auto pb-2 inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {copiedKey === 'body' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKey === 'body' ? 'Copiado' : 'Copiar'}
              </button>
            )}
          </div>

          {tab === 'body' ? (
            body.text ? (
              <>
                <pre className="max-h-80 overflow-auto rounded-[10px] bg-muted/50 border border-border p-3 text-[13px] leading-relaxed font-mono text-foreground whitespace-pre-wrap break-all">
                  {body.text}
                </pre>
                {latest.truncated && (
                  <p className="text-[13px] text-muted-foreground">
                    Mostrando os primeiros {formatBytes(latest.sizeBytes)}; o restante do corpo foi cortado.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{latest.method === 'HEAD' ? 'HEAD não traz corpo.' : 'Resposta sem corpo.'}</p>
            )
          ) : (
            <dl className="max-h-80 overflow-auto rounded-[10px] border border-border divide-y divide-border text-[13px] font-mono">
              {headerEntries.map(([name, value]) => (
                <div key={name} className="grid grid-cols-[minmax(120px,220px)_1fr] gap-3 px-3 py-1.5">
                  <dt className="text-muted-foreground break-all">{name}</dt>
                  <dd className="text-foreground break-all">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </div>
  );
};
