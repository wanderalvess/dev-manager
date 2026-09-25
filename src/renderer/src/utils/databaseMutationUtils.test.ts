import { describe, expect, it } from 'vitest';
import type { TableColumnInfo } from '../../../shared/types';
import {
  getRowKeyColumns,
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
