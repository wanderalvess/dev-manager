import React from 'react';
import { Download, Hourglass, Info } from 'lucide-react';
import type { UsageImpact, UsageImpactWindow } from '../../../../../shared/types';
import { usageModuleLabel } from '../../../../../shared/usageActions';
import { barPercent } from '../../../utils/usageViewUtils';
import { confirmedShare, formatSavedTime } from '../../../utils/usageImpactViewUtils';
import { UsageBaselineTable } from './UsageBaselineTable';

interface UsageImpactPanelProps {
  impact: UsageImpact | null;
  loading: boolean;
  error: string | null;
  onChangeBaseline: (key: string, minutes: number) => void;
  onResetBaseline: (key: string) => void;
  onExport: () => void;
}

const WindowCard: React.FC<{ title: string; window: UsageImpactWindow }> = ({ title, window }) => {
  const share = confirmedShare(window);
  const estimatedMs = window.savedMs - window.confirmedMs;
  return (
    <div className="bg-card/70 border border-border/80 rounded-xl p-3 space-y-1">
      <div className="text-xs text-muted-foreground font-semibold">{title}</div>
      <div className="text-xl font-bold text-foreground font-mono">{formatSavedTime(window.savedMs)}</div>
      <div className="text-2xs text-muted-foreground">
        {share === null
          ? 'Nenhum uso com tempo manual de referência'
          : `${formatSavedTime(window.confirmedMs)} confirmado · ${formatSavedTime(estimatedMs)} estimado (padrão)`}
      </div>
    </div>
  );
};

/** Tempo economizado na semana, no mês e desde o início, por módulo, e as linhas de base editáveis. */
export const UsageImpactPanel: React.FC<UsageImpactPanelProps> = ({
  impact,
  loading,
  error,
  onChangeBaseline,
  onResetBaseline,
  onExport
}) => {
  const maxModule = Math.max(0, ...(impact?.total.byModule.map((m) => m.savedMs) ?? []));
  const share = impact ? confirmedShare(impact.total) : null;

  return (
    <div className="cockpit-panel rounded-xl p-5 space-y-4 border border-border" id="field-usageImpact">
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-border/60">
        <div className="max-w-2xl">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Hourglass className="w-4 h-4 text-primary" /> Meu impacto (tempo economizado)
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Economia = usos com sucesso × o tempo que você levava à mão − o tempo real no Hub Manager. Falhas não contam e o
            resultado nunca é negativo.
          </p>
        </div>
        <button
          type="button"
          onClick={onExport}
          disabled={!impact}
          className="px-3 py-1.5 bg-muted hover:bg-muted/70 text-foreground border border-border rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Baixa a tabela abaixo em CSV (Excel Brasil)"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar CSV</span>
        </button>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
      {loading && !impact && <p className="text-xs text-muted-foreground">Carregando…</p>}

      {impact && (
        <>
          {share !== null && share < 100 && (
            <div className="flex gap-2 p-3 rounded-xl bg-warning/10 text-xs text-muted-foreground">
              <Info className="w-4 h-4 shrink-0 text-warning mt-0.5" />
              <p>
                {share === 0 ? 'Todo o tempo economizado' : `${100 - share}% do tempo economizado`} usa tempos{' '}
                <strong className="text-foreground">padrão (estimativas)</strong>, não medições suas. Informe na tabela quanto
                tempo você levava à mão em cada automação para confirmar os números.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <WindowCard title="Últimos 7 dias" window={impact.week} />
            <WindowCard title="Últimos 30 dias" window={impact.month} />
            <WindowCard title="Desde o início" window={impact.total} />
          </div>

          {impact.total.byModule.length > 0 && (
            <section aria-label="Economia por módulo" className="space-y-2">
              <h4 className="text-xs text-muted-foreground font-semibold">Por módulo (desde o início)</h4>
              {impact.total.byModule.map((m) => (
                <div key={m.module} className="space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground font-medium">{usageModuleLabel(m.module)}</span>
                    <span className="font-mono text-muted-foreground">{formatSavedTime(m.savedMs)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-success rounded-full" style={{ width: `${barPercent(m.savedMs, maxModule)}%` }} />
                  </div>
                </div>
              ))}
            </section>
          )}

          <section aria-label="Tempo que você levava à mão" className="space-y-2">
            <h4 className="text-xs text-muted-foreground font-semibold">
              Quanto tempo você levava à mão? A mudança vale ao salvar as configurações
            </h4>
            <UsageBaselineTable rows={impact.rows} onChange={onChangeBaseline} onReset={onResetBaseline} />
          </section>
        </>
      )}
    </div>
  );
};
