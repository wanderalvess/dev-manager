import type {
  TraceSummary,
  TraceDetails,
  ApmFilter,
  ApmReceiverStatus,
  ApmReceiverPortChangeResult,
  ObservabilityOverview,
  ServiceMetricsSummary
} from '../../../../shared/types';
import type { ElectronAPI } from '../../../../preload/index';
import type { BridgeDeps } from './core';

/** Adaptador web (REST/WebSocket) dos canais: APM & Observabilidade (OpenTelemetry / SigNoz). */
export function createApmApi({ apiFetch, wsManager }: BridgeDeps) {
  return {
    // APM & Observabilidade (OpenTelemetry / SigNoz)
    getApmOverview: async (filter?: ApmFilter): Promise<ObservabilityOverview> => {
      try {
        const query = filter?.serviceName ? `?serviceName=${encodeURIComponent(filter.serviceName)}` : '';
        return await apiFetch<ObservabilityOverview>(`/api/apm/overview${query}`);
      } catch (err: any) {
        return {
          totalTraces: 0,
          totalSpans: 0,
          requestsPerSecond: 0,
          errorRate: 0,
          avgLatencyMs: 0,
          p50LatencyMs: 0,
          p95LatencyMs: 0,
          p99LatencyMs: 0,
          services: [],
          topEndpoints: [],
          slowQueries: [],
          timeSeries: [],
          dbTimePercentage: 0,
          receiverStatus: {
            listening: false,
            port: 4318,
            error: err.message,
            totalIngestedSpans: 0,
            totalIngestedTraces: 0,
            bufferSize: 0,
            maxBufferSize: 5000
          }
        };
      }
    },
    getApmTraces: async (filter?: ApmFilter): Promise<TraceSummary[]> => {
      try {
        return await apiFetch<TraceSummary[]>('/api/apm/traces', {
          method: 'POST',
          body: JSON.stringify(filter || {})
        });
      } catch {
        return [];
      }
    },
    getApmTraceDetails: async (traceId: string): Promise<TraceDetails | null> => {
      try {
        return await apiFetch<TraceDetails>(`/api/apm/traces/${encodeURIComponent(traceId)}`);
      } catch {
        return null;
      }
    },
    getApmServices: async (): Promise<ServiceMetricsSummary[]> => {
      try {
        return await apiFetch<ServiceMetricsSummary[]>('/api/apm/services');
      } catch {
        return [];
      }
    },
    getApmReceiverStatus: async (): Promise<ApmReceiverStatus> => {
      try {
        return await apiFetch<ApmReceiverStatus>('/api/apm/receiver-status');
      } catch (err: any) {
        return {
          listening: false,
          port: 4318,
          error: err.message,
          totalIngestedSpans: 0,
          totalIngestedTraces: 0,
          bufferSize: 0,
          maxBufferSize: 5000
        };
      }
    },
    clearApmTraces: async (): Promise<{ success: boolean }> => {
      try {
        return await apiFetch<{ success: boolean }>('/api/apm/traces', { method: 'DELETE' });
      } catch {
        return { success: false };
      }
    },
    generateApmDemo: async (): Promise<{ generatedSpans: number; generatedTraces: number }> => {
      return apiFetch<{ generatedSpans: number; generatedTraces: number }>('/api/apm/demo', { method: 'POST' });
    },
    changeApmReceiverPort: async (port: number): Promise<ApmReceiverPortChangeResult> => {
      return apiFetch<ApmReceiverPortChangeResult>('/api/apm/receiver-port', {
        method: 'POST',
        body: JSON.stringify({ port })
      });
    },
    onApmNewTrace: (callback: (trace: TraceSummary) => void) => {
      return wsManager.subscribe('apm:new-trace', callback);
    }
  } satisfies Partial<ElectronAPI>;
}
