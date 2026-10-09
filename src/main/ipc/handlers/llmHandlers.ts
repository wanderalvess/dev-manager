import { ipcMain } from 'electron';
import { LlmProviderConfig, LlmChatRequest, LlmRagQueryRequest } from '../../../shared/types';
import type { IpcContext } from '../ipcContext';

/** IA e modelos LLM (BYOK). Canais: llm:* */
export function registerLlmHandlers(ctx: IpcContext): void {
  const { llmService } = ctx;

  const handleTestLlm = async (_: any, config: LlmProviderConfig) => {
    return await llmService.testConnection(config);
  };
  const handleChatLlm = async (_: any, request: LlmChatRequest) => {
    return await llmService.chat(request);
  };
  const handleAskDocs = async (_: any, request: LlmRagQueryRequest) => {
    return await llmService.askWithDocs(request);
  };

  ipcMain.handle('llm:test-connection', handleTestLlm);
  ipcMain.handle('llm:chat', handleChatLlm);
  ipcMain.handle('llm:ask-with-docs', handleAskDocs);
}
