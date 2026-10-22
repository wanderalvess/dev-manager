import { LogLevelFilter } from './logsFilterUtils';

export type LogSearchMode = 'find' | 'filter';
export type LogContextLines = 0 | 1 | 3 | 5;

export interface LogDisplayLine {
  text: string;
  originalIndex: number;
  isMatch: boolean;
  isContext?: boolean;
  gapBeforeCount?: number;
}

export interface LogSearchFilter {
  levelFilter: LogLevelFilter;
  filterText: string;
  isRegex: boolean;
  isCaseSensitive: boolean;
  invertFilter: boolean;
  searchMode: LogSearchMode;
  contextLines: LogContextLines;
}

export interface ResolveDisplayLinesResult {
  displayLines: LogDisplayLine[];
  matchIndices: number[];
}

export const buildSearchPredicate = (
  query: string,
  isRegex: boolean,
  isCaseSensitive: boolean
): ((line: string) => boolean) => {
  const trimmed = query.trim();
  if (!trimmed) return () => false;

  if (isRegex) {
    try {
      const reg = new RegExp(trimmed, isCaseSensitive ? '' : 'i');
      return (line: string) => reg.test(line);
    } catch {
      return () => false;
    }
  }

  if (isCaseSensitive) {
    return (line: string) => line.includes(trimmed);
  }

  const lowered = trimmed.toLowerCase();
  return (line: string) => line.toLowerCase().includes(lowered);
};

const matchesLevel = (line: string, level: LogLevelFilter): boolean => {
  const upper = line.toUpperCase();
  if (level === 'ERROR') {
    return (
      upper.includes('ERROR') ||
      upper.includes('FATAL') ||
      upper.includes('EXCEPTION') ||
      upper.includes('CAUSED BY:')
    );
  }
  if (level === 'WARN') return upper.includes('WARN') || upper.includes('WARNING');
  if (level === 'INFO') return upper.includes('INFO');
  if (level === 'DEBUG') return upper.includes('DEBUG') || upper.includes('TRACE');
  return true;
};

/**
 * Resolve as linhas a serem exibidas no console com suporte a:
 * - Modo 'find' (Localizar): preserva todo o log e mapeia as ocorrências para rolagem.
 * - Modo 'filter' (Filtrar): isola correspondências com linhas opcionais de contexto (±1, ±3, ±5).
 */
export const resolveDisplayLines = (
  lines: string[],
  filter: LogSearchFilter
): ResolveDisplayLinesResult => {
  const { levelFilter, filterText, isRegex, isCaseSensitive, invertFilter, searchMode, contextLines } = filter;

  // 1. Filtragem preliminar de severidade mantendo os índices originais do arquivo
  const indexedLines: { text: string; originalIndex: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];
    if (levelFilter === 'ALL' || matchesLevel(text, levelFilter)) {
      indexedLines.push({ text, originalIndex: i });
    }
  }

  // 2. Sem termo de busca: exibe todas as linhas da severidade selecionada
  if (!filterText.trim()) {
    return {
      displayLines: indexedLines.map((item) => ({
        text: item.text,
        originalIndex: item.originalIndex,
        isMatch: false,
        isContext: false
      })),
      matchIndices: []
    };
  }

  const predicate = buildSearchPredicate(filterText, isRegex, isCaseSensitive);
  const testFn = (text: string) => (invertFilter ? !predicate(text) : predicate(text));

  const matchedSet = new Set<number>();
  const matchIndices: number[] = [];
  const matchPositionsInIndexed: number[] = [];

  for (let pos = 0; pos < indexedLines.length; pos++) {
    const item = indexedLines[pos];
    if (testFn(item.text)) {
      matchedSet.add(item.originalIndex);
      matchIndices.push(item.originalIndex);
      matchPositionsInIndexed.push(pos);
    }
  }

  // 3. Modo Localizar ('find'): retorna o log completo e marca os matches para auto-scroll e highlight
  if (searchMode === 'find') {
    return {
      displayLines: indexedLines.map((item) => ({
        text: item.text,
        originalIndex: item.originalIndex,
        isMatch: matchedSet.has(item.originalIndex),
        isContext: false
      })),
      matchIndices
    };
  }

  // 4. Modo Filtrar ('filter')
  if (matchPositionsInIndexed.length === 0) {
    return { displayLines: [], matchIndices: [] };
  }

  // Se não há linhas de contexto solicitadas (±0)
  if (!contextLines || contextLines <= 0) {
    const displayLines: LogDisplayLine[] = [];
    for (let i = 0; i < matchPositionsInIndexed.length; i++) {
      const pos = matchPositionsInIndexed[i];
      const item = indexedLines[pos];
      const prev = i > 0 ? indexedLines[matchPositionsInIndexed[i - 1]] : null;
      const gapBeforeCount = prev ? item.originalIndex - prev.originalIndex - 1 : 0;

      displayLines.push({
        text: item.text,
        originalIndex: item.originalIndex,
        isMatch: true,
        isContext: false,
        gapBeforeCount: gapBeforeCount > 0 ? gapBeforeCount : undefined
      });
    }
    return { displayLines, matchIndices };
  }

  // Com linhas de contexto: expande a janela ao redor de cada match
  const includedPosSet = new Set<number>();
  for (const pos of matchPositionsInIndexed) {
    const start = Math.max(0, pos - contextLines);
    const end = Math.min(indexedLines.length - 1, pos + contextLines);
    for (let p = start; p <= end; p++) {
      includedPosSet.add(p);
    }
  }

  const sortedPositions = Array.from(includedPosSet).sort((a, b) => a - b);
  const displayLines: LogDisplayLine[] = [];

  for (let i = 0; i < sortedPositions.length; i++) {
    const pos = sortedPositions[i];
    const item = indexedLines[pos];
    const prev = i > 0 ? indexedLines[sortedPositions[i - 1]] : null;
    const gapBeforeCount = prev ? item.originalIndex - prev.originalIndex - 1 : 0;

    displayLines.push({
      text: item.text,
      originalIndex: item.originalIndex,
      isMatch: matchedSet.has(item.originalIndex),
      isContext: !matchedSet.has(item.originalIndex),
      gapBeforeCount: gapBeforeCount > 0 ? gapBeforeCount : undefined
    });
  }

  return { displayLines, matchIndices };
};

/**
 * Calcula o próximo/anterior índice de match com navegação circular.
 */
export const pickNextMatchIndex = (
  matchIndices: number[],
  current: number,
  direction: 'next' | 'prev'
): number => {
  if (matchIndices.length === 0) return -1;
  if (direction === 'next') {
    const found = matchIndices.find((idx) => idx > current);
    return found !== undefined ? found : matchIndices[0];
  }
  const found = [...matchIndices].reverse().find((idx) => idx < current);
  return found !== undefined ? found : matchIndices[matchIndices.length - 1];
};
