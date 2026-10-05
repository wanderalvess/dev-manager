import type { KarafJvmMemoryInfo } from '../../../shared/types';

export type JvmAlertLevel = KarafJvmMemoryInfo['alertLevel'];

export interface TelemetryPoint {
  time: string;
  heapUsedMb: number;
  heapMaxMb: number;
  heapPercent: number;
  nonHeapUsedMb: number;
}

export interface ChartPoint {
  x: number;
  y: number;
}

export interface ChartGeometry {
  chartWidth: number;
  chartHeight: number;
  paddingX: number;
  paddingY: number;
  innerW: number;
  innerH: number;
  points: ChartPoint[];
  pathD: string;
  areaD: string;
  warningY: number;
}

export const MAX_HISTORY_POINTS = 25;

export const formatClockTime = (date: Date): string => {
  const pad = (n: number): string => n.toString().padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

export const appendHistoryPoint = (
  prev: TelemetryPoint[],
  data: KarafJvmMemoryInfo,
  now: Date
): TelemetryPoint[] => {
  const next = [
    ...prev,
    {
      time: formatClockTime(now),
      heapUsedMb: data.heapUsedMb,
      heapMaxMb: data.heapMaxMb,
      heapPercent: data.heapUsagePercent,
      nonHeapUsedMb: data.nonHeapUsedMb
    }
  ];
  return next.slice(-MAX_HISTORY_POINTS);
};

export const resolveStrokeColor = (isNearOom: boolean, alertLevel: JvmAlertLevel): string =>
  isNearOom ? '#f43f5e' : alertLevel === 'WARNING' ? '#f59e0b' : '#38bdf8';

export const resolveBadgeClass = (isNearOom: boolean, alertLevel: JvmAlertLevel): string =>
  isNearOom
    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
    : alertLevel === 'WARNING'
    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';

export const resolveGaugeClass = (isNearOom: boolean, alertLevel: JvmAlertLevel): string =>
  isNearOom ? 'bg-rose-500' : alertLevel === 'WARNING' ? 'bg-amber-500' : 'bg-sky-500';

export const resolveStatusDotClass = (isNearOom: boolean, alertLevel: JvmAlertLevel): string =>
  isNearOom ? 'bg-rose-500 animate-ping' : alertLevel === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-500';

export const resolveStatusTitle = (isNearOom: boolean, alertLevel: JvmAlertLevel): string =>
  isNearOom ? 'Crítico (Quase OOM)' : alertLevel === 'WARNING' ? 'Atenção' : 'Operação Normal';

export const computeHeapGaugeWidth = (heapUsagePercent: number | undefined): number =>
  Math.min(heapUsagePercent || 0, 100);

// Fallback de 256 MB evita divisão por zero quando o committed não é reportado
export const computeNonHeapGaugeWidth = (usedMb: number | undefined, committedMb: number | undefined): number =>
  Math.min(((usedMb || 0) / (committedMb || 256)) * 100, 100);

export const buildChartGeometry = (history: TelemetryPoint[]): ChartGeometry => {
  const maxCapacity = Math.max(...history.map((p) => p.heapMaxMb), 512);
  const chartHeight = 130;
  const chartWidth = 580;
  const paddingX = 28;
  const paddingY = 16;
  const innerW = chartWidth - paddingX * 2;
  const innerH = chartHeight - paddingY * 2;

  const points = history.map((pt, i) => ({
    x: paddingX + (i / (history.length - 1)) * innerW,
    y: paddingY + innerH - (Math.min(pt.heapUsedMb, maxCapacity) / maxCapacity) * innerH
  }));

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `${acc} L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${chartHeight - paddingY} L ${points[0].x.toFixed(1)} ${
    chartHeight - paddingY
  } Z`;

  // Linha de limite 85% (alerta)
  const warningY = paddingY + innerH * 0.15;

  return { chartWidth, chartHeight, paddingX, paddingY, innerW, innerH, points, pathD, areaD, warningY };
};
