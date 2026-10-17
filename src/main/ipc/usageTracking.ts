import type { UsageMetricsService } from '../services/UsageMetricsService';
import { findTrackedIpcAction } from '../../shared/usageActions';

/** Assinatura de um listener do `ipcMain.handle`: o evento do Electron e os argumentos vindos do renderer. */
type IpcListener = (event: any, ...args: any[]) => unknown;

/** O pedaço de `ipcMain` que interessa: só `handle`. Facilita testar sem Electron. */
export interface IpcHandleTarget {
  handle: (channel: string, listener: IpcListener) => unknown;
}

/**
 * Faz os canais IPC da lista de ações rastreadas (usageActions.ts) passarem pelo
 * `UsageMetricsService.track`. Os handlers continuam sendo registrados com `ipcMain.handle(...)`
 * como sempre — o wrapper intercepta o `handle` só durante o registro e devolve o original em
 * seguida, então nenhum handler precisa saber de métricas.
 *
 * Devolve a função que desfaz a interceptação.
 */
export function installIpcUsageTracking(ipc: IpcHandleTarget, usage: UsageMetricsService): () => void {
  // `ipcMain.handle` é método do protótipo: guarda a referência (sem `bind`) para devolver
  // exatamente a mesma função e, se ela não era própria do objeto, remover a sobrescrita.
  const original = ipc.handle;
  const wasOwn = Object.prototype.hasOwnProperty.call(ipc, 'handle');
  ipc.handle = (channel, listener) => {
    const action = findTrackedIpcAction(channel);
    if (!action) return original.call(ipc, channel, listener);
    const run = listener as (event: unknown, ...args: unknown[]) => unknown;
    return original.call(ipc, channel, ((event: unknown, ...args: unknown[]) =>
      usage.track({ module: action.module, action: action.action, origin: 'ui' }, () =>
        run(event, ...args)
      )) as never);
  };
  return () => {
    if (wasOwn) ipc.handle = original;
    else delete (ipc as Partial<IpcHandleTarget>).handle;
  };
}
