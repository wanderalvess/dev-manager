import type {
  DocSearchResult,
  DocsIndexStatus,
  ConfluenceSourceConfig,
  JiraSourceConfig,
  DocsIndexProgress,
  DocSyncProgress,
  DocSyncResult,
  LlmProviderConfig,
  LlmChatRequest,
  LlmChatResponse,
  LlmTestResult,
  LlmRagQueryRequest,
  LlmRagQueryResponse
} from '../../../../shared/types';
import type { ElectronAPI } from '../../../../preload/index';
import type { BridgeDeps } from './core';

/** Adaptador web (REST/WebSocket) dos canais: Índice de Documentação (RAG local). */
export function createDocsApi({ apiFetch, wsManager }: BridgeDeps) {
  return {
    // Índice de Documentação (RAG local)
    reindexDocs: async (): Promise<DocsIndexStatus> => {
      return apiFetch('/api/docs/reindex', { method: 'POST' });
    },

    searchDocs: async (query: string, options?: { sourceLabel?: string; topK?: number }): Promise<DocSearchResult[]> => {
      const params = new URLSearchParams({ query });
      if (options?.sourceLabel) params.set('sourceLabel', options.sourceLabel);
      if (options?.topK) params.set('topK', String(options.topK));
      return apiFetch(`/api/docs/search?${params.toString()}`);
    },

    getDocsIndexStatus: async (): Promise<DocsIndexStatus> => {
      return apiFetch('/api/docs/status');
    },

    testConfluenceConnection: async (config: ConfluenceSourceConfig): Promise<{ success: boolean; message: string }> => {
      return apiFetch('/api/docs/test-confluence-connection', {
        method: 'POST',
        body: JSON.stringify(config)
      });
    },

    testJiraConnection: async (config: JiraSourceConfig): Promise<{ success: boolean; message: string }> => {
      return apiFetch('/api/docs/test-jira-connection', {
        method: 'POST',
        body: JSON.stringify(config)
      });
    },

    testLlmConnection: async (config: LlmProviderConfig): Promise<LlmTestResult> => {
      return apiFetch('/api/llm/test-connection', {
        method: 'POST',
        body: JSON.stringify(config)
      });
    },

    llmChat: async (request: LlmChatRequest): Promise<LlmChatResponse> => {
      return apiFetch('/api/llm/chat', {
        method: 'POST',
        body: JSON.stringify(request)
      });
    },

    askDocsWithAi: async (request: LlmRagQueryRequest): Promise<LlmRagQueryResponse> => {
      return apiFetch('/api/llm/ask-with-docs', {
        method: 'POST',
        body: JSON.stringify(request)
      });
    },

    askLlm: async (request: LlmRagQueryRequest, providerConfig?: LlmProviderConfig): Promise<LlmRagQueryResponse> => {
      return apiFetch('/api/llm/ask-with-docs', {
        method: 'POST',
        body: JSON.stringify({ ...request, providerId: providerConfig?.id })
      });
    },

    chatLlm: async (request: LlmChatRequest, providerConfig?: LlmProviderConfig): Promise<LlmChatResponse> => {
      return apiFetch('/api/llm/chat', {
        method: 'POST',
        body: JSON.stringify({ ...request, providerId: providerConfig?.id })
      });
    },

    openDocFile: async (filePath: string, mode?: 'editor' | 'folder'): Promise<boolean> => {
      if (mode === 'folder') {
        window.prompt('Localização do arquivo:', filePath);
      } else {
        window.prompt('Caminho do arquivo (copie e abra no seu editor):', filePath);
      }
      return true;
    },

    readDocContent: async (filePath: string): Promise<string | null> => {
      try {
        const res = await apiFetch<{ content: string | null }>(`/api/docs/content?path=${encodeURIComponent(filePath)}`);
        return res.content;
      } catch {
        return null;
      }
    },

    onDocsIndexProgress: (callback: (progress: DocsIndexProgress) => void) => {
      return wsManager.subscribe('docs:index-progress', callback);
    },

    syncDocs: async (targetId?: string): Promise<DocSyncResult[]> => {
      return apiFetch('/api/docs/sync', {
        method: 'POST',
        body: JSON.stringify({ targetId })
      });
    },

    onDocSyncProgress: (callback: (progress: DocSyncProgress) => void) => {
      return wsManager.subscribe('docs:sync-progress', callback);
    }
  } satisfies Partial<ElectronAPI>;
}
