import React, { useState, useRef, useMemo } from 'react';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { OnboardingTour } from '../components/onboarding/OnboardingTour';
import { usePageTour } from '../components/onboarding/usePageTour';
import { LOGS_TOUR_STEPS, LOGS_TOUR_STORAGE_KEY } from '../components/onboarding/pageTours/logsTour';
import { LogExceptionAnalyzerDrawer } from '../components/LogExceptionAnalyzerDrawer';
import { analyzeLogLine } from '../../../shared/logAnalyzerUtils';
import {
  LogLevelFilter,
  filterLogLines,
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
import { LogsHeader } from '../components/logs/LogsHeader';
import { LogsToolbar } from '../components/logs/LogsToolbar';
import { LogsConsole } from '../components/logs/LogsConsole';
import { LogsFooter } from '../components/logs/LogsFooter';
import { LogFontSize } from '../components/logs/LogLine';
import { ManageLogSourcesModal } from '../components/logs/modals/ManageLogSourcesModal';
import { ClearLogFileModal } from '../components/logs/modals/ClearLogFileModal';

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
  const [filterText, setFilterText] = useState<string>('');
  const [isRegex, setIsRegex] = useState<boolean>(false);
  const [isCaseSensitive, setIsCaseSensitive] = useState<boolean>(false);
  const [invertFilter, setInvertFilter] = useState<boolean>(false);
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

  useLogShortcuts({ isActive, searchInputRef, setFilterText, setLines });

  const filteredLines = useMemo(
    () => filterLogLines(lines, { levelFilter, filterText, isRegex, isCaseSensitive, invertFilter }),
    [lines, levelFilter, filterText, isRegex, isCaseSensitive, invertFilter]
  );
  const errorIndices = useMemo(() => findErrorIndices(filteredLines), [filteredLines]);
  const levelCounts = useMemo(() => countLogLevels(lines), [lines]);

  // Contagem de exceções críticas identificadas pelo analisador WinThor
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
    scrollToLine(nextTarget);
  };

  // Usado pelo Log Analyzer Drawer
  const handleScrollToLine = (targetLineIndex: number) => {
    setActiveErrorIndex(targetLineIndex);
    scrollToLine(targetLineIndex);
  };

  // Zerar arquivo no disco
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
    const content = filteredLines.join('\n');
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

  const openManageModal = () => {
    setEditingSource(null);
    setIsManageModalOpen(true);
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
        onOpenManage={openManageModal}
        onOpenTour={tour.open}
        onCopyPath={() => copyToClipboard(activeSource.filePath, 'path')}
        onRequestClearFile={() => setIsClearFileConfirmOpen(true)}
      />

      <LogsToolbar
        searchInputRef={searchInputRef}
        filterText={filterText}
        isRegex={isRegex}
        isCaseSensitive={isCaseSensitive}
        invertFilter={invertFilter}
        levelFilter={levelFilter}
        totalLines={lines.length}
        levelCounts={levelCounts}
        errorCount={errorIndices.length}
        detectedExceptionsCount={detectedExceptionsCount}
        isPaused={isPaused}
        isAutoScroll={isAutoScroll}
        wordWrap={wordWrap}
        copyFeedback={copyFeedback}
        onFilterTextChange={setFilterText}
        onToggleCaseSensitive={() => setIsCaseSensitive((prev) => !prev)}
        onToggleRegex={() => setIsRegex((prev) => !prev)}
        onToggleInvert={() => setInvertFilter((prev) => !prev)}
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
        onCopyFiltered={() => copyToClipboard(filteredLines.join('\n'), 'all')}
        onExport={handleExportLogs}
      />

      {/* Canvas do terminal (Deep Black #05080E) */}
      <div className="flex-1 relative bg-[#05080E] overflow-hidden flex flex-col">
        <LogsConsole
          scrollContainerRef={scrollContainerRef}
          lines={filteredLines}
          hasSources={sources.length > 0}
          status={status}
          filePath={activeSource.filePath}
          hasNewLinesBelow={hasNewLinesBelow}
          activeErrorIndex={activeErrorIndex}
          filterText={filterText}
          invertFilter={invertFilter}
          isCaseSensitive={isCaseSensitive}
          hasActiveFilter={Boolean(filterText) || levelFilter !== 'ALL'}
          fontSize={fontSize}
          wordWrap={wordWrap}
          onScroll={handleScroll}
          onScrollToBottom={scrollToBottom}
          onOpenAnalyzer={() => setIsAnalyzerOpen(true)}
          onOpenManage={openManageModal}
        />
        <LogsFooter
          visibleCount={filteredLines.length}
          totalCount={lines.length}
          filterText={filterText}
          invertFilter={invertFilter}
          fontSize={fontSize}
          initialLinesCount={initialLinesCount}
          onFontSizeChange={setFontSize}
          onInitialLinesChange={setInitialLinesCount}
        />
      </div>

      {isManageModalOpen && (
        <ManageLogSourcesModal
          sources={sources}
          editingSource={editingSource}
          setEditingSource={setEditingSource}
          persistSources={persistSources}
          onBrowse={handleBrowseLogFile}
          onSave={handleSaveSource}
          onClose={() => setIsManageModalOpen(false)}
        />
      )}

      {isClearFileConfirmOpen && (
        <ClearLogFileModal
          filePath={activeSource.filePath}
          onCancel={() => setIsClearFileConfirmOpen(false)}
          onConfirm={handleConfirmClearFile}
        />
      )}

      {/* Drawer do Analisador de Exceções WinThor */}
      <LogExceptionAnalyzerDrawer
        isOpen={isAnalyzerOpen}
        onClose={() => setIsAnalyzerOpen(false)}
        lines={lines}
        onScrollToLine={handleScrollToLine}
      />

      <OnboardingTour
        steps={LOGS_TOUR_STEPS}
        isOpen={tour.isOpen}
        onClose={tour.close}
        storageKey={LOGS_TOUR_STORAGE_KEY}
      />
    </div>
  );
};

export default LogsPage;
