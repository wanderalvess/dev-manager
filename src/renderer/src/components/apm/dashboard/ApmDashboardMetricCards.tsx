import React from 'react';
import { Activity, Clock, AlertCircle, Database } from 'lucide-react';
import { ObservabilityOverview, ApmTimeSeriesBucket } from '../../../../../shared/types';
import {
  getErrorBarWidthPct,
  getJavaTimePercentage,
  getP95BarWidthPct,
  getSparklineHeightPct
} from '../../../utils/apmDashboardUtils';

interface ApmDashboardMetricCardsProps {
  overview: ObservabilityOverview;
  timeSeries: ApmTimeSeriesBucket[];
  maxBucketRequests: number;
  rpm: number;
}

/** Grade de Cards de Métricas Vitais (RED + Database Load). */
export const ApmDashboardMetricCards: React.FC<ApmDashboardMetricCardsProps> = ({
  overview,
  timeSeries,
  maxBucketRequests,
  rpm
}) => {
  const javaTimePct = getJavaTimePercentage(overview.dbTimePercentage);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
      {/* Card 1: Throughput (Vazão RPM) */}
      <div className="p-3.5 rounded-xl bg-card border border-border shadow-xs flex flex-col justify-between relative overflow-hidden">
        <div className="flex items-center justify-between text-muted-foreground mb-1">
          <span className="text-[11px] uppercase tracking-wider font-semibold font-mono flex items-center gap-1.5 text-foreground/80">
            <Activity className="w-3.5 h-3.5 text-sky-500" />
            Vazão (Throughput)
          </span>
          <span className="text-2xs font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            {overview.requestsPerSecond} req/s
          </span>
        </div>

        <div className="mt-2">
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground flex items-baseline gap-1.5">
            <span>{rpm}</span>
            <span className="text-xs font-normal font-sans text-muted-foreground">RPM</span>
          </div>

          {/* Mini-sparkline dos últimos buckets */}
          <div className="h-4 flex items-end gap-0.5 mt-2 opacity-80">
            {timeSeries.slice(-15).map((b, i) => (
              <div
                key={`sp-${b.timestampUnixMs}-${i}`}
                className="flex-1 bg-sky-500/40 dark:bg-sky-400/40 rounded-t-xs hover:bg-sky-500 transition-colors"
                style={{ height: `${getSparklineHeightPct(b.requestCount, maxBucketRequests)}%` }}
                title={`${b.label}: ${b.requestCount} reqs`}
              />
            ))}
          </div>

          <p className="text-2xs text-muted-foreground mt-1.5 font-mono">
            Total acumulado: {overview.totalTraces} requisições
          </p>
        </div>
      </div>

      {/* Card 2: Latência Percentil (p95) */}
      <div className="p-3.5 rounded-xl bg-card border border-border shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-muted-foreground mb-1">
          <span className="text-[11px] uppercase tracking-wider font-semibold font-mono flex items-center gap-1.5 text-foreground/80">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            Latência (p95)
          </span>
          <span
            className={`text-2xs font-mono px-1.5 py-0.5 rounded border ${
              overview.p95LatencyMs < 200
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : overview.p95LatencyMs < 800
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
            }`}
          >
            méd: {overview.avgLatencyMs}ms
          </span>
        </div>

        <div className="mt-2">
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground flex items-baseline gap-1.5">
            <span
              className={
                overview.p95LatencyMs > 1000
                  ? 'text-rose-600 dark:text-rose-400'
                  : overview.p95LatencyMs > 400
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-foreground'
              }
            >
              {overview.p95LatencyMs}
            </span>
            <span className="text-xs font-normal font-sans text-muted-foreground">ms</span>
          </div>

          {/* Escala Visual de Percentis */}
          <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-3 relative">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${getP95BarWidthPct(overview.p95LatencyMs, overview.p99LatencyMs)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-2xs font-mono text-muted-foreground mt-1.5">
            <span>p50: <strong className="text-foreground">{overview.p50LatencyMs}ms</strong></span>
            <span>•</span>
            <span>p99: <strong className="text-foreground">{overview.p99LatencyMs}ms</strong></span>
          </div>
        </div>
      </div>

      {/* Card 3: Confiabilidade & Taxa de Erros */}
      <div className="p-3.5 rounded-xl bg-card border border-border shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-muted-foreground mb-1">
          <span className="text-[11px] uppercase tracking-wider font-semibold font-mono flex items-center gap-1.5 text-foreground/80">
            <AlertCircle
              className={`w-3.5 h-3.5 ${
                overview.errorRate > 0 ? 'text-rose-500' : 'text-emerald-500'
              }`}
            />
            Taxa de Falhas
          </span>
          <span
            className={`text-2xs font-mono px-1.5 py-0.5 rounded border ${
              overview.errorRate === 0
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
            }`}
          >
            {overview.errorRate === 0 ? '100% OK' : 'Atenção'}
          </span>
        </div>

        <div className="mt-2">
          <div
            className={`text-2xl font-bold font-mono tracking-tight flex items-baseline gap-1 ${
              overview.errorRate > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'
            }`}
          >
            <span>{overview.errorRate}</span>
            <span className="text-xs font-normal font-sans text-muted-foreground">%</span>
          </div>

          {/* Indicador de Falhas */}
          <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-3">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                overview.errorRate > 0 ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${getErrorBarWidthPct(overview.errorRate)}%` }}
            />
          </div>

          <p className="text-2xs text-muted-foreground mt-1.5 font-mono">
            {overview.errorRate > 0
              ? 'Erros HTTP 5xx ou exceções Java capturadas'
              : 'Nenhuma exceção não tratada no Karaf'}
          </p>
        </div>
      </div>

      {/* Card 4: Perfil de Carga (Oracle vs JVM) */}
      <div className="p-3.5 rounded-xl bg-card border border-border shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-muted-foreground mb-1">
          <span className="text-[11px] uppercase tracking-wider font-semibold font-mono flex items-center gap-1.5 text-foreground/80">
            <Database className="w-3.5 h-3.5 text-amber-500" />
            Tempo em Banco (Oracle)
          </span>
          <span className="text-2xs font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-bold">
            Listener SQL
          </span>
        </div>

        <div className="mt-2">
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground flex items-baseline gap-1">
            <span className="text-amber-600 dark:text-amber-400">{overview.dbTimePercentage}</span>
            <span className="text-xs font-normal font-sans text-muted-foreground">%</span>
          </div>

          {/* Barra de Proporção: Banco vs Java */}
          <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-3 flex">
            <div
              className="bg-amber-500 h-full transition-all duration-500"
              style={{ width: `${Math.min(100, overview.dbTimePercentage)}%` }}
              title={`Banco de Dados: ${overview.dbTimePercentage}%`}
            />
            <div
              className="bg-sky-500 h-full transition-all duration-500"
              style={{ width: `${Math.max(0, 100 - overview.dbTimePercentage)}%` }}
              title={`Processamento Java: ${javaTimePct}%`}
            />
          </div>

          <div className="flex items-center justify-between text-2xs text-muted-foreground mt-1.5 font-mono">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Oracle ({overview.dbTimePercentage}%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" /> Java ({javaTimePct}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
