import { useMemo, useState } from 'react';
import type { ObservabilityOverview, SlowQueryMetricsSummary, ApmTimeSeriesBucket } from '../../../../shared/types';
import { useCopyToClipboard } from '../useCopyToClipboard';
import { showToast } from '../../components/ToastHost';
import {
  buildLatencyLinePoints,
  computeRpm,
  getMaxBucketLatency,
  getMaxBucketRequests,
  sortEndpoints,
  type EndpointSortMode
} from '../../utils/apmDashboardUtils';

interface UseApmDashboardParams {
  overview: ObservabilityOverview | null;
  onNavigateToDatabase?: () => void;
}

const EMPTY_SERIES: ApmTimeSeriesBucket[] = [];
const EMPTY_QUERIES: SlowQueryMetricsSummary[] = [];

/** Estado e derivações do dashboard APM (ordenação, hover do gráfico e agregações). */
export function useApmDashboard({ overview, onNavigateToDatabase }: UseApmDashboardParams) {
  const { copy: copyToClipboard, copiedKey: copyFeedback } = useCopyToClipboard(2000);
  const [hoveredBucketIdx, setHoveredBucketIdx] = useState<number | null>(null);
  const [endpointSortMode, setEndpointSortMode] = useState<EndpointSortMode>('volume');

  const timeSeries = useMemo(() => overview?.timeSeries || EMPTY_SERIES, [overview]);
  const slowQueries = useMemo(() => overview?.slowQueries || EMPTY_QUERIES, [overview]);

  const displayedEndpoints = useMemo(
    () => sortEndpoints(overview?.topEndpoints || [], endpointSortMode),
    [overview, endpointSortMode]
  );

  const maxBucketRequests = useMemo(() => getMaxBucketRequests(timeSeries), [timeSeries]);
  const maxBucketLatency = useMemo(() => getMaxBucketLatency(timeSeries), [timeSeries]);
  const rpm = useMemo(() => computeRpm(timeSeries), [timeSeries]);
  const latencyLinePoints = useMemo(
    () => buildLatencyLinePoints(timeSeries, maxBucketLatency),
    [timeSeries, maxBucketLatency]
  );

  // Copiar SQL e opcionalmente abrir no DB Studio
  const handleOpenInDbStudio = (statement: string) => {
    copyToClipboard(statement, statement);
    showToast('Query SQL copiada para a área de transferência! Abrindo DB Studio...', 'info');
    if (onNavigateToDatabase) {
      onNavigateToDatabase();
    }
  };

  return {
    copyToClipboard,
    copyFeedback,
    hoveredBucketIdx,
    setHoveredBucketIdx,
    endpointSortMode,
    setEndpointSortMode,
    timeSeries,
    slowQueries,
    displayedEndpoints,
    maxBucketRequests,
    rpm,
    latencyLinePoints,
    handleOpenInDbStudio
  };
}
