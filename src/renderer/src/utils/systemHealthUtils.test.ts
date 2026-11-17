import { describe, expect, it } from 'vitest';
import type { SystemMetrics } from '../../../shared/types';
import {
  appendHealthSample,
  formatUptime,
  getResourceStatus,
  normalizeSystemMetricsSample,
  summarizeHealthSeries
} from './systemHealthUtils';

describe('systemHealthUtils', () => {
  it('normaliza SystemMetrics com campos padrão e calcula memória livre em GB', () => {
    const metrics: SystemMetrics = {
      cpuUsagePercent: 42,
      totalMemMb: 16384,
      usedMemMb: 8192,
      memUsagePercent: 50,
      uptimeSeconds: 7380
    };
    const ts = new Date(2026, 10, 17, 9, 5, 3).getTime();
    const sample = normalizeSystemMetricsSample(metrics, ts);

    expect(sample.timeLabel).toBe('09:05:03');
    expect(sample.cpuPercent).toBe(42);
    expect(sample.memPercent).toBe(50);
    expect(sample.totalMemGb).toBe(16);
    expect(sample.usedMemGb).toBe(8);
    expect(sample.freeMemGb).toBe(8);
    expect(sample.uptimeSeconds).toBe(7380);
  });

  it('suporta campos legados e limita percentuais entre 0 e 100', () => {
    const legacy: SystemMetrics = {
      cpuUsagePercent: 140,
      totalMemMb: 0,
      usedMemMb: 0,
      memUsagePercent: -10,
      totalMemoryMb: 8192,
      usedMemoryMb: 4096,
      memoryUsagePercent: 50,
      uptimeSeconds: 120
    };

    const sample = normalizeSystemMetricsSample(legacy, Date.now());
    expect(sample.cpuPercent).toBe(100);
    expect(sample.memPercent).toBe(0);
    expect(sample.totalMemGb).toBe(0);
  });

  it('mantém a janela rolante limitada ao máximo de amostras configurado', () => {
    const base: SystemMetrics = {
      cpuUsagePercent: 20,
      totalMemMb: 8192,
      usedMemMb: 4096,
      memUsagePercent: 50,
      uptimeSeconds: 600
    };
    let series = [] as ReturnType<typeof normalizeSystemMetricsSample>[];
    for (let i = 0; i < 5; i++) {
      series = appendHealthSample(series, normalizeSystemMetricsSample({ ...base, cpuUsagePercent: i * 10 }, 1000 + i), 3);
    }

    expect(series).toHaveLength(3);
    expect(series.map((s) => s.cpuPercent)).toEqual([20, 30, 40]);
  });

  it('formata uptime e classifica níveis de saúde corretamente', () => {
    expect(formatUptime(90060)).toBe('1d 1h 1m');
    expect(formatUptime(3720)).toBe('1h 2m');
    expect(formatUptime(540)).toBe('9m');

    expect(getResourceStatus(35)).toEqual({ level: 'nominal', label: 'Normal' });
    expect(getResourceStatus(65)).toEqual({ level: 'warning', label: 'Elevado' });
    expect(getResourceStatus(85)).toEqual({ level: 'critical', label: 'Crítico' });
  });

  it('calcula médias e picos da série histórica', () => {
    const samples = [
      normalizeSystemMetricsSample({ cpuUsagePercent: 20, totalMemMb: 8192, usedMemMb: 2048, memUsagePercent: 25, uptimeSeconds: 10 }, 1),
      normalizeSystemMetricsSample({ cpuUsagePercent: 60, totalMemMb: 8192, usedMemMb: 6144, memUsagePercent: 75, uptimeSeconds: 20 }, 2)
    ];

    expect(summarizeHealthSeries([])).toEqual({ avgCpu: 0, peakCpu: 0, avgMem: 0, peakMem: 0 });
    expect(summarizeHealthSeries(samples)).toEqual({
      avgCpu: 40,
      peakCpu: 60,
      avgMem: 50,
      peakMem: 75
    });
  });
});
