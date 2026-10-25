import { describe, expect, it } from 'vitest';
import type { IntegrationLayerReadiness, IntegrationReadinessResult } from '../../../shared/integrationTypes';
import { describeReadiness, formatCheckDuration, formatCheckedAgo } from './integrationReadinessView';

const result = (...statuses: IntegrationLayerReadiness['status'][]): IntegrationReadinessResult => ({
  checkedAt: 1,
  layers: statuses.map((status, index) => ({ layer: (['winthor', 'wsh', 'ch', 'pdv'] as const)[index], status, checks: [] }))
});

describe('describeReadiness', () => {
  it('sem resultado convida a conferir', () => {
    expect(describeReadiness(null)).toMatchObject({ tone: 'muted', title: 'Ainda não conferido' });
  });

  it('nenhuma camada configurada é neutro e manda para as Configurações', () => {
    const verdict = describeReadiness(result('not-configured', 'not-configured', 'not-configured', 'not-configured'));
    expect(verdict).toMatchObject({ tone: 'muted', title: 'Nenhuma camada configurada' });
  });

  it('uma falha nomeia a camada pelo nome curto', () => {
    expect(describeReadiness(result('ok', 'ok', 'failed', 'ok'))).toEqual({
      tone: 'danger',
      title: 'CH com falha',
      detail: 'Resolva antes de testar: CH.'
    });
  });

  it('várias falhas viram contagem e lista com "e"', () => {
    const verdict = describeReadiness(result('failed', 'failed', 'ok', 'failed'));
    expect(verdict.title).toBe('3 camadas com falha');
    expect(verdict.detail).toBe('Resolva antes de testar: WinThor, WSH e PDV.');
  });

  it('falha pesa mais que aviso; aviso sozinho não bloqueia', () => {
    expect(describeReadiness(result('warning', 'failed', 'ok', 'ok')).tone).toBe('danger');
    expect(describeReadiness(result('warning', 'ok', 'not-configured', 'ok'))).toMatchObject({
      tone: 'warning',
      title: 'Pronto, com avisos',
      detail: expect.stringContaining('WinThor')
    });
  });

  it('tudo ok conta só as camadas verificadas', () => {
    expect(describeReadiness(result('ok', 'ok', 'not-configured', 'ok'))).toEqual({
      tone: 'success',
      title: 'Pronto para testar',
      detail: '3 de 4 camadas verificadas, nenhuma falha.'
    });
  });
});

describe('formatos', () => {
  it('duração em ms ou segundos com vírgula', () => {
    expect(formatCheckDuration(undefined)).toBe('');
    expect(formatCheckDuration(340)).toBe('340 ms');
    expect(formatCheckDuration(1800)).toBe('1,8 s');
  });

  it('tempo desde o pré-voo', () => {
    expect(formatCheckedAgo(1000, 2000)).toBe('agora há pouco');
    expect(formatCheckedAgo(0, 30_000)).toBe('há 30 s');
    expect(formatCheckedAgo(0, 5 * 60_000)).toBe('há 5 min');
    expect(formatCheckedAgo(0, 3 * 3_600_000)).toBe('há 3 h');
    expect(formatCheckedAgo(5000, 1000)).toBe('agora há pouco');
  });
});
