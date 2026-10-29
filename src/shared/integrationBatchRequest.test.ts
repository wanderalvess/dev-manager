import { describe, expect, it } from 'vitest';
import { validateBatchRequest } from './integrationBatchRequest';

describe('validateBatchRequest', () => {
  it('aceita lote numérico e usa a janela padrão de 120 min', () => {
    expect(validateBatchRequest({ flowId: ' venda ', batchNumber: ' 48213 ' })).toEqual({
      ok: true,
      value: { flowId: 'venda', batchNumber: '48213', lookbackMinutes: 120 }
    });
  });

  it('aceita prefixo e separadores comuns de identificador', () => {
    for (const batchNumber of ['LOTE-2026/10.25', 'A_1']) {
      expect(validateBatchRequest({ flowId: 'f', batchNumber }).ok).toBe(true);
    }
  });

  it('exige fluxo e lote, inclusive quando a entrada nem é objeto', () => {
    expect(validateBatchRequest({ batchNumber: '1' })).toEqual({ ok: false, error: 'Escolha o fluxo a rastrear.' });
    expect(validateBatchRequest({ flowId: 'f', batchNumber: '  ' })).toEqual({ ok: false, error: 'Informe o número do lote.' });
    expect(validateBatchRequest(null).ok).toBe(false);
    expect(validateBatchRequest({ flowId: 5 as never, batchNumber: 1 as never }).ok).toBe(false);
  });

  it('recusa lote com espaço, aspas, ponto e vírgula ou longo demais', () => {
    for (const batchNumber of ["1' or '1'='1", '1; drop', 'a b', '48\n213', 'x'.repeat(65)]) {
      expect(validateBatchRequest({ flowId: 'f', batchNumber }).ok).toBe(false);
    }
  });

  it('filial é opcional: vazia some, válida é aparada e inválida é recusada', () => {
    const run = (branchId: unknown) => validateBatchRequest({ flowId: 'f', batchNumber: '1', branchId: branchId as string });

    expect(run(undefined)).toEqual({ ok: true, value: { flowId: 'f', batchNumber: '1', lookbackMinutes: 120 } });
    expect(run('   ')).toEqual({ ok: true, value: { flowId: 'f', batchNumber: '1', lookbackMinutes: 120 } });
    expect(run(' 12 ')).toEqual({ ok: true, value: { flowId: 'f', batchNumber: '1', lookbackMinutes: 120, branchId: '12' } });
    expect(run("1' or '1'='1").ok).toBe(false);
    expect(run('x'.repeat(33)).ok).toBe(false);
    expect(run(5).ok).toBe(true); // número fora do contrato é ignorado, não vira filial
  });

  it('janela: valor válido vale, o teto é de 7 dias e lixo volta ao padrão', () => {
    const lookback = (value: unknown) => {
      const result = validateBatchRequest({ flowId: 'f', batchNumber: '1', lookbackMinutes: value as number });
      return result.ok ? result.value.lookbackMinutes : null;
    };
    expect(lookback(30)).toBe(30);
    expect(lookback(45.9)).toBe(45);
    expect(lookback(999999)).toBe(10080);
    expect(lookback(0)).toBe(120);
    expect(lookback(-5)).toBe(120);
    expect(lookback(Number.NaN)).toBe(120);
    expect(lookback('60')).toBe(120);
  });
});
