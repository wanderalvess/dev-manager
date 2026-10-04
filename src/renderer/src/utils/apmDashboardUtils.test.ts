import { describe, it, expect } from 'vitest';
import type { ApmTimeSeriesBucket, EndpointMetricsSummary } from '../../../shared/types';
import {
  buildLatencyLinePoints,
  computeRpm,
  getBucketHeightPct,
  getErrorBarWidthPct,
  getJavaTimePercentage,
  getMaxBucketLatency,
  getMaxBucketRequests,
  getP95BarWidthPct,
  getSlowQuerySeverity,
  getSparklineHeightPct,
  isWinThorTable,
  sortEndpoints,
  sumRequests
} from './apmDashboardUtils';

const makeBucket = (requestCount: number, p95DurationMs = 0): ApmTimeSeriesBucket =>
  ({ requestCount, p95DurationMs }) as ApmTimeSeriesBucket;

const makeEndpoint = (route: string, requestCount: number, p95DurationMs: number, avgDurationMs = 0): EndpointMetricsSummary =>
  ({ route, requestCount, p95DurationMs, avgDurationMs }) as EndpointMetricsSummary;

describe('apmDashboardUtils', () => {
  it('sortEndpoints ordena por volume e por lentidão sem mutar a entrada', () => {
    const input = [makeEndpoint('a', 5, 100), makeEndpoint('b', 9, 50), makeEndpoint('c', 1, 100, 20)];
    expect(sortEndpoints(input, 'volume').map((e) => e.route)).toEqual(['b', 'a', 'c']);
    expect(sortEndpoints(input, 'slow').map((e) => e.route)).toEqual(['c', 'a', 'b']);
    expect(input.map((e) => e.route)).toEqual(['a', 'b', 'c']);
  });

  it('calcula máximos com piso 1', () => {
    expect(getMaxBucketRequests([])).toBe(1);
    expect(getMaxBucketRequests([makeBucket(0)])).toBe(1);
    expect(getMaxBucketRequests([makeBucket(3), makeBucket(7)])).toBe(7);
    expect(getMaxBucketLatency([makeBucket(1, 0)])).toBe(1);
    expect(getMaxBucketLatency([makeBucket(1, 120), makeBucket(1, 40)])).toBe(120);
  });

  it('soma requisições e calcula RPM considerando só buckets ativos', () => {
    const series = [makeBucket(10), makeBucket(0), makeBucket(20)];
    expect(sumRequests(series)).toBe(30);
    expect(computeRpm(series)).toBe(15);
    expect(computeRpm([])).toBe(0);
    expect(computeRpm([makeBucket(0)])).toBe(0);
  });

  it('buildLatencyLinePoints exige ao menos 2 buckets', () => {
    expect(buildLatencyLinePoints([makeBucket(1, 10)], 10)).toBe('');
    expect(buildLatencyLinePoints([makeBucket(1, 0), makeBucket(1, 10)], 10)).toBe('25,88 75,18');
  });

  it('calcula alturas e larguras proporcionais', () => {
    expect(getSparklineHeightPct(0, 10)).toBe(10);
    expect(getSparklineHeightPct(1, 100)).toBe(15);
    expect(getBucketHeightPct(0, 10)).toBe(2);
    expect(getBucketHeightPct(5, 10)).toBe(50);
    expect(getP95BarWidthPct(50, 50)).toBe(50);
    expect(getP95BarWidthPct(1, 1000)).toBe(10);
    expect(getErrorBarWidthPct(0)).toBe(5);
    expect(getErrorBarWidthPct(50)).toBe(100);
    expect(getJavaTimePercentage(33.3)).toBe(66.7);
  });

  it('classifica severidade de query e tabelas WinThor', () => {
    expect(getSlowQuerySeverity(1000)).toBe('critical');
    expect(getSlowQuerySeverity(300)).toBe('slow');
    expect(getSlowQuerySeverity(299)).toBe('normal');
    expect(isWinThorTable('PCPEDC')).toBe(true);
    expect(isWinThorTable('pcp')).toBe(false);
    expect(isWinThorTable('SELECT')).toBe(false);
  });
});
