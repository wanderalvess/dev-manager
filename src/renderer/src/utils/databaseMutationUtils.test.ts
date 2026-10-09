import { describe, expect, it } from 'vitest';
import type { QueryResult, TableColumnInfo } from '../../../shared/types';
import { buildCsvContent, buildJsonContent } from './databaseExportUtils';
import { processQueryRows } from './databaseResultsUtils';
import {
  attachRowIds,
  getRowKeyColumns,
  lacksPrimaryKey,
  parseSingleTableSelect,
  isNullSigil,
  looksNumericType,
  castEditedValue,
  buildEmptyRowDraft,
  draftToInsertValues
} from './databaseMutationUtils';

const makeColumn = (overrides: Partial<TableColumnInfo>): TableColumnInfo => ({
  name: 'col',
  type: 'VARCHAR2(50)',
  ...overrides
});

describe('getRowKeyColumns', () => {
  it('usa apenas as colunas marcadas como chave primária quando existem', () => {
    const columns = [
      makeColumn({ name: 'ID', isPrimaryKey: true }),
      makeColumn({ name: 'NOME' }),
      makeColumn({ name: 'FILIAL', isPrimaryKey: true })
    ];
    expect(getRowKeyColumns(columns)).toEqual(['ID', 'FILIAL']);
  });

  it('cai para todas as colunas quando a tabela não tem PK identificada', () => {
    const columns = [makeColumn({ name: 'NOME' }), makeColumn({ name: 'EMAIL' })];
    expect(getRowKeyColumns(columns)).toEqual(['NOME', 'EMAIL']);
  });
});

describe('parseSingleTableSelect', () => {
  it('reconhece SELECT * FROM tabela simples, com ROWNUM (Oracle) ou LIMIT (Postgres/MySQL)', () => {
    expect(parseSingleTableSelect('SELECT * FROM CLIENTES')).toBe('CLIENTES');
    expect(parseSingleTableSelect('select * from clientes WHERE ROWNUM <= 100')).toBe('clientes');
    expect(parseSingleTableSelect('SELECT * FROM public.clientes LIMIT 100;')).toBe('public.clientes');
    expect(parseSingleTableSelect('  SELECT   *   FROM   TAB$1  ')).toBe('TAB$1');
  });

  it('rejeita joins, agregações, subqueries e filtros arbitrários', () => {
    expect(parseSingleTableSelect('SELECT * FROM a JOIN b ON a.id = b.id')).toBeNull();
    expect(parseSingleTableSelect('SELECT COUNT(*) FROM clientes')).toBeNull();
    expect(parseSingleTableSelect('SELECT * FROM clientes WHERE nome = \'Ana\'')).toBeNull();
    expect(parseSingleTableSelect('SELECT id, nome FROM clientes')).toBeNull();
    expect(parseSingleTableSelect('')).toBeNull();
  });
});

describe('isNullSigil / looksNumericType / castEditedValue', () => {
  it('reconhece o sigilo [NULL] sem diferenciar maiúsculas/minúsculas ou espaços', () => {
    expect(isNullSigil('[NULL]')).toBe(true);
    expect(isNullSigil(' [null] ')).toBe(true);
    expect(isNullSigil('texto')).toBe(false);
  });

  it('detecta tipos numéricos a partir do texto de tipo retornado pelo banco', () => {
    expect(looksNumericType('NUMBER(10,2)')).toBe(true);
    expect(looksNumericType('integer')).toBe(true);
    expect(looksNumericType('int(11)')).toBe(true);
    expect(looksNumericType('VARCHAR2(50)')).toBe(false);
    expect(looksNumericType(undefined)).toBe(false);
  });

  it('converte o texto editado considerando NULL, tipo numérico e texto puro', () => {
    const numCol = makeColumn({ name: 'IDADE', type: 'NUMBER(3)' });
    const textCol = makeColumn({ name: 'NOME', type: 'VARCHAR2(50)' });

    expect(castEditedValue('[NULL]', numCol)).toBeNull();
    expect(castEditedValue('30', numCol)).toBe(30);
    expect(castEditedValue('Ana', textCol)).toBe('Ana');
    expect(castEditedValue('abc', numCol)).toBe('abc');
  });
});

