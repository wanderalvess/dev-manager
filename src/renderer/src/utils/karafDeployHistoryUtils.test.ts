import { describe, it, expect } from 'vitest';
import type { KarafDeployHistoryEntry } from '../../../shared/types';
import {
  buildKarafDeployMvnCoords,
  computeKarafDeployStats,
  filterKarafDeployHistory
} from './karafDeployHistoryUtils';

const make = (over: Partial<KarafDeployHistoryEntry>): KarafDeployHistoryEntry => ({
  id: '1',
  repoUrl: '',
  featureInstall: 'feat-a',
  success: true,
  startedAt: '2026-01-01T00:00:00Z',
  durationMs: 1000,
  trigger: 'ui',
  ...over
});

describe('computeKarafDeployStats', () => {
  it('retorna valores neutros para historico vazio', () => {
    expect(computeKarafDeployStats([])).toEqual({
      total: 0,
      successes: 0,
      failures: 0,
      successRate: 100,
      avgDuration: '0.0',
      mcpCount: 0,
      uiCount: 0
    });
  });

  it('agrega sucessos, falhas, origem e duracao media', () => {
    const stats = computeKarafDeployStats([
      make({ id: '1', durationMs: 1000 }),
      make({ id: '2', success: false, trigger: 'mcp', durationMs: 2000 }),
      make({ id: '3', trigger: 'mcp', durationMs: 3000 })
    ]);
    expect(stats.total).toBe(3);
    expect(stats.successes).toBe(2);
    expect(stats.failures).toBe(1);
    expect(stats.successRate).toBe(67);
    expect(stats.avgDuration).toBe('2.0');
    expect(stats.mcpCount).toBe(2);
    expect(stats.uiCount).toBe(1);
  });
});

describe('filterKarafDeployHistory', () => {
  const history = [
    make({ id: '1', artifactId: 'core-api', version: '1.0.0' }),
    make({ id: '2', success: false, trigger: 'mcp', message: 'Erro de compilacao' }),
    make({ id: '3', projectName: 'Portal', repoUrl: 'http://repo/x', trigger: 'mcp' })
  ];

  it('filtra por status e origem', () => {
    expect(filterKarafDeployHistory(history, 'SUCCESS', '').map((e) => e.id)).toEqual(['1', '3']);
    expect(filterKarafDeployHistory(history, 'FAILURE', '').map((e) => e.id)).toEqual(['2']);
    expect(filterKarafDeployHistory(history, 'MCP', '').map((e) => e.id)).toEqual(['2', '3']);
    expect(filterKarafDeployHistory(history, 'UI', '').map((e) => e.id)).toEqual(['1']);
  });

  it('busca sem diferenciar maiusculas em varios campos', () => {
    expect(filterKarafDeployHistory(history, 'ALL', '  CORE ').map((e) => e.id)).toEqual(['1']);
    expect(filterKarafDeployHistory(history, 'ALL', 'compilacao').map((e) => e.id)).toEqual(['2']);
    expect(filterKarafDeployHistory(history, 'ALL', 'repo/x').map((e) => e.id)).toEqual(['3']);
  });

  it('combina filtro e busca', () => {
    expect(filterKarafDeployHistory(history, 'UI', 'portal')).toEqual([]);
  });
});

describe('buildKarafDeployMvnCoords', () => {
  it('monta coordenadas mvn quando ha group, artifact e versao', () => {
    expect(buildKarafDeployMvnCoords(make({ groupId: 'g', artifactId: 'a', version: '1' }))).toBe('mvn:g/a/1');
  });

  it('usa featureInstall como fallback', () => {
    expect(buildKarafDeployMvnCoords(make({ artifactId: 'a' }))).toBe('feat-a');
  });
});
