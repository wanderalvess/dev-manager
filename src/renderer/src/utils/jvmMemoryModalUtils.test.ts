import { describe, it, expect } from 'vitest';
import type { KarafJvmMemoryInfo } from '../../../shared/types';
import {
  appendHistoryPoint,
  buildChartGeometry,
  computeHeapGaugeWidth,
  computeNonHeapGaugeWidth,
  formatClockTime,
  resolveStrokeColor,
  resolveStatusTitle,
  type TelemetryPoint
} from './jvmMemoryModalUtils';

const makeInfo = (overrides: Partial<KarafJvmMemoryInfo> = {}): KarafJvmMemoryInfo => ({
  timestamp: 0,
  heapUsedBytes: 0,
  heapCommittedBytes: 0,
  heapMaxBytes: 0,
  heapUsedMb: 100,
  heapCommittedMb: 200,
  heapMaxMb: 1024,
  heapUsagePercent: 10,
  nonHeapUsedBytes: 0,
  nonHeapCommittedBytes: 0,
  nonHeapMaxBytes: 0,
  nonHeapUsedMb: 50,
  isNearOom: false,
  alertLevel: 'NORMAL',
  source: 'jmx',
  ...overrides
});

const makePoint = (heapUsedMb: number, heapMaxMb = 1024): TelemetryPoint => ({
  time: '00:00:00',
  heapUsedMb,
  heapMaxMb,
  heapPercent: 0,
  nonHeapUsedMb: 0
});

describe('formatClockTime', () => {
  it('preenche com zeros à esquerda', () => {
    expect(formatClockTime(new Date(2026, 0, 1, 3, 4, 5))).toBe('03:04:05');
  });
});

describe('appendHistoryPoint', () => {
  it('adiciona o ponto mapeado a partir das métricas', () => {
    const next = appendHistoryPoint([], makeInfo(), new Date(2026, 0, 1, 10, 0, 0));
    expect(next).toEqual([
      { time: '10:00:00', heapUsedMb: 100, heapMaxMb: 1024, heapPercent: 10, nonHeapUsedMb: 50 }
    ]);
  });

  it('mantém no máximo 25 pontos', () => {
    const prev = Array.from({ length: 25 }, (_, i) => makePoint(i));
    const next = appendHistoryPoint(prev, makeInfo(), new Date());
    expect(next).toHaveLength(25);
    expect(next[0].heapUsedMb).toBe(1);
    expect(next[24].heapUsedMb).toBe(100);
  });
});

describe('resolvers de nível de alerta', () => {
  it('prioriza isNearOom sobre WARNING', () => {
    expect(resolveStrokeColor(true, 'WARNING')).toBe('#f43f5e');
    expect(resolveStrokeColor(false, 'WARNING')).toBe('#f59e0b');
    expect(resolveStrokeColor(false, 'NORMAL')).toBe('#38bdf8');
    expect(resolveStatusTitle(true, 'NORMAL')).toBe('Crítico (Quase OOM)');
    expect(resolveStatusTitle(false, 'WARNING')).toBe('Atenção');
    expect(resolveStatusTitle(false, 'CRITICAL')).toBe('Operação Normal');
  });
});

describe('gauges', () => {
  it('limita o heap a 100%', () => {
    expect(computeHeapGaugeWidth(150)).toBe(100);
    expect(computeHeapGaugeWidth(undefined)).toBe(0);
  });

  it('usa 256 MB como fallback de committed e limita a 100%', () => {
    expect(computeNonHeapGaugeWidth(128, undefined)).toBe(50);
    expect(computeNonHeapGaugeWidth(500, 100)).toBe(100);
    expect(computeNonHeapGaugeWidth(undefined, undefined)).toBe(0);
  });
});

describe('buildChartGeometry', () => {
  it('gera caminho e área cobrindo toda a largura interna', () => {
    const g = buildChartGeometry([makePoint(0), makePoint(512)]);
    expect(g.points[0].x).toBe(g.paddingX);
    expect(g.points[1].x).toBe(g.chartWidth - g.paddingX);
    expect(g.pathD.startsWith('M 28.0')).toBe(true);
    expect(g.areaD.endsWith('Z')).toBe(true);
    expect(g.warningY).toBeCloseTo(g.paddingY + g.innerH * 0.15);
  });

  it('limita valores acima da capacidade ao topo do gráfico', () => {
    const g = buildChartGeometry([makePoint(5000, 1024), makePoint(5000, 1024)]);
    expect(g.points[0].y).toBe(g.paddingY);
  });
});
