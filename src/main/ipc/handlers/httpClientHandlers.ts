import { ipcMain } from 'electron';
import type { IpcContext } from '../ipcContext';
import {
  HttpCollection,
  HttpRequestItem,
  HttpExecutionRequest,
  HttpEnvironment,
  WinThorLoginCredentials
} from '../../../shared/httpClientTypes';

/**
 * Registra todos os handlers de IPC para o API Studio / HTTP Client.
 * Canais: http:*
 */
export function registerHttpClientHandlers(ctx: IpcContext): void {
  const { httpClientService, httpCollectionService } = ctx;

  ipcMain.handle('http:execute', async (_, req: HttpExecutionRequest) => {
    return httpClientService.executeRequest(req);
  });

  ipcMain.handle('http:list-collections', async () => {
    return httpCollectionService.getCollections();
  });

  ipcMain.handle('http:save-collection', async (_, collection: HttpCollection) => {
    return httpCollectionService.saveCollection(collection);
  });

  ipcMain.handle('http:delete-collection', async (_, id: string) => {
    return httpCollectionService.deleteCollection(id);
  });

  ipcMain.handle('http:save-request', async (_, request: HttpRequestItem) => {
    return httpCollectionService.saveRequest(request);
  });

  ipcMain.handle('http:delete-request', async (_, collectionId: string, requestId: string) => {
    return httpCollectionService.deleteRequest(collectionId, requestId);
  });

  ipcMain.handle('http:import-postman', async (_, jsonContent: string) => {
    return httpCollectionService.importPostman(jsonContent);
  });

  ipcMain.handle('http:list-environments', async () => {
    return httpCollectionService.getEnvironments();
  });

  ipcMain.handle('http:save-environments', async (_, envs: HttpEnvironment[]) => {
    httpCollectionService.saveEnvironments(envs);
    return { success: true };
  });

  ipcMain.handle('http:login-winthor', async (_, creds: WinThorLoginCredentials) => {
    return httpClientService.loginWinThor(creds);
  });

  ipcMain.handle('http:get-history', async () => {
    return httpClientService.getHistory();
  });

  ipcMain.handle('http:clear-history', async () => {
    httpClientService.clearHistory();
    return { success: true };
  });
}
