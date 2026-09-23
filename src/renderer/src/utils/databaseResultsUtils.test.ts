import { describe, expect, it } from 'vitest';
import { detectColumnDataTypes, processQueryRows, hasActiveQueryFilters } from './databaseResultsUtils';
import type { QueryResult } from '../../../shared/types';

function makeResult(columns: string[], rows: Record<string, any>[]): Pick<QueryResult, 'columns' | 'rows'> {
  return { columns, rows };
}

describe('detectColumnDataTypes', () => {
  it('detecta coluna numérica a partir do primeiro valor não vazio', () => {
    const types = detectColumnDataTypes(['id'], [{ id: null }, { id: 42 }, { id: 'ignora depois do achado' }]);
    expect(types.id).toBe('number');
  });

  it('detecta número representado como string', () => {
    const types = detectColumnDataTypes(['valor'], [{ valor: '123.45' }]);
    expect(types.valor).toBe('number');
  });

  it('detecta data em formato ISO e em formato BR', () => {
    expect(detectColumnDataTypes(['d'], [{ d: '2026-09-23T10:00:00' }]).d).toBe('date');
    expect(detectColumnDataTypes(['d'], [{ d: '23/09/2026' }]).d).toBe('date');
  });

  it('detecta instância de Date como date, distinta de object genérico', () => {
    expect(detectColumnDataTypes(['d'], [{ d: new Date() }]).d).toBe('date');
    expect(detectColumnDataTypes(['o'], [{ o: { nested: true } }]).o).toBe('object');
  });

  it('detecta boolean', () => {
    expect(detectColumnDataTypes(['ativo'], [{ ativo: true }]).ativo).toBe('boolean');
  });

  it('assume string quando todas as linhas têm valor vazio/nulo', () => {
    expect(detectColumnDataTypes(['x'], [{ x: null }, { x: undefined }, { x: '' }]).x).toBe('string');
  });

  it('texto comum permanece string', () => {
    expect(detectColumnDataTypes(['nome'], [{ nome: 'Wanderson' }]).nome).toBe('string');
  });
});

describe('processQueryRows', () => {
  const result = makeResult(
    ['id', 'nome', 'ativo'],
    [
      { id: 3, nome: 'Carlos', ativo: null },
      { id: 1, nome: 'Ana', ativo: true },
      { id: 2, nome: 'Bruno', ativo: false }
    ]
  );

  it('retorna array vazio quando não há queryResult', () => {
    expect(processQueryRows(null)).toEqual([]);
    expect(processQueryRows(undefined)).toEqual([]);
  });

  it('sem opções, devolve uma cópia das linhas na ordem original (não muta o original)', () => {
    const processed = processQueryRows(result);
    expect(processed).toEqual(result.rows);
    expect(processed).not.toBe(result.rows);
  });

  it('busca global filtra por qualquer coluna, case-insensitive', () => {
    const processed = processQueryRows(result, { searchTerm: 'bruno' });
    expect(processed.map((r) => r.nome)).toEqual(['Bruno']);
  });

  it('filtro por coluna aceita "[null]" para valores nulos/indefinidos', () => {
    const processed = processQueryRows(result, { columnFilters: { ativo: '[null]' } });
    expect(processed.map((r) => r.nome)).toEqual(['Carlos']);
  });

  it('filtro por coluna aceita "not null" para valores preenchidos', () => {
    const processed = processQueryRows(result, { columnFilters: { ativo: 'not null' } });
    expect(processed.map((r) => r.nome).sort()).toEqual(['Ana', 'Bruno']);
  });

  it('filtro por coluna faz match parcial case-insensitive no valor normal', () => {
    const processed = processQueryRows(result, { columnFilters: { nome: 'an' } });
    expect(processed.map((r) => r.nome)).toEqual(['Ana']);
  });

  it('múltiplos filtros de coluna combinam com E (todos precisam bater)', () => {
    const processed = processQueryRows(result, {
      columnFilters: { nome: 'n', ativo: 'not null' } // 'n' está em Ana e Bruno, não em Carlos
    });
    expect(processed.map((r) => r.nome).sort()).toEqual(['Ana', 'Bruno']);
  });

  it('ordena numericamente quando a coluna é do tipo number', () => {
    const processed = processQueryRows(result, {
      sortConfig: { column: 'id', direction: 'asc' },
      columnDataTypes: { id: 'number' }
    });
    expect(processed.map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it('ordenação desc inverte o resultado', () => {
    const processed = processQueryRows(result, {
      sortConfig: { column: 'id', direction: 'desc' },
      columnDataTypes: { id: 'number' }
    });
    expect(processed.map((r) => r.id)).toEqual([3, 2, 1]);
  });

  it('linhas com valor nulo na coluna de ordenação vão para o final, independente da direção', () => {
    const processed = processQueryRows(result, {
      sortConfig: { column: 'ativo', direction: 'asc' },
      columnDataTypes: { ativo: 'boolean' }
    });
    expect(processed[processed.length - 1].nome).toBe('Carlos');
  });

  it('combina busca, filtro e ordenação juntos', () => {
    const bigger = makeResult(
      ['id', 'nome'],
      [
        { id: 10, nome: 'Ana Paula' },
        { id: 5, nome: 'Ana Clara' },
        { id: 1, nome: 'Outro' }
      ]
    );
    const processed = processQueryRows(bigger, {
      searchTerm: 'ana',
      sortConfig: { column: 'id', direction: 'asc' },
      columnDataTypes: { id: 'number' }
    });
    expect(processed.map((r) => r.nome)).toEqual(['Ana Clara', 'Ana Paula']);
  });
});

describe('hasActiveQueryFilters', () => {
  it('falso quando nada está ativo', () => {
    expect(hasActiveQueryFilters('', null, {})).toBe(false);
    expect(hasActiveQueryFilters('   ', null, { col: '  ' })).toBe(false);
  });

  it('verdadeiro quando há termo de busca', () => {
    expect(hasActiveQueryFilters('abc', null, {})).toBe(true);
  });

  it('verdadeiro quando há ordenação ativa', () => {
    expect(hasActiveQueryFilters('', { column: 'id', direction: 'asc' }, {})).toBe(true);
  });

  it('verdadeiro quando há filtro de coluna preenchido', () => {
    expect(hasActiveQueryFilters('', null, { nome: 'x' })).toBe(true);
  });
});
