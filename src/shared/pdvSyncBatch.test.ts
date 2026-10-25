import { describe, expect, it } from 'vitest';
import {
  describeStatus,
  matchEnvironment,
  normalizeStatusCode,
  PDVSYNC_ENVIRONMENTS,
  PDVSYNC_STATUS
} from './pdvSyncBatch';

describe('normalizeStatusCode', () => {
  it('aceita número, texto e decimal que o PDVSync devolve', () => {
    expect(normalizeStatusCode(5)).toBe(5);
    expect(normalizeStatusCode('5')).toBe(5);
    expect(normalizeStatusCode('5.0')).toBe(5);
    expect(normalizeStatusCode(' 9 ')).toBe(9);
    expect(normalizeStatusCode(0)).toBe(0);
  });

  it('recusa o que não é um código', () => {
    for (const bad of [undefined, null, '', '  ', 'abc', 5.5, '5.5', -1, true, {}, [], NaN]) {
      expect(normalizeStatusCode(bad)).toBeUndefined();
    }
  });
});

describe('describeStatus', () => {
  it('traduz os dez códigos conhecidos', () => {
    expect(Object.keys(PDVSYNC_STATUS)).toHaveLength(10);
    expect(describeStatus(5)).toEqual({ name: 'BaixadoComSucesso', kind: 'downloaded' });
    expect(describeStatus(6).kind).toBe('error');
    expect(describeStatus(0).kind).toBe('preparing');
    expect(describeStatus(2).kind).toBe('available');
    expect(describeStatus(4).kind).toBe('downloading');
  });

  it('código fora da tabela ou ausente vira desconhecido, sem quebrar', () => {
    expect(describeStatus(42)).toEqual({ name: 'status 42', kind: 'unknown' });
    expect(describeStatus(undefined)).toEqual({ name: 'sem status', kind: 'unknown' });
  });
});

describe('ambientes', () => {
  it('os atalhos são https e terminam nas rotas do contrato', () => {
    for (const env of PDVSYNC_ENVIRONMENTS) {
      expect(env.batchStatusUrl).toMatch(/^https:\/\/.+\/LoteExternoRetornos$/);
      expect(env.storeStatusUrl).toMatch(/^https:\/\/.+\/LojaLoteStatusretorno$/);
    }
  });

  it('reconhece o ambiente pelos endereços e devolve vazio para os personalizados', () => {
    const [producao, homologacao] = PDVSYNC_ENVIRONMENTS;
    expect(matchEnvironment(producao.batchStatusUrl, producao.storeStatusUrl)).toBe('producao');
    expect(matchEnvironment(homologacao.batchStatusUrl, homologacao.storeStatusUrl)).toBe('homologacao');
    expect(matchEnvironment('http://localhost:9000/lote', producao.storeStatusUrl)).toBeUndefined();
    expect(matchEnvironment(undefined, undefined)).toBeUndefined();
  });
});
