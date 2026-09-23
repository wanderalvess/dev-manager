import type { QueryResult } from '../../../shared/types';

export type ColumnDataType = 'number' | 'date' | 'boolean' | 'object' | 'string';

export interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

/**
 * Detecta o tipo de dado predominante de cada coluna, olhando o primeiro valor não vazio
 * encontrado nas linhas — usado pra escolher a estratégia de ordenação (numérica, por data
 * ou textual) e a renderização de cada célula no grid de resultados.
 */
export function detectColumnDataTypes(columns: string[], rows: Record<string, any>[]): Record<string, ColumnDataType> {
  const types: Record<string, ColumnDataType> = {};

  for (const col of columns) {
    let detected: ColumnDataType = 'string';
    for (const row of rows) {
      const val = row[col];
      if (val !== null && val !== undefined && val !== '') {
        if (typeof val === 'number') {
          detected = 'number';
          break;
        }
        if (typeof val === 'boolean') {
          detected = 'boolean';
          break;
        }
        if (typeof val === 'object') {
          detected = val instanceof Date ? 'date' : 'object';
          break;
        }
        if (typeof val === 'string') {
          const trimmed = val.trim();
          if (/^-?\d+(\.\d+)?$/.test(trimmed) && !isNaN(Number(trimmed))) {
            detected = 'number';
            break;
          }
          if (/^\d{4}-\d{2}-\d{2}/.test(trimmed) || /^\d{2}\/\d{2}\/\d{4}/.test(trimmed)) {
            detected = 'date';
            break;
          }
          detected = 'string';
          break;
        }
      }
    }
    types[col] = detected;
  }

  return types;
}

/**
 * Aplica busca global (em todas as colunas), filtros por coluna (com suporte aos valores
 * especiais "[null]"/"null" e "not null"/"!null") e ordenação sobre as linhas de um
 * QueryResult, sem mutar o array original.
 */
export function processQueryRows(
  queryResult: Pick<QueryResult, 'columns' | 'rows'> | null | undefined,
  options: {
    searchTerm?: string;
    columnFilters?: Record<string, string>;
    sortConfig?: SortConfig | null;
    columnDataTypes?: Record<string, ColumnDataType>;
  } = {}
): Record<string, any>[] {
  if (!queryResult?.rows) return [];
  const { searchTerm = '', columnFilters = {}, sortConfig = null, columnDataTypes = {} } = options;
  let list = [...queryResult.rows];

  if (searchTerm.trim()) {
    const termLower = searchTerm.trim().toLowerCase();
    list = list.filter((row) =>
      queryResult.columns.some((col) => {
        const val = row[col];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(termLower);
      })
    );
  }

  const activeFilters = Object.entries(columnFilters).filter(([, v]) => v && v.trim());
  if (activeFilters.length > 0) {
    list = list.filter((row) =>
      activeFilters.every(([col, filterVal]) => {
        const val = row[col];
        const lowerFilter = filterVal.trim().toLowerCase();
        if (lowerFilter === '[null]' || lowerFilter === 'null') {
          return val === null || val === undefined;
        }
        if (lowerFilter === 'not null' || lowerFilter === '!null') {
          return val !== null && val !== undefined;
        }
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(lowerFilter);
      })
    );
  }

  if (sortConfig) {
    const { column, direction } = sortConfig;
    const type = columnDataTypes[column] || 'string';

    list.sort((a, b) => {
      const valA = a[column];
      const valB = b[column];

      if ((valA === null || valA === undefined) && (valB === null || valB === undefined)) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      let comp = 0;
      if (type === 'number') {
        const numA = Number(valA);
        const numB = Number(valB);
        comp = !isNaN(numA) && !isNaN(numB) ? numA - numB : String(valA).localeCompare(String(valB));
      } else if (type === 'date') {
        const dateA = new Date(valA).getTime();
        const dateB = new Date(valB).getTime();
        comp = !isNaN(dateA) && !isNaN(dateB) ? dateA - dateB : String(valA).localeCompare(String(valB));
      } else {
        comp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
      }

      return direction === 'asc' ? comp : -comp;
    });
  }

  return list;
}

/** Verdadeiro se há alguma busca global, ordenação ou filtro de coluna ativo no grid de resultados. */
export function hasActiveQueryFilters(
  searchTerm: string,
  sortConfig: SortConfig | null,
  columnFilters: Record<string, string>
): boolean {
  return Boolean(
    searchTerm.trim() || sortConfig !== null || Object.values(columnFilters).some((v) => v && v.trim())
  );
}
