import { describe, expect, it, vi } from 'vitest';
import {
  buildEvidenceBinds,
  countEvidence,
  formatBindDate,
  nextPollDelay,
  pollEvidence,
  usedBindNames,
  validateEvidenceSql,
  type EvidenceQueryResult
} from './sqlEvidence';

describe('sqlEvidence: binds', () => {
  it('formata a data local como AAAA-MM-DD HH:MM:SS', () => {
    expect(formatBindDate(new Date(2026, 9, 25, 7, 5, 9).getTime())).toBe('2026-10-25 07:05:09');
  });

  it('usedBindNames ignora comentários, literais e casts do Postgres', () => {
    const sql = `select * from venda -- :comentario
      where lote = :LOTE and obs = ':literal' and dt >= :inicio::timestamp /* :bloco */ and x::int = 1`;
    expect([...usedBindNames(sql)].sort()).toEqual(['inicio', 'lote']);
  });

  it('só envia os binds que a consulta usa, com :lote sempre como texto', () => {
    const ctx = { batchNumber: '48213', startMs: new Date(2026, 0, 2, 3, 4, 5).getTime(), endMs: new Date(2026, 0, 2, 4, 4, 5).getTime() };
    expect(buildEvidenceBinds('select count(*) from t where lote = :lote', ctx)).toEqual({ lote: '48213' });
    expect(buildEvidenceBinds('select 1 from t where d between :inicio and :fim', ctx)).toEqual({
      inicio: '2026-01-02 03:04:05',
      fim: '2026-01-02 04:04:05'
    });
    expect(buildEvidenceBinds('select 1 from dual', ctx)).toEqual({});
  });

  it('valor de :lote com aspas continua sendo só um texto (a interpolação escapa)', () => {
    const binds = buildEvidenceBinds('select 1 from t where lote = :lote', { batchNumber: "1'; drop table t;--", startMs: 0, endMs: 0 });
    expect(binds.lote).toBe("1'; drop table t;--");
  });
});

describe('validateEvidenceSql', () => {
  it('aceita SELECT e WITH, recusa vazio e escrita', () => {
    expect(validateEvidenceSql('select 1 from dual')).toBeNull();
    expect(validateEvidenceSql('with a as (select 1) select * from a')).toBeNull();
    expect(validateEvidenceSql('   ')).toContain('não está configurada');
    expect(validateEvidenceSql(undefined)).toContain('não está configurada');
    expect(validateEvidenceSql('delete from venda')).toContain('somente leitura');
    expect(validateEvidenceSql('select 1; delete from venda')).toContain('somente leitura');
  });
});

describe('countEvidence', () => {
  it('count(*) usa o valor da primeira coluna; outras consultas contam as linhas', () => {
    expect(countEvidence('select count(*) as total from t', [{ total: 12 }])).toBe(12);
    expect(countEvidence('SELECT COUNT (1) FROM t', [{ c: '7' }])).toBe(7);
    expect(countEvidence('select count(*) from t', [{ c: 0 }])).toBe(0);
    expect(countEvidence('select count(*) from t', [{ c: null }])).toBe(0);
    expect(countEvidence('select id from t', [{ id: 99 }, { id: 100 }])).toBe(2);
    expect(countEvidence('select id from t', [])).toBe(0);
  });
});

describe('pollEvidence', () => {
  const makeDeps = (results: EvidenceQueryResult[]) => {
    let clock = 0;
    const run = vi.fn(async () => results[Math.min(run.mock.calls.length - 1, results.length - 1)]);
    return {
      run,
      deps: {
        now: () => clock,
        sleep: async (ms: number) => {
          clock += ms;
        },
        run
      }
    };
  };

  it('espera crescente de 1 s até o teto de 5 s', () => {
    expect([1, 2, 3, 4, 5, 6, 20].map(nextPollDelay)).toEqual([1000, 2000, 3000, 4000, 5000, 5000, 5000]);
  });

  it('acha na primeira tentativa sem esperar', async () => {
    const { deps } = makeDeps([{ success: true, rows: [{ c: 3 }] }]);
    expect(await pollEvidence('select count(*) from t', 60, deps)).toEqual({ status: 'found', count: 3, attempts: 1, elapsedMs: 0 });
  });

  it('repete até o dado descer e informa quanto esperou', async () => {
    const { deps, run } = makeDeps([
      { success: true, rows: [{ c: 0 }] },
      { success: true, rows: [{ c: 0 }] },
      { success: true, rows: [{ c: 5 }] }
    ]);
    const outcome = await pollEvidence('select count(*) from t', 60, deps);
    expect(outcome).toEqual({ status: 'found', count: 5, attempts: 3, elapsedMs: 3000 });
    expect(run).toHaveBeenCalledTimes(3);
  });

  it('não achou dentro da espera: para antes de estourar o prazo', async () => {
    const { deps, run } = makeDeps([{ success: true, rows: [] }]);
    const outcome = await pollEvidence('select id from t', 6, deps);
    expect(outcome.status).toBe('not-found');
    expect(outcome.elapsedMs).toBeLessThanOrEqual(6000);
    expect(run.mock.calls.length).toBe(outcome.attempts);
  });

  it('espera zero faz uma única tentativa', async () => {
    const { deps, run } = makeDeps([{ success: true, rows: [] }]);
    expect(await pollEvidence('select id from t', 0, deps)).toMatchObject({ status: 'not-found', attempts: 1 });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('erro de SQL interrompe na hora, sem repetir', async () => {
    const { deps, run } = makeDeps([{ success: false, rows: [], error: 'tabela inexistente' }]);
    expect(await pollEvidence('select 1 from nada', 60, deps)).toMatchObject({ status: 'error', error: 'tabela inexistente', attempts: 1 });
    expect(run).toHaveBeenCalledTimes(1);
  });
});
