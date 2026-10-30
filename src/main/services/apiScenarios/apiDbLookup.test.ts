import { describe, expect, it, vi } from 'vitest';
import type { ApiRule } from '../../../shared/apiScenarioTypes';
import { lookupDbValue, type RunDbQuery } from './apiDbLookup';

const rule = (partial: Partial<ApiRule>): ApiRule => ({
  id: 'r',
  kind: 'db',
  path: '$.nome',
  operator: 'equals',
  connectionId: 'oracle-hml',
  sql: 'SELECT FANTASIA FROM PCFILIAL WHERE CODIGO = :valor',
  bindPath: '$.codigo',
  ...partial
});
const json = { codigo: '1', nome: 'Matriz', itens: [1] };
const note = () => {};

describe('lookupDbValue', () => {
  it('passa o campo da resposta como :valor e devolve a primeira coluna da primeira linha', async () => {
    const runQuery = vi.fn<RunDbQuery>(async () => ({ success: true, rows: [{ FANTASIA: 'Matriz' }, { FANTASIA: 'Outra' }] }));
    expect(await lookupDbValue(rule({}), json, runQuery, note)).toEqual({ value: 'Matriz' });
    expect(runQuery).toHaveBeenCalledWith('oracle-hml', 'SELECT FANTASIA FROM PCFILIAL WHERE CODIGO = :valor', { valor: '1' });
  });

  it('consulta sem :valor não manda bind', async () => {
    const runQuery = vi.fn<RunDbQuery>(async () => ({ success: true, rows: [{ TOTAL: 2 }] }));
    await lookupDbValue(rule({ sql: 'SELECT COUNT(*) TOTAL FROM PCFILIAL', bindPath: '' }), json, runQuery, note);
    expect(runQuery.mock.calls[0][2]).toEqual({});
  });

  it('recusa consulta que escreve, mesmo vinda do arquivo editado à mão', async () => {
    const runQuery = vi.fn<RunDbQuery>();
    expect(await lookupDbValue(rule({ sql: 'DELETE FROM PCFILIAL' }), json, runQuery, note)).toEqual({ problem: 'a consulta precisa ser somente leitura (SELECT)' });
    expect(runQuery).not.toHaveBeenCalled();
  });

  it(':valor sem campo simples na resposta, conexão apagada, erro e nenhuma linha viram problema', async () => {
    const ok = vi.fn<RunDbQuery>(async () => ({ success: true, rows: [] }));
    expect(await lookupDbValue(rule({ bindPath: '$.itens' }), json, ok, note)).toMatchObject({ problem: expect.stringContaining('não tem um valor simples') });
    expect(await lookupDbValue(rule({}), json, async () => null, note)).toMatchObject({ problem: expect.stringContaining('conexão') });
    expect(await lookupDbValue(rule({}), json, async () => ({ success: false, rows: [], error: 'ORA-00942' }), note)).toEqual({ problem: 'a consulta falhou: ORA-00942' });
    expect(await lookupDbValue(rule({}), json, ok, note)).toEqual({ problem: 'a consulta não devolveu nenhuma linha' });
    expect(await lookupDbValue(rule({}), json, undefined, note)).toEqual({ problem: 'banco indisponível neste modo' });
  });
});
