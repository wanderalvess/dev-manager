import { BrowserWindow, Notification } from 'electron';

/**
 * Notifica o usuário sobre um evento concluído em segundo plano (deploy, build, reindex),
 * mesmo padrão hoje usado ad-hoc só pra backup agendado (src/main/index.ts): empurra o
 * evento pro renderer via webContents.send (pra virar toast mesmo com a janela em foco) E
 * dispara uma notificação nativa do SO (pra quando a janela está minimizada/em segundo plano).
 * Serviço fininho e sem estado — não guarda referência a mainWindow, recebe a cada chamada,
 * porque quem chama (registerIpc.ts) já tem essa referência e este serviço não precisa de mais nada.
 */
export function notifyUser(
  mainWindow: BrowserWindow | null,
  channel: string,
  payload: unknown,
  native: { title: string; body: string }
): void {
  mainWindow?.webContents.send(channel, payload);
  if (Notification.isSupported()) {
    new Notification({ title: native.title, body: native.body }).show();
  }
}
