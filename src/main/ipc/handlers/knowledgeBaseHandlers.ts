import { ipcMain } from 'electron';
import type { KbSearchRequest } from '../../../shared/knowledgeBaseTypes';
import type { KbAskParams } from '../../services/kb/KnowledgeBaseClient';
import { safeSend } from '../../utils/ipcSend';
import type { IpcContext } from '../ipcContext';

/** Base de Conhecimento compartilhada (Agile Space). Canais: kb:* */
export function registerKnowledgeBaseHandlers(ctx: IpcContext): void {
  const { mainWindow, knowledgeBaseService } = ctx;

  ipcMain.handle('kb:status', () => knowledgeBaseService.getStatus());
  ipcMain.handle('kb:search', (_, request: KbSearchRequest) => knowledgeBaseService.search(request));
  ipcMain.handle('kb:ask', (_, params: KbAskParams) => knowledgeBaseService.ask(params));
  ipcMain.handle('kb:divergences', (_, module?: string, limit?: number) =>
    knowledgeBaseService.divergences(module, limit)
  );
  ipcMain.handle('kb:sync-embeddings', () =>
    knowledgeBaseService.syncEmbeddings({
      downloadModel: true,
      onProgress: (progress) => safeSend(mainWindow, 'kb:embeddings-progress', progress)
    })
  );
  ipcMain.handle('kb:import', (_, version?: string) =>
    knowledgeBaseService.importFolder({
      version,
      onProgress: (progress) => safeSend(mainWindow, 'kb:import-progress', progress)
    })
  );
}
