import { describe, expect, it, vi } from 'vitest';
import {
  EMPTY_PENDING,
  applyPendingChanges,
  isRowDeleted,
  pendingCount,
  pendingValuesOf,
  removeInsert,
  rowKeyOf,
  stageCellChange,
  stageDelete,
  stageInsert,
  type PendingExecutor
} from './gridPendingChanges';

const rowA = { ID: 1, NOME: 'Ana', ATIVO: 'S' };
const rowB = { ID: 2, NOME: 'Bia', ATIVO: 'N' };
const KEY = ['ID'];

describe('stageCellChange', () => {
  it('acumula várias células da mesma linha em um único UPDATE', () => {
    let p = stageCellChange(EMPTY_PENDING, rowA, KEY, 'NOME', 'Ana Maria');
    p = stageCellChange(p, rowA, KEY, 'ATIVO', 'N');
    expect(p.updates).toHaveLength(1);
    expect(p.updates[0]).toMatchObject({ where: { ID: 1 }, changes: { NOME: 'Ana Maria', ATIVO: 'N' } });
    expect(pendingCount(p)).toBe(1);
  });

  it('linhas diferentes viram UPDATEs diferentes e a identidade vem da chave', () => {
    let p = stageCellChange(EMPTY_PENDING, rowA, KEY, 'NOME', 'X');
    p = stageCellChange(p, rowB, KEY, 'NOME', 'Y');
    expect(p.updates.map((u) => u.where)).toEqual([{ ID: 1 }, { ID: 2 }]);
    expect(rowKeyOf(rowA, KEY)).toBe('[1]');
  });

  it('voltar ao valor original remove a alteração (e o UPDATE vazio)', () => {
    let p = stageCellChange(EMPTY_PENDING, rowA, KEY, 'NOME', 'Outro');
    p = stageCellChange(p, rowA, KEY, 'NOME', 'Ana');
    expect(p.updates).toEqual([]);
    expect(pendingCount(p)).toBe(0);
  });

  it('alterar só uma de duas colunas editadas mantém o UPDATE com a restante', () => {
    let p = stageCellChange(EMPTY_PENDING, rowA, KEY, 'NOME', 'Outro');
    p = stageCellChange(p, rowA, KEY, 'ATIVO', 'N');
    p = stageCellChange(p, rowA, KEY, 'NOME', 'Ana');
    expect(p.updates[0].changes).toEqual({ ATIVO: 'N' });
  });

  it('NULL é diferente de texto vazio', () => {
    const withNull = { ID: 3, OBS: null };
    expect(stageCellChange(EMPTY_PENDING, withNull, KEY, 'OBS', '').updates).toHaveLength(1);
    expect(stageCellChange(EMPTY_PENDING, withNull, KEY, 'OBS', null).updates).toHaveLength(0);
  });

  it('linha marcada para exclusão ignora edições', () => {
    const p = stageDelete(EMPTY_PENDING, rowA, KEY);
    expect(stageCellChange(p, rowA, KEY, 'NOME', 'X')).toBe(p);
  });

  it('o estado anterior não é alterado', () => {
    const before = stageCellChange(EMPTY_PENDING, rowA, KEY, 'NOME', 'X');
    stageCellChange(before, rowA, KEY, 'ATIVO', 'N');
    expect(before.updates[0].changes).toEqual({ NOME: 'X' });
    expect(EMPTY_PENDING.updates).toEqual([]);
  });
});

describe('stageDelete / inserts', () => {
  it('marca e desmarca a exclusão; excluir descarta as edições da linha', () => {
    let p = stageCellChange(EMPTY_PENDING, rowA, KEY, 'NOME', 'X');
    p = stageDelete(p, rowA, KEY);
    expect(p.updates).toEqual([]);
    expect(isRowDeleted(p, rowA, KEY)).toBe(true);
    expect(isRowDeleted(p, rowB, KEY)).toBe(false);
    p = stageDelete(p, rowA, KEY);
    expect(isRowDeleted(p, rowA, KEY)).toBe(false);
    expect(pendingCount(p)).toBe(0);
  });

  it('insere e remove linhas pendentes por índice', () => {
    let p = stageInsert(EMPTY_PENDING, { NOME: 'Nova' });
    p = stageInsert(p, { NOME: 'Outra' });
    expect(pendingCount(p)).toBe(2);
    p = removeInsert(p, 0);
    expect(p.inserts).toEqual([{ NOME: 'Outra' }]);
  });

  it('pendingValuesOf devolve só os valores da linha editada', () => {
    const p = stageCellChange(EMPTY_PENDING, rowA, KEY, 'NOME', 'X');
    expect(pendingValuesOf(p, rowA, KEY)).toEqual({ NOME: 'X' });
    expect(pendingValuesOf(p, rowB, KEY)).toBeUndefined();
  });
});

describe('applyPendingChanges', () => {
  const makeExec = (over: Partial<PendingExecutor> = {}) => {
    const calls: string[] = [];
    const exec: PendingExecutor = {
      update: vi.fn(async (where, changes) => (calls.push(`U${JSON.stringify(where)}${JSON.stringify(changes)}`), { success: true, affectedRows: 1 })),
      remove: vi.fn(async (where) => (calls.push(`D${JSON.stringify(where)}`), { success: true, affectedRows: 1 })),
      insert: vi.fn(async (values) => (calls.push(`I${JSON.stringify(values)}`), { success: true })),
      ...over
    };
    return { exec, calls };
  };

  const full = () => {
    let p = stageCellChange(EMPTY_PENDING, rowA, KEY, 'NOME', 'X');
    p = stageDelete(p, rowB, KEY);
    return stageInsert(p, { NOME: 'Nova' });
  };

  it('aplica na ordem UPDATE, DELETE, INSERT e zera os pendentes', async () => {
    const { exec, calls } = makeExec();
    const out = await applyPendingChanges(full(), exec);
    expect(calls).toEqual(['U{"ID":1}{"NOME":"X"}', 'D{"ID":2}', 'I{"NOME":"Nova"}']);
    expect(out.applied).toBe(3);
    expect(out.failure).toBeUndefined();
    expect(pendingCount(out.remaining)).toBe(0);
  });

  it('para no primeiro erro: o aplicado sai da lista e o resto continua pendente', async () => {
    const { exec } = makeExec({ remove: vi.fn(async () => ({ success: false, error: 'ORA-02292: filhos' })) });
    const out = await applyPendingChanges(full(), exec);
    expect(out.applied).toBe(1);
    expect(out.failure).toEqual({ description: 'DELETE', error: 'ORA-02292: filhos' });
    expect(out.remaining.updates).toEqual([]);
    expect(out.remaining.deletes).toHaveLength(1);
    expect(out.remaining.inserts).toHaveLength(1);
    expect(exec.insert).not.toHaveBeenCalled();
  });

  it('UPDATE que afetou mais de uma linha vira falha explícita e interrompe', async () => {
    const { exec } = makeExec({ update: vi.fn(async () => ({ success: true, affectedRows: 3 })) });
    const out = await applyPendingChanges(full(), exec);
    expect(out.failure?.error).toMatch(/afetou 3 registros/);
    expect(exec.remove).not.toHaveBeenCalled();
    expect(out.remaining.updates).toEqual([]);
  });

  it('sem pendências não executa nada', async () => {
    const { exec } = makeExec();
    const out = await applyPendingChanges(EMPTY_PENDING, exec);
    expect(out).toEqual({ applied: 0, remaining: EMPTY_PENDING });
    expect(exec.update).not.toHaveBeenCalled();
  });
});
