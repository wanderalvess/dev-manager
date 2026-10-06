import type { BrowserWindow } from 'electron';

/**
 * `webContents.send` em janela já fechada lança "Object has been destroyed" (comum quando o usuário fecha o app no
 * meio de um stream de log, deploy ou backup). Aqui a mensagem simplesmente é descartada.
 */
export function safeSend(win: BrowserWindow | null | undefined, channel: string, ...args: unknown[]): void {
  if (!win || win.isDestroyed()) return;
  const contents = win.webContents;
  if (!contents || contents.isDestroyed()) return;
  contents.send(channel, ...args);
}
