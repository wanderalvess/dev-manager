import type {
  HttpExecutionRequest,
  HttpResponseData,
  HttpCollection,
  HttpRequestItem,
  HttpEnvironment,
  PostmanImportResult,
  WinThorLoginCredentials,
  WinThorLoginResult
} from '../../../../shared/types';
import type { ElectronAPI } from '../../../../preload/index';
import type { BridgeDeps } from './core';

/**
 * Adaptador web (REST) para o API Studio / HTTP Client (Postman).
 */
type HttpClientApiKeys =
  | 'httpExecute'
  | 'httpListCollections'
  | 'httpSaveCollection'
  | 'httpDeleteCollection'
  | 'httpSaveRequest'
  | 'httpDeleteRequest'
  | 'httpImportPostman'
  | 'httpListEnvironments'
  | 'httpSaveEnvironments'
  | 'httpLoginWinThor'
  | 'httpGetHistory'
  | 'httpClearHistory';

export function createHttpClientApi({ apiFetch }: BridgeDeps): Pick<ElectronAPI, HttpClientApiKeys> {
  return {
    httpExecute: async (req: HttpExecutionRequest): Promise<HttpResponseData> => {
      return apiFetch<HttpResponseData>('/api/http-client/execute', {
        method: 'POST',
        body: JSON.stringify(req)
      });
    },

    httpListCollections: async (): Promise<HttpCollection[]> => {
      return apiFetch<HttpCollection[]>('/api/http-client/collections');
    },

    httpSaveCollection: async (collection: HttpCollection): Promise<HttpCollection> => {
      return apiFetch<HttpCollection>('/api/http-client/collections', {
        method: 'POST',
        body: JSON.stringify(collection)
      });
    },

    httpDeleteCollection: async (id: string): Promise<boolean> => {
      const res = await apiFetch<{ success: boolean }>(`/api/http-client/collections/${id}`, {
        method: 'DELETE'
      });
      return !!res?.success;
    },

    httpSaveRequest: async (request: HttpRequestItem): Promise<HttpRequestItem> => {
      return apiFetch<HttpRequestItem>('/api/http-client/requests', {
        method: 'POST',
        body: JSON.stringify(request)
      });
    },

    httpDeleteRequest: async (collectionId: string, requestId: string): Promise<boolean> => {
      const res = await apiFetch<{ success: boolean }>(`/api/http-client/requests/${collectionId}/${requestId}`, {
        method: 'DELETE'
      });
      return !!res?.success;
    },

    httpImportPostman: async (jsonContent: string): Promise<PostmanImportResult> => {
      return apiFetch<PostmanImportResult>('/api/http-client/import-postman', {
        method: 'POST',
        body: JSON.stringify({ jsonContent })
      });
    },

    httpListEnvironments: async (): Promise<HttpEnvironment[]> => {
      return apiFetch<HttpEnvironment[]>('/api/http-client/environments');
    },

    httpSaveEnvironments: async (envs: HttpEnvironment[]): Promise<{ success: boolean }> => {
      return apiFetch<{ success: boolean }>('/api/http-client/environments', {
        method: 'POST',
        body: JSON.stringify(envs)
      });
    },

    httpLoginWinThor: async (creds: WinThorLoginCredentials): Promise<WinThorLoginResult> => {
      return apiFetch<WinThorLoginResult>('/api/http-client/login-winthor', {
        method: 'POST',
        body: JSON.stringify(creds)
      });
    },

    httpGetHistory: async (): Promise<HttpResponseData[]> => {
      return apiFetch<HttpResponseData[]>('/api/http-client/history');
    },

    httpClearHistory: async (): Promise<{ success: boolean }> => {
      return apiFetch<{ success: boolean }>('/api/http-client/history/clear', {
        method: 'POST'
      });
    }
  };
}