describe('buildEmptyRowDraft / draftToInsertValues', () => {
  it('monta um rascunho vazio com uma chave por coluna', () => {
    const columns = [makeColumn({ name: 'ID' }), makeColumn({ name: 'NOME' })];
    expect(buildEmptyRowDraft(columns)).toEqual({ ID: '', NOME: '' });
  });

  it('descarta campos em branco e converte tipos numéricos ao montar os valores do INSERT', () => {
    const columns = [
      makeColumn({ name: 'ID', type: 'NUMBER' }),
      makeColumn({ name: 'NOME', type: 'VARCHAR2(50)' }),
      makeColumn({ name: 'OBS', type: 'VARCHAR2(200)' })
    ];
    const draft = { ID: '42', NOME: 'Ana', OBS: '' };
    expect(draftToInsertValues(draft, columns)).toEqual({ ID: 42, NOME: 'Ana' });
  });
});

describe('ROWID/ctid sem PK', () => {
  const noPk = [makeColumn({ name: 'NOME' }), makeColumn({ name: 'EMAIL' })];

  it('getRowKeyColumns prefere PK, depois ROWID, depois todas as colunas', () => {
    expect(getRowKeyColumns(noPk, true)).toEqual(['__ROWID__']);
    expect(getRowKeyColumns([makeColumn({ name: 'ID', isPrimaryKey: true })], true)).toEqual(['ID']);
    expect(getRowKeyColumns(noPk)).toEqual(['NOME', 'EMAIL']);
  });

  it('lacksPrimaryKey ignora tabela de colunas desconhecidas', () => {
    expect(lacksPrimaryKey(noPk)).toBe(true);
    expect(lacksPrimaryKey([])).toBe(false);
    expect(lacksPrimaryKey([makeColumn({ name: 'ID', isPrimaryKey: true })])).toBe(false);
  });

  it('o ROWID não aparece no grid, na busca, no CSV nem no JSON, mas continua legível por linha', () => {
    const raw: QueryResult = {
      success: true,
      isQuery: true,
      columns: ['__ROWID__', 'NOME', 'EMAIL'],
      rows: [{ __ROWID__: 'AAAR3sAAEAAAACXAAA', NOME: 'Ana', EMAIL: 'a@x.com' }],
      rowCount: 1,
      executionTimeMs: 1
    };
    const res = attachRowIds(raw);

    expect(res.columns).toEqual(['NOME', 'EMAIL']);
    expect(Object.keys(res.rows[0])).toEqual(['NOME', 'EMAIL']);
    expect(JSON.stringify(res.rows[0])).not.toContain('AAAR3s');
    expect(res.rows[0].__ROWID__).toBe('AAAR3sAAEAAAACXAAA');

    // grid: busca global por parte do ROWID não acha a linha; ordenação mantém a referência da linha
    expect(processQueryRows(res, { searchTerm: 'AAAR3s' })).toHaveLength(0);
    expect(processQueryRows(res, { searchTerm: 'Ana' })[0].__ROWID__).toBe('AAAR3sAAEAAAACXAAA');

    // exportação
    expect(buildCsvContent(res.columns, res.rows)).not.toContain('ROWID');
    expect(buildCsvContent(res.columns, res.rows)).not.toContain('AAAR3s');
    expect(buildJsonContent(res.columns, res.rows)).not.toContain('AAAR3s');
  });

  it('resultado sem a pseudo-coluna passa intacto', () => {
    const res: QueryResult = { success: true, isQuery: true, columns: ['A'], rows: [{ A: 1 }], rowCount: 1, executionTimeMs: 1 };
    expect(attachRowIds(res)).toBe(res);
  });
});
