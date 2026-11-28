import type {
  KbAskResponse,
  KbDivergenceReport,
  KbSearchRequest,
  KbSearchResponse
} from '../../../../shared/knowledgeBaseTypes';
import type { KbAskParams } from '../../../../main/services/kb/KnowledgeBaseClient';
import type { KbImportProgress, KbImportSummary } from '../../../../main/services/kb/KnowledgeBaseImportService';
import type { KbStatus } from '../../../../main/services/kb/KnowledgeBaseService';
import type { ElectronAPI } from '../../../../preload/index';
import type { BridgeDeps } from './core';

/** Adaptador web (REST/WebSocket) dos canais kb:* (Base de Conhecimento compartilhada). */
export function createKnowledgeBaseApi({ apiFetch, wsManager }: BridgeDeps) {
  const post = <T>(url: string, body: unknown) => apiFetch<T>(url, { method: 'POST', body: JSON.stringify(body) });
  return {
    kbStatus: () => apiFetch<KbStatus>('/api/knowledge-base/status'),
    kbSearch: (request: KbSearchRequest) => post<KbSearchResponse>('/api/knowledge-base/search', request),
    kbAsk: (params: KbAskParams) => post<KbAskResponse>('/api/knowledge-base/ask', params),
    kbDivergences: (module?: string, limit?: number) => {
      const q = new URLSearchParams();
      if (module) q.set('module', module);
      if (limit) q.set('limit', String(limit));
      const qs = q.toString();
      return apiFetch<KbDivergenceReport>(`/api/knowledge-base/divergences${qs ? `?${qs}` : ''}`);
    },
    kbImport: (version?: string) => post<KbImportSummary>('/api/knowledge-base/import', { version }),
    onKbImportProgress: (callback: (progress: KbImportProgress) => void) =>
      wsManager.subscribe('kb:import-progress', callback)
  } satisfies Partial<ElectronAPI>;
}
