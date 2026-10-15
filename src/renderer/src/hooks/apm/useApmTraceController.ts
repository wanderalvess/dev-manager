import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApmFilter, ObservabilityOverview, TraceDetails, TraceSummary } from '../../../../shared/types';
import { api } from '../../services/apiBridge';
import { showToast } from '../../components/ToastHost';
import { mergeLiveTraces, type FilterPreset, type TraceSortOrder } from '../../utils/apmUiUtils';

const LIVE_TRACE_FLUSH_MS = 400;

export interface ApmTraceFilters {
  limit: number;
  selectedService: string;
  searchText: string;
  preset: FilterPreset;
  sortOrder: TraceSortOrder;
}

interface LoadTraceOptions {
  keepSelectedSpan?: boolean;
}

export function useApmTraceController({ isActive, filters }: { isActive: boolean; filters: ApmTraceFilters }) {
  const [overview, setOverview] = useState<ObservabilityOverview | null>(null);
  const [rawTraces, setRawTraces] = useState<TraceSummary[]>([]);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [traceDetails, setTraceDetails] = useState<TraceDetails | null>(null);
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(true);
  const selectedTraceIdRef = useRef<string | null>(null);

  const refreshData = useCallback(async () => {
    if (!api?.getApmOverview || !api?.getApmTraces) return;
    try {
      const serviceName = filters.selectedService !== 'ALL' ? filters.selectedService : undefined;
      const filter: ApmFilter = {
        limit: filters.limit,
        serviceName,
        search: filters.searchText.trim() || undefined,
        hasError: filters.preset === 'ERRORS' ? true : undefined,
        minDurationMs: filters.preset === 'SLOW' ? 400 : undefined,
        hasDatabaseQuery: filters.preset === 'DB' || filters.preset === 'SLOW_QUERIES' ? true : undefined,
        slowOnly:
          filters.preset === 'SLOW' || filters.preset === 'SLOW_QUERIES' || filters.preset === 'SLOW_ENDPOINTS'
            ? true
            : undefined,
        sortBy: filters.sortOrder
      };
      const [nextOverview, traces] = await Promise.all([
        api.getApmOverview({ serviceName }),
        api.getApmTraces(filter)
      ]);
      setOverview(nextOverview);
      setRawTraces(traces);
    } catch (err) {
      console.warn('[ApmPage] Falha ao atualizar dados de telemetria:', err);
    }
  }, [filters.limit, filters.selectedService, filters.searchText, filters.preset, filters.sortOrder]);

  useEffect(() => {
    if (!isActive) return;
    refreshData();
    if (!isRecording) return;
    const interval = setInterval(refreshData, 3000);
    return () => clearInterval(interval);
  }, [isActive, isRecording, refreshData]);

  const loadTraceDetails = useCallback(async (traceId: string, options?: LoadTraceOptions) => {
    if (!api?.getApmTraceDetails) return;
    try {
      const details = await api.getApmTraceDetails(traceId);
      if (selectedTraceIdRef.current !== traceId) return;
      setTraceDetails(details);
      if (!options?.keepSelectedSpan) {
        setSelectedSpanId(details?.rootTree[0]?.span.spanId ?? null);
      }
    } catch (err) {
      console.warn('[ApmPage] Erro ao carregar detalhes do trace:', err);
    }
  }, []);

  const openTrace = useCallback((traceId: string) => {
    selectedTraceIdRef.current = traceId;
    setSelectedTraceId(traceId);
    loadTraceDetails(traceId);
  }, [loadTraceDetails]);

  const closeTrace = useCallback(() => {
    selectedTraceIdRef.current = null;
    setSelectedTraceId(null);
    setTraceDetails(null);
    setSelectedSpanId(null);
  }, []);

  const selectTrace = useCallback((traceId: string) => {
    if (selectedTraceId === traceId) closeTrace();
    else openTrace(traceId);
  }, [selectedTraceId, closeTrace, openTrace]);

  useEffect(() => {
    if (!isActive || !isRecording || !api?.onApmNewTrace) return;
    const pending = new Map<string, TraceSummary>();
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      flushTimer = null;
      const batch = Array.from(pending.values());
      pending.clear();
      setRawTraces((previous) => mergeLiveTraces(previous, batch, filters.limit));
      const openTraceId = selectedTraceIdRef.current;
      if (openTraceId && batch.some((trace) => trace.traceId === openTraceId)) {
        loadTraceDetails(openTraceId, { keepSelectedSpan: true });
      }
    };
    const unsubscribe = api.onApmNewTrace((newTrace) => {
      pending.set(newTrace.traceId, newTrace);
      if (!flushTimer) flushTimer = setTimeout(flush, LIVE_TRACE_FLUSH_MS);
    });
    return () => {
      unsubscribe?.();
      if (flushTimer) clearTimeout(flushTimer);
    };
  }, [isActive, isRecording, filters.limit, loadTraceDetails]);

  const clearBuffer = useCallback(async () => {
    if (!api?.clearApmTraces) return;
    try {
      await api.clearApmTraces();
      setRawTraces([]);
      closeTrace();
      showToast('Buffer de telemetria limpo.', 'info');
      refreshData();
    } catch {
      showToast('Falha ao limpar buffer.', 'error');
    }
  }, [closeTrace, refreshData]);

  return {
    overview,
    rawTraces,
    selectedTraceId,
    traceDetails,
    selectedSpanId,
    setSelectedSpanId,
    isRecording,
    setIsRecording,
    refreshData,
    loadTraceDetails,
    openTrace,
    closeTrace,
    handleSelectTrace: selectTrace,
    handleClear: clearBuffer
  };
}
