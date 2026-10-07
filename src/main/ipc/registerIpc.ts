import type { IpcContext } from './ipcContext';
import { registerSystemHandlers } from './handlers/systemHandlers';
import { registerEnvironmentHandlers } from './handlers/environmentHandlers';
import { registerKarafHandlers } from './handlers/karafHandlers';
import { registerRoutine801Handlers } from './handlers/routine801Handlers';
import { registerDeployHandlers } from './handlers/deployHandlers';
import { registerGitHandlers } from './handlers/gitHandlers';
import { registerRoutinesHandlers } from './handlers/routinesHandlers';
import { registerDocsHandlers } from './handlers/docsHandlers';
import { registerLlmHandlers } from './handlers/llmHandlers';
import { registerSettingsHandlers } from './handlers/settingsHandlers';
import { registerDatabaseHandlers } from './handlers/databaseHandlers';
import { registerWslHandlers } from './handlers/wslHandlers';
import { registerContainerHandlers } from './handlers/containersHandlers';
import { registerNetworkHandlers } from './handlers/networkHandlers';
import { registerLogsHandlers } from './handlers/logsHandlers';
import { registerUpdateHandlers } from './handlers/updateHandlers';
import { registerApmHandlers } from './handlers/apmHandlers';
import { registerQualityHandlers } from './handlers/qualityHandlers';

export type { IpcContext } from './ipcContext';

/** Registra todos os canais IPC do app; cada grupo vive em `handlers/` e recebe o mesmo contexto. */
export function registerIpcHandlers(ctx: IpcContext): void {
  registerSystemHandlers(ctx);
  registerEnvironmentHandlers(ctx);
  registerKarafHandlers(ctx);
  registerRoutine801Handlers(ctx);
  registerDeployHandlers(ctx);
  registerGitHandlers(ctx);
  registerRoutinesHandlers(ctx);
  registerDocsHandlers(ctx);
  registerLlmHandlers(ctx);
  registerSettingsHandlers(ctx);
  registerDatabaseHandlers(ctx);
  registerWslHandlers(ctx);
  registerContainerHandlers(ctx);
  registerNetworkHandlers(ctx);
  registerLogsHandlers(ctx);
  registerUpdateHandlers(ctx);
  registerApmHandlers(ctx);
  registerQualityHandlers(ctx);
}
