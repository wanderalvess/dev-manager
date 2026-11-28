import { ipcRenderer } from 'electron';
import type {
  KbAskResponse,
  KbDivergenceReport,
  KbSearchRequest,
  KbSearchResponse
} from '../shared/knowledgeBaseTypes';
import type { KbAskParams } from '../main/services/kb/KnowledgeBaseClient';
import type { KbImportProgress, KbImportSummary } from '../main/services/kb/KnowledgeBaseImportService';
import type { KbStatus } from '../main/services/kb/KnowledgeBaseService';

/** Canais kb:* do preload (Base de Conhecimento compartilhada), isolados para não crescer o index.ts. */
export const knowledgeBaseApi = {
  kbStatus: (): Promise<KbStatus> => ipcRenderer.invoke('kb:status'),
  kbSearch: (request: KbSearchRequest): Promise<KbSearchResponse> => ipcRenderer.invoke('kb:search', request),
  kbAsk: (params: KbAskParams): Promise<KbAskResponse> => ipcRenderer.invoke('kb:ask', params),
  kbDivergences: (module?: string, limit?: number): Promise<KbDivergenceReport> =>
    ipcRenderer.invoke('kb:divergences', module, limit),
  kbImport: (version?: string): Promise<KbImportSummary> => ipcRenderer.invoke('kb:import', version),
  onKbImportProgress: (callback: (progress: KbImportProgress) => void) => {
    const subscription = (_: unknown, progress: KbImportProgress) => callback(progress);
    ipcRenderer.on('kb:import-progress', subscription);
    return () => {
      ipcRenderer.removeListener('kb:import-progress', subscription);
    };
  }
};
