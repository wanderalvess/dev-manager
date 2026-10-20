import React from 'react';
import { Activity, CheckCircle2, Clock3 } from 'lucide-react';
import type { UsageSummary } from '../../../../../shared/types';
import { usageModuleLabel } from '../../../../../shared/usageActions';
import {
  USAGE_RANGES,
  barPercent,
  formatDuration,
  formatWeekLabel,
  hasUsage,
  lastWeeks,
  successRate,
  type UsageRange
} from '../../../utils/usageViewUtils';

interface UsageSummaryPanelProps {
  summary: UsageSummary | null;
  loading: boolean;
  error: string | null;
  range: UsageRange;
  onRangeChange: (range: UsageRange) => void;
}

const ORIGIN_LABEL = { ui: 'Interface', rest: 'API REST', mcp: 'IA (MCP)' } as const;
const WEEKS_SHOWN = 8;

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; hint?: string }> = ({
  icon,
  label,
  value,
  hint
}) => (
  <div className="bg-card/70 border border-border/80 rounded-xl p-3 space-y-1">
    <div className="flex items-center gap-1.5 text-2xs uppercase tracking-wider text-muted-foreground font-bold">
      {icon}
      {label}
    </div>
    <div className="text-xl font-bold text-foreground font-mono">{value}</div>
    {hint && <div className="text-2xs text-muted-foreground">{hint}</div>}
  </div>
);

/** Totais, uso por módulo, semanas e as ações mais usadas, a partir do resumo local. */
export const UsageSummaryPanel: React.FC<UsageSummaryPanelProps> = ({ summary, loading, error, range, onRangeChange }) => {
  const rate = summary ? successRate(summary.totalOk, summary.totalRuns) : null;
  const totalMs = summary?.byModule.reduce((sum, m) => sum + m.totalMs, 0) ?? 0;
  const weeks = summary ? lastWeeks(summary.byWeek, WEEKS_SHOWN) : [];
  const maxWeek = Math.max(0, ...weeks.map((w) => w.runs));
  const maxModule = Math.max(0, ...(summary?.byModule.map((m) => m.runs) ?? []));
  const topRows = summary?.rows.slice(0, 8) ?? [];

  return (
    <div className="cockpit-panel rounded-xl p-5 space-y-4 shadow-xl border border-border" id="field-usageSummary">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Meu uso
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            O que você executou no Hub Manager nesta máquina, pela interface, pela API REST e pela IA (MCP).
          </p>
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Período">
          {USAGE_RANGES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onRangeChange(id)}
              aria-pressed={range === id}
              className={`px-2.5 py-1 rounded-lg text-2xs font-bold border transition-colors ${
                range === id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/60 text-muted-foreground border-border/60 hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
      {loading && !summary && <p className="text-xs text-muted-foreground">Carregando…</p>}

      {summary && !hasUsage(summary) && !error && (
        <p className="text-xs text-muted-foreground">
          {summary.enabled
            ? 'Nenhum uso registrado neste período. Execute uma automação (pipeline, deploy, backup, testes…) e volte aqui.'
            : 'A contagem está desligada, então nada é registrado.'}
        </p>
      )}

      {summary && hasUsage(summary) && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard icon={<Activity className="w-3 h-3" />} label="Execuções" value={String(summary.totalRuns)} />
            <StatCard
              icon={<CheckCircle2 className="w-3 h-3" />}
              label="Sucesso"
              value={rate === null ? '—' : `${rate}%`}
              hint={summary.totalFailed > 0 ? `${summary.totalFailed} com falha` : 'nenhuma falha'}
            />
            <StatCard icon={<Clock3 className="w-3 h-3" />} label="Tempo executando" value={formatDuration(totalMs)} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section aria-label="Uso por módulo" className="space-y-2">
              <h4 className="text-2xs uppercase tracking-wider text-muted-foreground font-bold">Por módulo</h4>
              {summary.byModule.map((m) => (
                <div key={m.module} className="space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground font-medium">{usageModuleLabel(m.module)}</span>
                    <span className="font-mono text-muted-foreground">{m.runs}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${barPercent(m.runs, maxModule)}%` }} />
                  </div>
                </div>
              ))}
            </section>

            <section aria-label="Uso por semana" className="space-y-2">
              <h4 className="text-2xs uppercase tracking-wider text-muted-foreground font-bold">
                Por semana (últimas {WEEKS_SHOWN})
              </h4>
              <div className="flex items-end gap-1.5 h-28">
                {weeks.map((w) => (
                  <div key={w.weekStart} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                    <span className="text-2xs font-mono text-muted-foreground">{w.runs || ''}</span>
                    <div
                      className="w-full bg-primary/80 rounded-t"
                      style={{ height: `${barPercent(w.runs, maxWeek)}%` }}
                      title={`Semana de ${formatWeekLabel(w.weekStart)}: ${w.runs} execuções`}
                    />
                    <span className="text-[9px] text-muted-foreground font-mono">{formatWeekLabel(w.weekStart)}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section aria-label="Ações mais usadas" className="space-y-2">
            <h4 className="text-2xs uppercase tracking-wider text-muted-foreground font-bold">Ações mais usadas</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-2xs uppercase tracking-wider text-muted-foreground border-b border-border/60">
                    <th className="py-1 pr-2 font-bold">Ação</th>
                    <th className="py-1 pr-2 font-bold">Origem</th>
                    <th className="py-1 pr-2 font-bold text-right">Execuções</th>
                    <th className="py-1 pr-2 font-bold text-right">Falhas</th>
                    <th className="py-1 font-bold text-right">Média</th>
                  </tr>
                </thead>
                <tbody>
                  {topRows.map((r) => (
                    <tr key={`${r.module}/${r.action}/${r.origin}`} className="border-b border-border/30">
                      <td className="py-1 pr-2">
                        <span className="text-foreground">{usageModuleLabel(r.module)}</span>{' '}
                        <span className="font-mono text-muted-foreground">{r.action}</span>
                      </td>
                      <td className="py-1 pr-2 text-muted-foreground">{ORIGIN_LABEL[r.origin]}</td>
                      <td className="py-1 pr-2 text-right font-mono">{r.runs}</td>
                      <td className={`py-1 pr-2 text-right font-mono ${r.failed > 0 ? 'text-danger' : 'text-muted-foreground'}`}>
                        {r.failed}
                      </td>
                      <td className="py-1 text-right font-mono text-muted-foreground">{formatDuration(r.avgMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
