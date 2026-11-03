import React, { useState } from 'react';
import { Info, Sparkles } from 'lucide-react';
import { AI_USAGE_PERIODS, type AiUsageGroup, type AiUsagePeriod } from '../../../../../shared/types';
import { useAiUsage } from '../../../hooks/settings/useAiUsage';
import { AI_USAGE_LOCAL_NOTE, formatCost, formatTokens } from '../../../utils/aiUsageViewUtils';

const GroupTable: React.FC<{ title: string; groups: AiUsageGroup[] }> = ({ title, groups }) => (
  <section aria-label={title} className="space-y-1.5">
    <h4 className="text-xs text-muted-foreground font-semibold">{title}</h4>
    {groups.length === 0 ? (
      <p className="text-xs text-muted-foreground">—</p>
    ) : (
      <table className="w-full text-xs">
        <tbody>
          {groups.map((g) => (
            <tr key={g.key} className="border-b border-border/30">
              <td className="py-1 pr-2 text-foreground truncate max-w-[220px]" title={g.label}>{g.label}</td>
              <td className="py-1 pr-2 text-right font-mono text-muted-foreground">{g.calls}×</td>
              <td className="py-1 text-right font-mono">{formatTokens(g.totalTokens)}</td>
              {g.costEstimate !== undefined && (
                <td className="py-1 pl-2 text-right font-mono text-muted-foreground">~{formatCost(g.costEstimate)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </section>
);

/** Tokens de IA por período, provedor/modelo e origem, em "Meu uso". */
export const AiUsagePanel: React.FC = () => {
  const [period, setPeriod] = useState<AiUsagePeriod>('30d');
  const { report, error } = useAiUsage(period);

  return (
    <div className="cockpit-panel rounded-xl p-5 space-y-4 border border-border" id="field-aiUsage">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Uso de IA (tokens)
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quanto o Assistente IA consumiu em cada motor. O teto é definido em Configurações → IA &amp; LLM.
          </p>
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Período do uso de IA">
          {AI_USAGE_PERIODS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPeriod(id)}
              aria-pressed={period === id}
              className={`px-2.5 py-1 rounded-lg text-2xs font-bold border transition-colors ${
                period === id
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
      {report && !report.enabled && (
        <p className="text-xs text-warning">
          A contagem de uso está desligada: tokens não são registrados e o teto não é aplicado.
        </p>
      )}
      {report && report.enabled && report.totals.calls === 0 && (
        <p className="text-xs text-muted-foreground">Nenhuma chamada de IA registrada neste período.</p>
      )}

      {report && report.totals.calls > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            {[
              ['Chamadas', String(report.totals.calls)],
              ['Entrada', formatTokens(report.totals.promptTokens)],
              ['Saída', formatTokens(report.totals.completionTokens)],
              ['Total', formatTokens(report.totals.totalTokens)]
            ].map(([label, value]) => (
              <div key={label} className="bg-card/70 border border-border/80 rounded-xl p-3">
                <div className="text-2xs text-muted-foreground font-sans font-semibold">{label}</div>
                <div className="text-lg font-bold text-foreground">{value}</div>
              </div>
            ))}
          </div>
          {report.costEstimate !== undefined && (
            <p className="text-xs text-muted-foreground">
              Custo estimado: <span className="font-mono text-foreground">~{formatCost(report.costEstimate)}</span> — calculado com os
              preços por milhão de tokens que você informou em cada motor.
            </p>
          )}
          <div className="grid grid-cols-1 2xl:grid-cols-3 gap-4">
            <GroupTable title="Por provedor" groups={report.byProvider} />
            <GroupTable title="Por modelo" groups={report.byModel} />
            <GroupTable title="Por origem" groups={report.bySource} />
          </div>
        </>
      )}

      <p className="text-2xs text-muted-foreground flex items-start gap-1.5">
        <Info className="w-3 h-3 mt-0.5 shrink-0" />
        {AI_USAGE_LOCAL_NOTE}
      </p>
    </div>
  );
};
