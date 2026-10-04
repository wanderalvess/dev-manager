import { describe, it, expect } from 'vitest';
import {
  parseBatchCodes,
  upsertBatchProgress,
  computeBatchStats,
  getRestoredVersionSuffix,
  filterCatalogItems,
  getPathBaseName
} from './ccwModalUtils';

const makeProgress = (over: Record<string, unknown>) => ({ status: 'pending', ...over }) as any;
const makeItem = (over: Record<string, unknown>) =>
  ({ id: 1, rotina: 'PCSIS132', moduloDesc: 'Vendas', versaoCorrente: '30.1.2', ...over }) as any;

describe('parseBatchCodes', () => {
  it('separa por vírgula, ponto e vírgula, espaço e quebra de linha', () => {
    expect(parseBatchCodes('132, 529;1406\nPCSIS1700  ')).toEqual(['132', '529', '1406', 'PCSIS1700']);
  });
  it('retorna lista vazia para entrada em branco', () => {
    expect(parseBatchCodes('  , ; ')).toEqual([]);
  });
});

describe('upsertBatchProgress', () => {
  it('acrescenta item novo', () => {
    const res = upsertBatchProgress([], makeProgress({ routineCodeOrName: '132' }));
    expect(res).toHaveLength(1);
  });
  it('substitui item existente ignorando caixa', () => {
    const list = [makeProgress({ routineCodeOrName: 'pcsis132', status: 'pending' })];
    const res = upsertBatchProgress(list, makeProgress({ routineCodeOrName: 'PCSIS132', status: 'completed' }));
    expect(res).toHaveLength(1);
    expect(res[0].status).toBe('completed');
    expect(list[0].status).toBe('pending');
  });
});

describe('computeBatchStats', () => {
  it('calcula percentual de processadas', () => {
    const stats = computeBatchStats([
      makeProgress({ status: 'completed' }),
      makeProgress({ status: 'failed' }),
      makeProgress({ status: 'downloading' }),
      makeProgress({ status: 'pending' })
    ]);
    expect(stats).toEqual({ total: 4, completed: 1, failed: 1, percent: 50 });
  });
});

describe('getRestoredVersionSuffix', () => {
  it('formata string, objeto e vazio', () => {
    expect(getRestoredVersionSuffix('1.2')).toBe(' (v1.2)');
    expect(getRestoredVersionSuffix('')).toBe('');
    expect(getRestoredVersionSuffix({ fileVersion: '3.4' })).toBe(' (v3.4)');
    expect(getRestoredVersionSuffix(undefined)).toBe('');
  });
});

describe('filterCatalogItems', () => {
  const items = [makeItem({}), makeItem({ id: 2, rotina: 'PC1406', moduloDesc: 'Estoque', versaoCorrente: '' })];
  it('retorna tudo sem busca', () => {
    expect(filterCatalogItems(items, '  ')).toHaveLength(2);
  });
  it('filtra por rotina ou módulo', () => {
    expect(filterCatalogItems(items, 'pc1406')).toHaveLength(1);
    expect(filterCatalogItems(items, 'vendas')).toHaveLength(1);
  });
});

describe('getPathBaseName', () => {
  it('aceita separadores Windows e POSIX', () => {
    expect(getPathBaseName('C:\\dl\\PCSIS132.EXE')).toBe('PCSIS132.EXE');
    expect(getPathBaseName('/tmp/a.zip')).toBe('a.zip');
  });
});
