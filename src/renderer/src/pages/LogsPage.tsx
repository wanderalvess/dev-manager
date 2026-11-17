import React, { useState, useRef, useMemo } from 'react';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { usePageTour } from '../components/onboarding/usePageTour';
import { LOGS_TOUR_STORAGE_KEY } from '../components/onboarding/pageTours/logsTour';
import { analyzeLogLine } from '../../../shared/logAnalyzerUtils';
import {
  LogLevelFilter,
  findErrorIndices,
  countLogLevels,
  pickNextErrorIndex,
  buildLogExportFileName
} from '../utils/logsFilterUtils';
import { useLogSources } from '../hooks/logs/useLogSources';
import { useLogScroll } from '../hooks/logs/useLogScroll';
import { useLogStream } from '../hooks/logs/useLogStream';
import { useLogShortcuts } from '../hooks/logs/useLogShortcuts';
import { useLogSourceEditor } from '../hooks/logs/useLogSourceEditor';
import { useLogSearch } from '../hooks/logs/useLogSearch';
import { LogsHeader } from '../components/logs/LogsHeader';
import { LogsToolbar } from '../components/logs/LogsToolbar';
import { LogsConsole } from '../components/logs/LogsConsole';
import { LogsFooter } from '../components/logs/LogsFooter';
import { LogsModalsHost } from '../components/logs/LogsModalsHost';
import { LogFontSize } from '../components/logs/LogLine';

interface LogsPageProps {
  onNavigateToSettings?: () => void;
  isActive?: boolean;
  settingsVersion?: number;
}

