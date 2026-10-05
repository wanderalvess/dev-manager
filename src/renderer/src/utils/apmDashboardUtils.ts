import type { ApmTimeSeriesBucket, EndpointMetricsSummary } from '../../../shared/types';

export type EndpointSortMode = 'volume' | 'slow';

/** Ordena endpoints por volume ou por lentidão (p95, desempate pela média) sem mutar a entrada. */
export function sortEndpoints(endpoints: EndpointMetricsSummary[], mode: EndpointSortMode): EndpointMetricsSummary[] {
  const list = [...endpoints];
  if (mode === 'slow') {
    return list.sort((a, b) => b.p95DurationMs - a.p95DurationMs || b.avgDurationMs - a.avgDurationMs);
  }
  return list.sort((a, b) => b.requestCount - a.requestCount);
}

/** Máximo de requisições por bucket (mínimo 1, para evitar divisão por zero nas proporções). */
export function getMaxBucketRequests(series: ApmTimeSeriesBucket[]): number {
  if (series.length === 0) return 1;
  const max = Math.max(...series.map((b) => b.requestCount));
  return max > 0 ? max : 1;
}

/** Máximo de latência p95 por bucket (mínimo 1). */
export function getMaxBucketLatency(series: ApmTimeSeriesBucket[]): number {
  if (series.length === 0) return 1;
  const max = Math.max(...series.map((b) => b.p95DurationMs));
  return max > 0 ? max : 1;
}

export function sumRequests(series: ApmTimeSeriesBucket[]): number {
  return series.reduce((acc, b) => acc + b.requestCount, 0);
}

/** RPM estimado: total dividido pelos buckets que tiveram tráfego. */
export function computeRpm(series: ApmTimeSeriesBucket[]): number {
  if (series.length === 0) return 0;
  const filled = series.filter((b) => b.requestCount > 0);
  if (filled.length === 0) return 0;
  return Math.round(sumRequests(series) / Math.max(1, filled.length));
}

/** Pontos da polyline de latência p95 (viewBox 0-100; Y mapeado entre 18 e 88, invertido). */
export function buildLatencyLinePoints(series: ApmTimeSeriesBucket[], maxLatency: number): string {
  if (series.length < 2) return '';
  const count = series.length;
  return series
    .map((b, i) => {
      const xPct = ((i + 0.5) / count) * 100;
      const yPct = maxLatency > 0 ? 88 - (b.p95DurationMs / maxLatency) * 70 : 88;
      return `${xPct},${yPct}`;
    })
    .join(' ');
}

/** Altura (%) da mini-barra de sparkline. */
export function getSparklineHeightPct(requestCount: number, maxRequests: number): number {
  return requestCount > 0 ? Math.max(15, Math.round((requestCount / maxRequests) * 100)) : 10;
}

/** Altura (%) da barra empilhada do gráfico principal. */
export function getBucketHeightPct(total: number, maxRequests: number): number {
  return total > 0 ? Math.max(8, Math.round((total / maxRequests) * 100)) : 2;
}

/** Largura (%) da barra de p95 relativa ao p99. */
export function getP95BarWidthPct(p95: number, p99: number): number {
  return Math.min(100, Math.max(10, Math.round((p95 / Math.max(p99, 100)) * 100)));
}

/** Largura (%) da barra de falhas (mínimo visual de 5%). */
export function getErrorBarWidthPct(errorRate: number): number {
  return Math.max(5, Math.min(100, errorRate * 5));
}

/** Percentual de tempo em Java (complemento do tempo em banco), 1 casa decimal. */
export function getJavaTimePercentage(dbTimePercentage: number): number {
  return Math.round((100 - dbTimePercentage) * 10) / 10;
}

export type SlowQuerySeverity = 'critical' | 'slow' | 'normal';

export function getSlowQuerySeverity(maxDurationMs: number): SlowQuerySeverity {
  if (maxDurationMs >= 1000) return 'critical';
  if (maxDurationMs >= 300) return 'slow';
  return 'normal';
}

/** Heurística de tabela WinThor: começa com PC e tem ao menos 4 caracteres. */
export function isWinThorTable(token: string): boolean {
  return token.toUpperCase().startsWith('PC') && token.length >= 4;
}
