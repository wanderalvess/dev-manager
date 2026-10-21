import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  LogSearchMode,
  LogContextLines,
  LogSearchFilter,
  LogDisplayLine,
  resolveDisplayLines,
  pickNextMatchIndex
} from '../../utils/logsSearchUtils';
import { LogLevelFilter } from '../../utils/logsFilterUtils';

interface UseLogSearchParams {
  lines: string[];
  levelFilter: LogLevelFilter;
  scrollToLine: (lineIndex: number) => void;
}

export interface UseLogSearchResult {
  filterText: string;
  isRegex: boolean;
  isCaseSensitive: boolean;
  invertFilter: boolean;
  searchMode: LogSearchMode;
  contextLines: LogContextLines;
  activeOriginalIndex: number | null;
  displayLines: LogDisplayLine[];
  matchIndices: number[];
  currentMatchPosition: number;
  totalMatches: number;
  setFilterText: (text: string) => void;
  setIsRegex: (fn: (prev: boolean) => boolean) => void;
  setIsCaseSensitive: (fn: (prev: boolean) => boolean) => void;
  setInvertFilter: (fn: (prev: boolean) => boolean) => void;
  setSearchMode: (mode: LogSearchMode) => void;
  setContextLines: (lines: LogContextLines) => void;
  goToNextMatch: () => void;
  goToPrevMatch: () => void;
  jumpToLineInContext: (originalIndex: number) => void;
  clearSearch: () => void;
}

export function useLogSearch({ lines, levelFilter, scrollToLine }: UseLogSearchParams): UseLogSearchResult {
  const [filterText, setFilterText] = useState<string>('');
  const [isRegex, setIsRegex] = useState<boolean>(false);
  const [isCaseSensitive, setIsCaseSensitive] = useState<boolean>(false);
  const [invertFilter, setInvertFilter] = useState<boolean>(false);
  const [searchMode, setSearchMode] = useState<LogSearchMode>('find');
  const [contextLines, setContextLines] = useState<LogContextLines>(1);
  const [activeOriginalIndex, setActiveOriginalIndex] = useState<number | null>(null);

  const searchFilter = useMemo<LogSearchFilter>(
    () => ({
      levelFilter,
      filterText,
      isRegex,
      isCaseSensitive,
      invertFilter,
      searchMode,
      contextLines
    }),
    [levelFilter, filterText, isRegex, isCaseSensitive, invertFilter, searchMode, contextLines]
  );

  const { displayLines, matchIndices } = useMemo(
    () => resolveDisplayLines(lines, searchFilter),
    [lines, searchFilter]
  );

  // Mantém o índice ativo consistente com os matches atuais
  useEffect(() => {
    if (matchIndices.length === 0) {
      setActiveOriginalIndex(null);
      return;
    }

    if (activeOriginalIndex === null || !matchIndices.includes(activeOriginalIndex)) {
      const first = matchIndices[0];
      setActiveOriginalIndex(first);
      if (searchMode === 'find' && filterText.trim()) {
        scrollToLine(first);
      }
    }
  }, [matchIndices, activeOriginalIndex, searchMode, filterText, scrollToLine]);

  const goToNextMatch = useCallback(() => {
    if (matchIndices.length === 0) return;
    const current = activeOriginalIndex !== null ? activeOriginalIndex : -1;
    const next = pickNextMatchIndex(matchIndices, current, 'next');
    setActiveOriginalIndex(next);
    scrollToLine(next);
  }, [matchIndices, activeOriginalIndex, scrollToLine]);

  const goToPrevMatch = useCallback(() => {
    if (matchIndices.length === 0) return;
    const current = activeOriginalIndex !== null ? activeOriginalIndex : matchIndices[0];
    const prev = pickNextMatchIndex(matchIndices, current, 'prev');
    setActiveOriginalIndex(prev);
    scrollToLine(prev);
  }, [matchIndices, activeOriginalIndex, scrollToLine]);

  const jumpToLineInContext = useCallback(
    (originalIndex: number) => {
      setSearchMode('find');
      setActiveOriginalIndex(originalIndex);
      scrollToLine(originalIndex);
    },
    [scrollToLine]
  );

  const clearSearch = useCallback(() => {
    setFilterText('');
    setActiveOriginalIndex(null);
  }, []);

  const currentMatchPosition = useMemo(() => {
    if (matchIndices.length === 0 || activeOriginalIndex === null) return 0;
    const pos = matchIndices.indexOf(activeOriginalIndex);
    return pos >= 0 ? pos + 1 : 1;
  }, [matchIndices, activeOriginalIndex]);

  return {
    filterText,
    isRegex,
    isCaseSensitive,
    invertFilter,
    searchMode,
    contextLines,
    activeOriginalIndex,
    displayLines,
    matchIndices,
    currentMatchPosition,
    totalMatches: matchIndices.length,
    setFilterText,
    setIsRegex,
    setIsCaseSensitive,
    setInvertFilter,
    setSearchMode,
    setContextLines,
    goToNextMatch,
    goToPrevMatch,
    jumpToLineInContext,
    clearSearch
  };
}
