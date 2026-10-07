import type {
  QaRegressionTemplate,
  QaExecutionRequest,
  QaExecutionResult,
  QaCoreSearchFilter,
  QaCoreSearchResult,
  QaApiFetchRequest,
  QaApiFetchResult,
  TestRunnerConfig,
  TestExecutionResult,
  TautProjectStatus,
  TautCoverageReport,
  TautSpecSummary,
  TautRunOptions,
  TautCsvIntakeResult,
  TautEnvSyncResult
} from '../../../../shared/types';
import type { ElectronAPI } from '../../../../preload/index';
import type { BridgeDeps } from './core';

/** Adaptador web (REST/WebSocket) dos canais: QA Studio & Validador Regressivo; Automated Test Runners; TAUT-Mississauga Cypress Integration (QA Hub). */
export function createQualityApi({ apiFetch, wsManager }: BridgeDeps) {
  return {
    // QA Studio & Validador Regressivo
    qaListTemplates: async (): Promise<QaRegressionTemplate[]> => {
      return apiFetch<QaRegressionTemplate[]>('/api/qa/templates');
    },
    qaGetTemplate: async (id: string): Promise<QaRegressionTemplate | null> => {
      try {
        return await apiFetch<QaRegressionTemplate>(`/api/qa/templates/${id}`);
      } catch {
        return null;
      }
    },
    qaSaveTemplate: async (template: QaRegressionTemplate): Promise<QaRegressionTemplate> => {
      return apiFetch<QaRegressionTemplate>('/api/qa/templates', {
        method: 'POST',
        body: JSON.stringify(template)
      });
    },
    qaDeleteTemplate: async (id: string): Promise<boolean> => {
      const res = await apiFetch<{ success: boolean }>(`/api/qa/templates/${id}`, {
        method: 'DELETE'
      });
      return !!res?.success;
    },
    qaExecuteSuite: async (request: QaExecutionRequest): Promise<QaExecutionResult> => {
      return apiFetch<QaExecutionResult>('/api/qa/execute', {
        method: 'POST',
        body: JSON.stringify(request)
      });
    },
    qaGetTemplatesDir: async (): Promise<string> => {
      const res = await apiFetch<{ path: string }>('/api/qa/templates-dir');
      return res.path || '';
    },
    qaSearchCorePayloads: async (
      filter: QaCoreSearchFilter,
      connectionId?: string
    ): Promise<QaCoreSearchResult> => {
      if (window.electronAPI?.qaSearchCorePayloads) {
        return window.electronAPI.qaSearchCorePayloads(filter, connectionId);
      }
      return apiFetch<QaCoreSearchResult>('/api/qa/payloads/search', {
        method: 'POST',
        body: JSON.stringify({ filter, connectionId })
      });
    },
    qaFetchApiPayload: async (request: QaApiFetchRequest): Promise<QaApiFetchResult> => {
      if (window.electronAPI?.qaFetchApiPayload) {
        return window.electronAPI.qaFetchApiPayload(request);
      }
      return apiFetch<QaApiFetchResult>('/api/qa/payloads/fetch-api', {
        method: 'POST',
        body: JSON.stringify(request)
      });
    },

    // Automated Test Runners
    testRunnerList: async (): Promise<TestRunnerConfig[]> => {
      return apiFetch<TestRunnerConfig[]>('/api/test-runner/list');
    },
    testRunnerSave: async (runner: Partial<TestRunnerConfig>): Promise<TestRunnerConfig> => {
      return apiFetch<TestRunnerConfig>('/api/test-runner/save', {
        method: 'POST',
        body: JSON.stringify(runner)
      });
    },
    testRunnerDelete: async (id: string): Promise<{ success: boolean }> => {
      return apiFetch<{ success: boolean }>(`/api/test-runner/${id}`, {
        method: 'DELETE'
      });
    },
    testRunnerExecute: async (target: string | TestRunnerConfig): Promise<TestExecutionResult> => {
      return apiFetch<TestExecutionResult>('/api/test-runner/execute', {
        method: 'POST',
        body: JSON.stringify(typeof target === 'string' ? { id: target } : target)
      });
    },
    testRunnerAbort: async (): Promise<boolean> => {
      const res = await apiFetch<{ success: boolean }>('/api/test-runner/abort', {
        method: 'POST'
      });
      return !!res?.success;
    },
    testRunnerGetHistory: async (): Promise<TestExecutionResult[]> => {
      return apiFetch<TestExecutionResult[]>('/api/test-runner/history');
    },
    testRunnerClearHistory: async (): Promise<{ success: boolean }> => {
      return apiFetch<{ success: boolean }>('/api/test-runner/clear-history', {
        method: 'POST'
      });
    },
    onTestRunnerChunk: (callback: (data: { runnerId: string; chunk: string }) => void) => {
      return wsManager.subscribe('test-runner:chunk', callback);
    },

    // TAUT-Mississauga Cypress Integration (QA Hub)
    tautGetStatus: async (customPath?: string): Promise<TautProjectStatus> => {
      const q = customPath ? `?path=${encodeURIComponent(customPath)}` : '';
      return apiFetch<TautProjectStatus>(`/api/taut/status${q}`);
    },
    tautSavePath: async (targetPath: string): Promise<{ success: boolean }> => {
      return apiFetch<{ success: boolean }>('/api/taut/path', {
        method: 'POST',
        body: JSON.stringify({ path: targetPath })
      });
    },
    tautGetCoverage: async (customPath?: string): Promise<TautCoverageReport> => {
      const q = customPath ? `?path=${encodeURIComponent(customPath)}` : '';
      return apiFetch<TautCoverageReport>(`/api/taut/coverage${q}`);
    },
    tautListSpecs: async (customPath?: string): Promise<TautSpecSummary[]> => {
      const q = customPath ? `?path=${encodeURIComponent(customPath)}` : '';
      return apiFetch<TautSpecSummary[]>(`/api/taut/specs${q}`);
    },
    tautSyncEnv: async (customPath?: string, connectionId?: string): Promise<TautEnvSyncResult> => {
      return apiFetch<TautEnvSyncResult>('/api/taut/sync-env', {
        method: 'POST',
        body: JSON.stringify({ customPath, connectionId })
      });
    },
    tautProcessIntake: async (csvFile: string, projectPath?: string): Promise<TautCsvIntakeResult> => {
      return apiFetch<TautCsvIntakeResult>('/api/taut/intake', {
        method: 'POST',
        body: JSON.stringify({ csvFile, projectPath })
      });
    },
    tautRunTests: async (options: TautRunOptions): Promise<TestExecutionResult> => {
      return apiFetch<TestExecutionResult>('/api/taut/run', {
        method: 'POST',
        body: JSON.stringify(options)
      });
    },
    tautAbortTests: async (): Promise<boolean> => {
      const res = await apiFetch<{ success: boolean }>('/api/taut/abort', {
        method: 'POST'
      });
      return !!res?.success;
    },
    onTautChunk: (callback: (data: { chunk: string }) => void) => {
      return wsManager.subscribe('taut:chunk', callback);
    }
  } satisfies Partial<ElectronAPI>;
}
