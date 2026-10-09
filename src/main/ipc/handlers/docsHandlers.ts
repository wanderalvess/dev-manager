import { ipcMain, shell } from 'electron';
import fs from 'fs';
import { DocSyncService } from '../../services/DocsIndexService';
import { ConfluenceSource } from '../../services/docSources/ConfluenceSource';
import { JiraSource } from '../../services/docSources/JiraSource';
import { DocsIndexProgress, ConfluenceSourceConfig, JiraSourceConfig } from '../../../shared/types';
import { isSafePath } from '../../utils/security';
import { safeSend } from '../../utils/ipcSend';
import type { IpcContext } from '../ipcContext';

/** Documentação: índice RAG, fontes e sincronização. Canais: docs:* */
export function registerDocsHandlers(ctx: IpcContext): void {
  const { mainWindow, configService, docsIndexService } = ctx;

  ipcMain.handle('docs:reindex', async () => {
    return await docsIndexService.reindex((progress: DocsIndexProgress) => {
      safeSend(mainWindow, 'docs:index-progress', progress);
    });
  });

  ipcMain.handle('docs:search', async (_, query: string, options?: { sourceLabel?: string; topK?: number }) => {
    return await docsIndexService.search(query, options);
  });

  ipcMain.handle('docs:get-status', async () => {
    return docsIndexService.getStatus();
  });

  ipcMain.handle('docs:test-confluence-connection', async (_, config: ConfluenceSourceConfig) => {
    try {
      const entries = await new ConfluenceSource(config).listEntries();
      return { success: true, message: `Conectado com sucesso: ${entries.length} página(s) encontrada(s).` };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Falha ao conectar no Confluence.' };
    }
  });

  ipcMain.handle('docs:test-jira-connection', async (_, config: JiraSourceConfig) => {
    try {
      const entries = await new JiraSource(config).listEntries();
      return { success: true, message: `Conectado com sucesso: ${entries.length} issue(s) encontrada(s).` };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Falha ao conectar no Jira.' };
    }
  });

  const docSyncService = new DocSyncService(configService, docsIndexService);

  ipcMain.handle('docs:sync', async (_, targetId?: string) => {
    return await docSyncService.syncToTarget(targetId, (progress) => {
      safeSend(mainWindow, 'docs:sync-progress', progress);
    });
  });

  ipcMain.handle('docs:open-file', async (_, filePath: string, mode?: 'editor' | 'folder') => {
    const settings = configService.getSettings();
    const allowedBaseDirs = [settings.projectsPath, ...(settings.docFolders || []).map((f) => f.path)].filter(Boolean);
    const isAllowed = allowedBaseDirs.some((base) => isSafePath(filePath, base));
    if (!isAllowed) {
      console.warn('[Segurança] Bloqueada tentativa de abrir arquivo fora das pastas de documentação configuradas:', filePath);
      return false;
    }
    if (mode === 'editor') {
      try {
        await shell.openPath(filePath);
        return true;
      } catch {
        shell.showItemInFolder(filePath);
        return true;
      }
    }
    shell.showItemInFolder(filePath);
    return true;
  });

  ipcMain.handle('docs:read-content', async (_, filePath: string) => {
    const settings = configService.getSettings();
    const allowedBaseDirs = [settings.projectsPath, ...(settings.docFolders || []).map((f) => f.path)].filter(Boolean);
    const isAllowed = allowedBaseDirs.some((base) => isSafePath(filePath, base));
    if (!isAllowed) {
      console.warn('[Segurança] Bloqueada leitura de arquivo fora das pastas permitidas:', filePath);
      return null;
    }
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size > 2 * 1024 * 1024) {
          return '(Arquivo muito grande para pré-visualização direta. Abra no editor externo.)';
        }
        return fs.readFileSync(filePath, 'utf-8');
      }
    } catch (err) {
      console.error('[Docs] Falha ao ler conteúdo do arquivo:', err);
    }
    return null;
  });
}
