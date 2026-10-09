import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApmDashboardView } from '../components/ApmDashboardView';
import { ApmHeader } from '../components/apm/ApmHeader';
import { ApmSetupModal } from '../components/apm/ApmSetupModal';
import { ApmTraceDetails } from '../components/apm/ApmTraceDetails';
import { ApmTraceFilters } from '../components/apm/ApmTraceFilters';
import { ApmTraceList } from '../components/apm/ApmTraceList';
import type { DetailTab } from '../components/apm/apmTypes';
import type { TraceSpan } from '../../../shared/types';
import { DEFAULT_APM_OTLP_PORT } from '../../../shared/types';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { useApmReceiverSettings } from '../hooks/apm/useApmReceiverSettings';
import { useApmTraceController } from '../hooks/apm/useApmTraceController';
import {
  buildApmSetupSnippets,
  computeLatencySpectrum,
  computeTimeBudget,
  detectSlowSummary,
  filterTraces,
  findNextTraceId,
  type FilterPreset,
  type LatencyBracket,
  type SpanTierCategory,
  type TraceSortOrder
} from '../utils/apmUiUtils';

interface ApmPageProps {
  isActive?: boolean;
  onNavigateToSettings?: () => void;
  onNavigateToDatabase?: () => void;
}

export const ApmPage: React.FC<ApmPageProps> = ({ isActive = true, onNavigateToDatabase }) => {
  const [viewMode, setViewMode] = useState<'dashboard' | 'traces'>('dashboard');
  const [activePreset, setActivePreset] = useState<FilterPreset>('ALL');
  const [latencyBracket, setLatencyBracket] = useState<LatencyBracket>('ALL');
  const [selectedService, setSelectedService] = useState('ALL');
  const [searchText, setSearchText] = useState('');
  const [sortOrder, setSortOrder] = useState<TraceSortOrder>('time');
  const [detailTab, setDetailTab] = useState<DetailTab>('waterfall');
  const [isModalExpanded, setIsModalExpanded] = useState(false);
  const [waterfallTierFilter, setWaterfallTierFilter] = useState<SpanTierCategory | 'ALL'>('ALL');
  const [isSlowPickerOpen, setIsSlowPickerOpen] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { copy: copyToClipboard, copiedKey: copyFeedback } = useCopyToClipboard(2000);
  const limit = 250;

  const controller = useApmTraceController({
    isActive,
    filters: { limit, selectedService, searchText, preset: activePreset, sortOrder }
  });
  const settings = useApmReceiverSettings({ isActive, onRefresh: controller.refreshData });
  const {
    overview, rawTraces, selectedTraceId, traceDetails, selectedSpanId, setSelectedSpanId,
    isRecording, setIsRecording, openTrace, closeTrace, handleSelectTrace,
    handleClear
  } = controller;
  const { handleApplyReceiverPort, handleApplyServiceName, handleToggleInstrumentation } = settings;

  const displayedTraces = useMemo(() => filterTraces(rawTraces, {
    searchText, preset: activePreset, latencyBracket, selectedService, sortOrder
  }), [rawTraces, searchText, activePreset, latencyBracket, selectedService, sortOrder]);
  const slowSummary = useMemo(() => detectSlowSummary(rawTraces), [rawTraces]);
  const latencySpectrum = useMemo(() => computeLatencySpectrum(rawTraces), [rawTraces]);
  const timeBudget = useMemo(() => computeTimeBudget(traceDetails), [traceDetails]);
  const activeSpan = useMemo<TraceSpan | null>(() => {
    if (!traceDetails?.spans) return null;
    if (selectedSpanId) {
      const found = traceDetails.spans.find((span) => span.spanId === selectedSpanId);
      if (found) return found;
    }
    return traceDetails.rootTree[0]?.span || traceDetails.spans[0] || null;
  }, [traceDetails, selectedSpanId]);
  const errorSpans = useMemo(() => {
    if (!traceDetails?.spans) return [];
    const withError = traceDetails.spans.filter((span) => span.statusCode === 'ERROR' || !!span.statusMessage || !!span.exception);
    return [...withError].sort((left, right) => Number(!!right.exception) - Number(!!left.exception));
  }, [traceDetails]);
  const hasSqlTab = !!traceDetails?.spans.some((span) => !!span.dbStatement);
  const hasErrorTab = !!traceDetails?.summary.hasError || errorSpans.length > 0;
  const visibleDetailTab: DetailTab =
    (detailTab === 'sql' && !hasSqlTab) || (detailTab === 'error' && !hasErrorTab) ? 'waterfall' : detailTab;
  const receiverPort = overview?.receiverStatus.port || DEFAULT_APM_OTLP_PORT;
  const setupSnippets = useMemo(() => buildApmSetupSnippets(receiverPort, settings.serviceName), [receiverPort, settings.serviceName]);
  const maxListDuration = useMemo(() => {
    if (displayedTraces.length === 0) return 100;
    return Math.max(...displayedTraces.map((trace) => trace.durationMs), 10);
  }, [displayedTraces]);
  const serviceOptions = useMemo(() => {
    const services = new Set<string>();
    overview?.services.forEach((service) => services.add(service.serviceName));
    rawTraces.forEach((trace) => { if (trace.serviceName) services.add(trace.serviceName); });
    return Array.from(services);
  }, [overview, rawTraces]);

  const openSetupModal = useCallback(() => setIsSetupModalOpen(true), []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const isInputActive =
      document.activeElement === searchInputRef.current ||
      document.activeElement?.tagName === 'INPUT' ||
      document.activeElement?.tagName === 'TEXTAREA';
    if (event.key === '/' && !isInputActive) {
      event.preventDefault();
      searchInputRef.current?.focus();
      return;
    }
    if (event.key === 'Escape') {
      if (selectedTraceId) closeTrace();
      else if (isSetupModalOpen) setIsSetupModalOpen(false);
      return;
    }
    if (!isInputActive && displayedTraces.length > 0) {
      if (event.key === 'ArrowDown' || event.key === 'j') {
        event.preventDefault();
        const nextId = findNextTraceId(displayedTraces, selectedTraceId, 'next');
        if (nextId && nextId !== selectedTraceId) openTrace(nextId);
      } else if (event.key === 'ArrowUp' || event.key === 'k') {
        event.preventDefault();
        const previousId = findNextTraceId(displayedTraces, selectedTraceId, 'prev');
        if (previousId && previousId !== selectedTraceId) openTrace(previousId);
      }
    }
  }, [selectedTraceId, isSetupModalOpen, displayedTraces, openTrace, closeTrace]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const resetFilters = () => {
    setSearchText('');
    setActivePreset('ALL');
    setLatencyBracket('ALL');
    setSelectedService('ALL');
  };

  return (
    <div className="h-full w-full flex flex-col bg-background text-foreground select-none overflow-hidden font-sans">
      <h1 className="sr-only">APM &amp; Traces</h1>
      <ApmHeader
        overview={overview}
        receiverPort={receiverPort}
        traceCount={rawTraces.length}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isRecording={isRecording}
        onToggleRecording={() => setIsRecording(!isRecording)}
        onClear={handleClear}
        onOpenSetup={openSetupModal}
      />
      {viewMode === 'dashboard' ? (
        <ApmDashboardView
          overview={overview}
          onFilterByEndpoint={(route) => { setSearchText(route); setViewMode('traces'); }}
          onFilterBySlowQuery={(queryOrTable) => { setSearchText(queryOrTable); setActivePreset('SLOW_QUERIES'); setViewMode('traces'); }}
          onSelectTrace={(traceId) => { openTrace(traceId); setViewMode('traces'); }}
          onNavigateToDatabase={onNavigateToDatabase}
          onOpenSetup={openSetupModal}
        />
      ) : (
        <>
          <ApmTraceFilters
            searchInputRef={searchInputRef}
            searchText={searchText}
            setSearchText={setSearchText}
            activePreset={activePreset}
            setActivePreset={setActivePreset}
            latencyBracket={latencyBracket}
            setLatencyBracket={setLatencyBracket}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            selectedService={selectedService}
            setSelectedService={setSelectedService}
            serviceOptions={serviceOptions}
            rawTraceCount={rawTraces.length}
            slowSummary={slowSummary}
            latencySpectrum={latencySpectrum}
            isSlowPickerOpen={isSlowPickerOpen}
            setIsSlowPickerOpen={setIsSlowPickerOpen}
          />
          <main className="flex-1 flex overflow-hidden relative">
            <ApmTraceList
              displayedTraces={displayedTraces}
              rawTraces={rawTraces}
              selectedTraceId={selectedTraceId}
              maxListDuration={maxListDuration}
              setupSnippets={setupSnippets}
              onSelectTrace={handleSelectTrace}
              onOpenSetup={openSetupModal}
              onResetFilters={resetFilters}
            />
            {selectedTraceId && (
              <ApmTraceDetails
                details={traceDetails}
                activeSpan={activeSpan}
                errorSpans={errorSpans}
                timeBudget={timeBudget}
                hasSqlTab={hasSqlTab}
                hasErrorTab={hasErrorTab}
                visibleTab={visibleDetailTab}
                setDetailTab={setDetailTab}
                isExpanded={isModalExpanded}
                setIsExpanded={setIsModalExpanded}
                onClose={closeTrace}
                copyToClipboard={copyToClipboard}
                copyFeedback={copyFeedback}
                selectedSpanId={selectedSpanId}
                onSelectSpan={setSelectedSpanId}
                waterfallTierFilter={waterfallTierFilter}
                setWaterfallTierFilter={setWaterfallTierFilter}
                onNavigateToDatabase={onNavigateToDatabase}
              />
            )}
          </main>
        </>
      )}
      <ApmSetupModal
        isOpen={isSetupModalOpen}
        overview={overview}
        receiverPort={receiverPort}
        instrumentationEnabled={settings.instrumentationEnabled}
        isSavingInstrumentation={settings.isSavingInstrumentation}
        onToggleInstrumentation={handleToggleInstrumentation}
        onApplyReceiverPort={handleApplyReceiverPort}
        isChangingPort={settings.isChangingPort}
        serviceName={settings.serviceName}
        onApplyServiceName={handleApplyServiceName}
        isSavingServiceName={settings.isSavingServiceName}
        setupSnippets={setupSnippets}
        copyToClipboard={copyToClipboard}
        copyFeedback={copyFeedback}
        onClose={() => setIsSetupModalOpen(false)}
      />
    </div>
  );
};
