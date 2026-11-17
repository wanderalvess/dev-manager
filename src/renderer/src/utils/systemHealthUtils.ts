import type { SystemMetrics } from '../../../shared/types';

export const MAX_HEALTH_SAMPLES = 30;

export type ResourceHealthLevel = 'nominal' | 'warning' | 'critical';

export interface SystemHealthSample {
  timestamp: number;
  timeLabel: string;
  cpuPercent: number;
  memPercent: number;
  usedMemGb: number;
  totalMemGb: number;
  freeMemGb: number;
  uptimeSeconds: number;
}

export interface SystemHealthSummary {
  avgCpu: number;
  peakCpu: number;
  avgMem: number;
  peakMem: number;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function formatTimeLabel(timestamp: number): string {
  const date = new Date(timestamp);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function formatUptime(uptimeSeconds: number): string {
  const safe = Math.max(0, Math.floor(uptimeSeconds || 0));
  const days = Math.floor(safe / 86400);
  const hours = Math.floor((safe % 86400) / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function normalizeSystemMetricsSample(
  metrics: SystemMetrics,
  timestamp: number = Date.now()
): SystemHealthSample {
  const usedMb = Math.max(0, metrics.usedMemMb ?? metrics.usedMemoryMb ?? 0);
  const totalMb = Math.max(1, metrics.totalMemMb ?? metrics.totalMemoryMb ?? 1);
  const rawMemPct =
    metrics.memUsagePercent ?? metrics.memoryUsagePercent ?? (usedMb / totalMb) * 100;

  const usedMemGb = Number((usedMb / 1024).toFixed(1));
  const totalMemGb = Number((totalMb / 1024).toFixed(1));
  const freeMemGb = Number(Math.max(0, totalMemGb - usedMemGb).toFixed(1));

  return {
    timestamp,
    timeLabel: formatTimeLabel(timestamp),
    cpuPercent: clampPercent(metrics.cpuUsagePercent ?? 0),
    memPercent: clampPercent(rawMemPct),
    usedMemGb,
    totalMemGb,
    freeMemGb,
    uptimeSeconds: Math.max(0, Math.round(metrics.uptimeSeconds || 0))
  };
}

export function appendHealthSample(
  history: SystemHealthSample[],
  next: SystemHealthSample,
  maxSamples: number = MAX_HEALTH_SAMPLES
): SystemHealthSample[] {
  const updated = [...history, next];
  if (updated.length <= maxSamples) return updated;
  return updated.slice(updated.length - maxSamples);
}

export function getResourceStatus(percent: number): {
  level: ResourceHealthLevel;
  label: string;
} {
  if (percent >= 85) return { level: 'critical', label: 'Crítico' };
  if (percent >= 65) return { level: 'warning', label: 'Elevado' };
  return { level: 'nominal', label: 'Normal' };
}

export function summarizeHealthSeries(history: SystemHealthSample[]): SystemHealthSummary {
  if (history.length === 0) {
    return { avgCpu: 0, peakCpu: 0, avgMem: 0, peakMem: 0 };
  }
  let sumCpu = 0;
  let peakCpu = 0;
  let sumMem = 0;
  let peakMem = 0;

  for (const item of history) {
    sumCpu += item.cpuPercent;
    if (item.cpuPercent > peakCpu) peakCpu = item.cpuPercent;
    sumMem += item.memPercent;
    if (item.memPercent > peakMem) peakMem = item.memPercent;
  }

  return {
    avgCpu: Math.round(sumCpu / history.length),
    peakCpu,
    avgMem: Math.round(sumMem / history.length),
    peakMem
  };
}