export const LogsPage: React.FC<LogsPageProps> = ({ onNavigateToSettings: _onNavigateToSettings, isActive, settingsVersion }) => {
  const tour = usePageTour(LOGS_TOUR_STORAGE_KEY);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [initialLinesCount, setInitialLinesCount] = useState<number>(500);
  const [wordWrap, setWordWrap] = useState<boolean>(true);
  const [fontSize, setFontSize] = useState<LogFontSize>('xs');
  const [levelFilter, setLevelFilter] = useState<LogLevelFilter>('ALL');
  const [activeErrorIndex, setActiveErrorIndex] = useState<number>(-1);

  // Modais
  const [isManageModalOpen, setIsManageModalOpen] = useState<boolean>(false);
  const [isClearFileConfirmOpen, setIsClearFileConfirmOpen] = useState<boolean>(false);
  const [isAnalyzerOpen, setIsAnalyzerOpen] = useState<boolean>(false);

  const { copy: copyToClipboard, copiedKey: copyFeedback } = useCopyToClipboard(1800);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const { sources, activeSourceId, setActiveSourceId, activeSource, persistSources } = useLogSources(settingsVersion);
  const {
    isAutoScroll,
    setIsAutoScroll,
    hasNewLinesBelow,
    setHasNewLinesBelow,
    scrollContainerRef,
    isAutoScrollingRef,
    handleScroll,
    scrollToBottom,
    scrollToLine
  } = useLogScroll();
  const { lines, setLines, setStatus, status } = useLogStream({
    activeSource,
    initialLinesCount,
    isActive,
    isPaused,
    isAutoScroll,
    scrollContainerRef,
    isAutoScrollingRef,
    setHasNewLinesBelow,
    setActiveErrorIndex
  });
  const { editingSource, setEditingSource, handleBrowseLogFile, handleSaveSource } = useLogSourceEditor(
    sources,
    persistSources
  );

  const logSearch = useLogSearch({
    lines,
    levelFilter,
    scrollToLine
  });

  useLogShortcuts({
    isActive,
    searchInputRef,
    setFilterText: logSearch.setFilterText,
    setLines,
    onNextMatch: logSearch.goToNextMatch,
    onPrevMatch: logSearch.goToPrevMatch,
    onClearSearch: logSearch.clearSearch
  });

  const errorIndices = useMemo(
    () => findErrorIndices(logSearch.displayLines.map((l) => l.text)),
    [logSearch.displayLines]
  );
  const levelCounts = useMemo(() => countLogLevels(lines), [lines]);

  const detectedExceptionsCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < lines.length; i++) {
      if (analyzeLogLine(lines[i], i)) count++;
    }
    return count;
  }, [lines]);

  const navigateErrors = (direction: 'next' | 'prev') => {
    if (errorIndices.length === 0) return;
    const nextTarget = pickNextErrorIndex(errorIndices, activeErrorIndex, direction);
    setActiveErrorIndex(nextTarget);
    const targetItem = logSearch.displayLines[nextTarget];
    if (targetItem) {
      scrollToLine(targetItem.originalIndex);
    }
  };

  const handleScrollToLine = (targetLineIndex: number) => {
    setActiveErrorIndex(targetLineIndex);
    logSearch.jumpToLineInContext(targetLineIndex);
  };

  const handleConfirmClearFile = async () => {
    if (!window.electronAPI?.clearLogFile || !activeSource.filePath) return;
    setIsClearFileConfirmOpen(false);

    try {
      const success = await window.electronAPI.clearLogFile(activeSource.filePath);
      if (success) {
        setLines(['--- [ARQUIVO LIMPO NO DISCO PELO HUB MANAGER] ---']);
        if (window.electronAPI.checkLogFile) {
          const updated = await window.electronAPI.checkLogFile(activeSource.filePath, activeSource.id);
          setStatus(updated);
        }
      }
    } catch (err) {
      console.error('[LogsPage] Erro ao limpar arquivo:', err);
    }
  };

  const handleExportLogs = () => {
    const content = logSearch.displayLines.map((l) => l.text).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildLogExportFileName(activeSource.id);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden text-foreground">
      <h1 className="sr-only">Logs em Tempo Real</h1>
      <LogsHeader
        sources={sources}
        activeSource={activeSource}
        activeSourceId={activeSourceId}
        status={status}
        isPaused={isPaused}
        copyFeedback={copyFeedback}
        onSelectSource={setActiveSourceId}
        onOpenManage={() => {
          setEditingSource(null);
          setIsManageModalOpen(true);
        }}
        onOpenTour={tour.open}
        onCopyPath={() => copyToClipboard(activeSource.filePath, 'path')}
        onRequestClearFile={() => setIsClearFileConfirmOpen(true)}
      />

      <LogsToolbar
        searchInputRef={searchInputRef}
        filterText={logSearch.filterText}
        isRegex={logSearch.isRegex}
        isCaseSensitive={logSearch.isCaseSensitive}
        invertFilter={logSearch.invertFilter}
        searchMode={logSearch.searchMode}
        contextLines={logSearch.contextLines}
        currentMatchPosition={logSearch.currentMatchPosition}
        totalMatches={logSearch.totalMatches}
        levelFilter={levelFilter}
        totalLines={lines.length}
        levelCounts={levelCounts}
        errorCount={errorIndices.length}
        detectedExceptionsCount={detectedExceptionsCount}
        isPaused={isPaused}
        isAutoScroll={isAutoScroll}
        wordWrap={wordWrap}
        copyFeedback={copyFeedback}
        onFilterTextChange={logSearch.setFilterText}
        onToggleCaseSensitive={() => logSearch.setIsCaseSensitive((prev) => !prev)}
        onToggleRegex={() => logSearch.setIsRegex((prev) => !prev)}
        onToggleInvert={() => logSearch.setInvertFilter((prev) => !prev)}
        onSearchModeChange={logSearch.setSearchMode}
        onContextLinesChange={logSearch.setContextLines}
        onNavigateMatch={(dir) => (dir === 'next' ? logSearch.goToNextMatch() : logSearch.goToPrevMatch())}
        onClearSearch={logSearch.clearSearch}
        onLevelChange={setLevelFilter}
        onNavigateErrors={navigateErrors}
        onOpenAnalyzer={() => setIsAnalyzerOpen(true)}
        onTogglePause={() => setIsPaused((prev) => !prev)}
        onToggleAutoScroll={() => {
          if (!isAutoScroll) scrollToBottom();
          else setIsAutoScroll(false);
        }}
        onToggleWrap={() => setWordWrap((prev) => !prev)}
        onClearScreen={() => setLines([])}
        onCopyFiltered={() => copyToClipboard(logSearch.displayLines.map((l) => l.text).join('\n'), 'all')}
        onExport={handleExportLogs}
      />

      <div className="flex-1 relative bg-[#05080E] overflow-hidden flex flex-col">
        <LogsConsole
          scrollContainerRef={scrollContainerRef}
          displayLines={logSearch.displayLines}
          activeOriginalIndex={logSearch.activeOriginalIndex}
          activeErrorIndex={activeErrorIndex}
          hasSources={sources.length > 0}
          status={status}
          filePath={activeSource.filePath}
          hasNewLinesBelow={hasNewLinesBelow}
          filterText={logSearch.filterText}
          invertFilter={logSearch.invertFilter}
          isCaseSensitive={logSearch.isCaseSensitive}
          isRegex={logSearch.isRegex}
          searchMode={logSearch.searchMode}
          hasActiveFilter={Boolean(logSearch.filterText) || levelFilter !== 'ALL'}
          fontSize={fontSize}
          wordWrap={wordWrap}
          onScroll={handleScroll}
          onScrollToBottom={scrollToBottom}
          onOpenAnalyzer={() => setIsAnalyzerOpen(true)}
          onOpenManage={() => {
            setEditingSource(null);
            setIsManageModalOpen(true);
          }}
          onJumpToLineInContext={logSearch.jumpToLineInContext}
        />
        <LogsFooter
          visibleCount={logSearch.displayLines.length}
          totalCount={lines.length}
          filterText={logSearch.filterText}
          invertFilter={logSearch.invertFilter}
          searchMode={logSearch.searchMode}
          matchCount={logSearch.totalMatches}
          contextLines={logSearch.contextLines}
          fontSize={fontSize}
          initialLinesCount={initialLinesCount}
          onFontSizeChange={setFontSize}
          onInitialLinesChange={setInitialLinesCount}
        />
      </div>

      <LogsModalsHost
        isManageModalOpen={isManageModalOpen}
        isClearFileConfirmOpen={isClearFileConfirmOpen}
        isAnalyzerOpen={isAnalyzerOpen}
        isTourOpen={tour.isOpen}
        sources={sources}
        activeSource={activeSource}
        editingSource={editingSource}
        lines={lines}
        setEditingSource={setEditingSource}
        persistSources={persistSources}
        onBrowseLogFile={handleBrowseLogFile}
        onSaveSource={handleSaveSource}
        onConfirmClearFile={handleConfirmClearFile}
        onScrollToLine={handleScrollToLine}
        onCloseManage={() => setIsManageModalOpen(false)}
        onCloseClearFile={() => setIsClearFileConfirmOpen(false)}
        onCloseAnalyzer={() => setIsAnalyzerOpen(false)}
        onCloseTour={tour.close}
      />
    </div>
  );
};

export default LogsPage;
