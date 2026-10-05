import React from 'react';
import { TrendingUp } from 'lucide-react';
import { ApmTimeSeriesBucket } from '../../../../../shared/types';
import { getBucketHeightPct } from '../../../utils/apmDashboardUtils';

interface ApmDashboardTimeChartProps {
  timeSeries: ApmTimeSeriesBucket[];
  maxBucketRequests: number;
  latencyLinePoints: string;
  hoveredBucketIdx: number | null;
  onHoverBucket: (idx: number | null) => void;
}

/** Gráfico Dual-Axis Temporal: Volume de Requisições + Linha de Latência p95. */
export const ApmDashboardTimeChart: React.FC<ApmDashboardTimeChartProps> = ({
  timeSeries,
  maxBucketRequests,
  latencyLinePoints,
  hoveredBucketIdx,
  onHoverBucket
}) => {
  return (
    <div className="p-4 rounded-xl bg-card border border-border shadow-xs flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-foreground">
            Volume & Latência nos Últimos 15 Minutos
          </h4>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" /> Sucesso (2xx/3xx)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" /> Erro Cliente (4xx)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" /> Erro Servidor (5xx)
          </span>
          <span className="flex items-center gap-1.5 ml-2 border-l border-border pl-2">
            <span className="w-3 h-0.5 bg-indigo-500 rounded-full" /> Curva p95
          </span>
        </div>
      </div>

      {/* Visualizador de Barras Temporais com Linha SVG Sobreposta */}
      <div className="relative pt-4 pb-1">
        {/* SVG Overlay: Linha de Tendência de Latência p95 */}
        {latencyLinePoints && (
          <svg
            className="absolute inset-0 w-full h-28 pointer-events-none z-10 overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <polyline
              fill="none"
              stroke="rgb(99, 102, 241)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={latencyLinePoints}
              className="opacity-80"
            />
          </svg>
        )}

        <div className="h-28 flex items-end gap-1.5 sm:gap-2 px-1 relative z-0">
          {timeSeries.map((bucket, idx) => {
            const total = bucket.requestCount;
            const heightPct = getBucketHeightPct(total, maxBucketRequests);
            const isHovered = hoveredBucketIdx === idx;

            // Proporções internas da barra empilhada
            const successPct = total > 0 ? (bucket.successCount / total) * 100 : 0;
            const clientErrPct = total > 0 ? (bucket.clientErrorCount / total) * 100 : 0;
            const serverErrPct = total > 0 ? (bucket.serverErrorCount / total) * 100 : 0;

            return (
              <div
                key={bucket.timestampUnixMs}
                className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                onMouseEnter={() => onHoverBucket(idx)}
                onMouseLeave={() => onHoverBucket(null)}
              >
                {/* Tooltip flutuante ao passar o mouse */}
                {isHovered && total > 0 && (
                  <div className="absolute bottom-full mb-3 z-30 px-3 py-2 rounded-lg bg-neutral-900 text-neutral-100 text-[11px] shadow-xl border border-neutral-800 whitespace-nowrap pointer-events-none">
                    <div className="font-semibold font-mono text-emerald-400 mb-1 flex items-center justify-between gap-3">
                      <span>Minuto {bucket.label}</span>
                      <span className="text-neutral-400 text-2xs">{total} requisições</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-2xs font-mono text-neutral-300">
                      <span>🟢 Sucesso: {bucket.successCount}</span>
                      <span>🔴 Erros 5xx: {bucket.serverErrorCount}</span>
                      <span>🟡 Erros 4xx: {bucket.clientErrorCount}</span>
                      <span className="text-indigo-300 font-bold">⏱️ p95: {bucket.p95DurationMs}ms</span>
                    </div>
                  </div>
                )}

                {/* Barra Empilhada */}
                <div
                  className={`w-full rounded-t-xs overflow-hidden flex flex-col justify-end transition-all ${
                    isHovered ? 'ring-2 ring-primary ring-offset-1 ring-offset-card' : ''
                  } ${total === 0 ? 'bg-neutral-200/50 dark:bg-neutral-800/40 h-1' : ''}`}
                  style={total > 0 ? { height: `${heightPct}%` } : undefined}
                >
                  {total > 0 && (
                    <>
                      {serverErrPct > 0 && (
                        <div className="bg-rose-500 w-full" style={{ height: `${serverErrPct}%` }} />
                      )}
                      {clientErrPct > 0 && (
                        <div className="bg-amber-500 w-full" style={{ height: `${clientErrPct}%` }} />
                      )}
                      {successPct > 0 && (
                        <div className="bg-emerald-500 w-full" style={{ height: `${successPct}%` }} />
                      )}
                    </>
                  )}
                </div>

                {/* Rótulo da Hora a cada 2 buckets para não poluir */}
                <span className="text-2xs font-mono text-muted-foreground mt-2 truncate w-full text-center">
                  {idx % 2 === 0 ? bucket.label : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
