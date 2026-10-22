import { describe, it, expect } from 'vitest';
import {
  buildSearchPredicate,
  resolveDisplayLines,
  pickNextMatchIndex,
  type LogSearchFilter
} from './logsSearchUtils';

const sampleLines = [
  '2026-10-21 10:00:00 INFO Initializing service',
  '2026-10-21 10:00:01 DEBUG Connecting to Oracle DB',
  '2026-10-21 10:00:02 ERROR ORA-00942: table or view does not exist',
  '    at com.totvs.dao.OrderDao.select(OrderDao.java:42)',
  '    at com.totvs.service.OrderService.run(OrderService.java:100)',
  '2026-10-21 10:00:03 INFO Retrying connection in 5s',
  '2026-10-21 10:00:08 WARN Slow query detected: 4200ms',
  '2026-10-21 10:00:09 INFO Service ready'
];

describe('buildSearchPredicate', () => {
  it('retorna false para busca vazia', () => {
    const fn = buildSearchPredicate('', false, false);
    expect(fn('qualquer coisa')).toBe(false);
  });

  it('busca case-insensitive por padrao', () => {
    const fn = buildSearchPredicate('ora-00942', false, false);
    expect(fn(sampleLines[2])).toBe(true);
    expect(fn(sampleLines[0])).toBe(false);
  });

  it('respeita case-sensitive quando ativado', () => {
    const fnMatch = buildSearchPredicate('ORA-00942', false, true);
    const fnNoMatch = buildSearchPredicate('ora-00942', false, true);
    expect(fnMatch(sampleLines[2])).toBe(true);
    expect(fnNoMatch(sampleLines[2])).toBe(false);
  });

  it('suporta regex valida e protege contra regex invalida', () => {
    const fnRegex = buildSearchPredicate('ORA-\\d{5}', true, false);
    expect(fnRegex(sampleLines[2])).toBe(true);
    const fnInvalid = buildSearchPredicate('([unclosed', true, false);
    expect(fnInvalid(sampleLines[2])).toBe(false);
  });
});

describe('resolveDisplayLines - modo find (Localizar)', () => {
  it('retorna todas as linhas preservando contexto e marcando isMatch', () => {
    const filter: LogSearchFilter = {
      levelFilter: 'ALL',
      filterText: 'OrderDao',
      isRegex: false,
      isCaseSensitive: false,
      invertFilter: false,
      searchMode: 'find',
      contextLines: 0
    };

    const result = resolveDisplayLines(sampleLines, filter);
    expect(result.displayLines).toHaveLength(sampleLines.length);
    expect(result.matchIndices).toEqual([3]);
    expect(result.displayLines[3].isMatch).toBe(true);
    expect(result.displayLines[3].originalIndex).toBe(3);
    // Linhas ao redor continuam visiveis (contexto preservado!)
    expect(result.displayLines[2].isMatch).toBe(false);
    expect(result.displayLines[2].text).toContain('ORA-00942');
  });

  it('retorna matchIndices vazios se nao houver match', () => {
    const filter: LogSearchFilter = {
      levelFilter: 'ALL',
      filterText: 'termo-inexistente-xyz',
      isRegex: false,
      isCaseSensitive: false,
      invertFilter: false,
      searchMode: 'find',
      contextLines: 0
    };

    const result = resolveDisplayLines(sampleLines, filter);
    expect(result.displayLines).toHaveLength(sampleLines.length);
    expect(result.matchIndices).toEqual([]);
    expect(result.displayLines.every((l) => !l.isMatch)).toBe(true);
  });
});

describe('resolveDisplayLines - modo filter (Filtrar)', () => {
  it('filtra apenas as linhas correspondentes com contextLines = 0', () => {
    const filter: LogSearchFilter = {
      levelFilter: 'ALL',
      filterText: 'OrderDao',
      isRegex: false,
      isCaseSensitive: false,
      invertFilter: false,
      searchMode: 'filter',
      contextLines: 0
    };

    const result = resolveDisplayLines(sampleLines, filter);
    expect(result.displayLines).toHaveLength(1);
    expect(result.displayLines[0].text).toContain('OrderDao');
    expect(result.displayLines[0].originalIndex).toBe(3);
    expect(result.displayLines[0].isMatch).toBe(true);
  });

  it('inclui linhas de contexto antes e depois quando contextLines > 0', () => {
    const filter: LogSearchFilter = {
      levelFilter: 'ALL',
      filterText: 'ORA-00942',
      isRegex: false,
      isCaseSensitive: false,
      invertFilter: false,
      searchMode: 'filter',
      contextLines: 1 // 1 linha antes e 1 linha depois
    };

    const result = resolveDisplayLines(sampleLines, filter);
    // Linha do match e indice 2 ('ERROR ORA-00942')
    // Com contexto 1, inclui indice 1 ('DEBUG Connecting...'), 2 ('ERROR ORA...'), 3 ('OrderDao')
    expect(result.displayLines).toHaveLength(3);
    expect(result.displayLines[0].originalIndex).toBe(1);
    expect(result.displayLines[0].isContext).toBe(true);
    expect(result.displayLines[0].isMatch).toBe(false);

    expect(result.displayLines[1].originalIndex).toBe(2);
    expect(result.displayLines[1].isMatch).toBe(true);
    expect(result.displayLines[1].isContext).toBe(false);

    expect(result.displayLines[2].originalIndex).toBe(3);
    expect(result.displayLines[2].isContext).toBe(true);
    expect(result.displayLines[2].isMatch).toBe(false);
  });

  it('calcula gapBeforeCount quando existem lacunas entre blocos filtrados', () => {
    const filter: LogSearchFilter = {
      levelFilter: 'ALL',
      filterText: 'service',
      isRegex: false,
      isCaseSensitive: false,
      invertFilter: false,
      searchMode: 'filter',
      contextLines: 0
    };

    // 'service' aparece na linha 0, linha 4 e linha 7
    const result = resolveDisplayLines(sampleLines, filter);
    expect(result.displayLines).toHaveLength(3);
    expect(result.displayLines[0].originalIndex).toBe(0);
    expect(result.displayLines[0].gapBeforeCount).toBeUndefined();

    expect(result.displayLines[1].originalIndex).toBe(4);
    // Lacuna entre 0 e 4 sao as linhas 1, 2, 3 (3 linhas omitidas)
    expect(result.displayLines[1].gapBeforeCount).toBe(3);

    expect(result.displayLines[2].originalIndex).toBe(7);
    // Lacuna entre 4 e 7 sao as linhas 5, 6 (2 linhas omitidas)
    expect(result.displayLines[2].gapBeforeCount).toBe(2);
  });
});

describe('pickNextMatchIndex', () => {
  it('navega circularmente para frente e para tras', () => {
    const matches = [2, 5, 10];
    expect(pickNextMatchIndex(matches, 2, 'next')).toBe(5);
    expect(pickNextMatchIndex(matches, 5, 'next')).toBe(10);
    expect(pickNextMatchIndex(matches, 10, 'next')).toBe(2); // wrap around

    expect(pickNextMatchIndex(matches, 10, 'prev')).toBe(5);
    expect(pickNextMatchIndex(matches, 5, 'prev')).toBe(2);
    expect(pickNextMatchIndex(matches, 2, 'prev')).toBe(10); // wrap around
  });

  it('lida com lista vazia', () => {
    expect(pickNextMatchIndex([], 0, 'next')).toBe(-1);
    expect(pickNextMatchIndex([], 0, 'prev')).toBe(-1);
  });
});
