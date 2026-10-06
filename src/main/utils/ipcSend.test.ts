import { describe, expect, it, vi } from 'vitest';
import type { BrowserWindow } from 'electron';
import { safeSend } from './ipcSend';

function fakeWindow(opts: { winDestroyed?: boolean; contentsDestroyed?: boolean } = {}) {
  const send = vi.fn();
  const win = {
    isDestroyed: () => !!opts.winDestroyed,
    webContents: { isDestroyed: () => !!opts.contentsDestroyed, send }
  } as unknown as BrowserWindow;
  return { win, send };
}

describe('safeSend', () => {
  it('envia quando a janela está viva, repassando os argumentos', () => {
    const { win, send } = fakeWindow();
    safeSend(win, 'canal', { a: 1 }, 2);
    expect(send).toHaveBeenCalledWith('canal', { a: 1 }, 2);
  });

  it('descarta a mensagem sem lançar quando a janela ou o webContents foram destruídos', () => {
    const closed = fakeWindow({ winDestroyed: true });
    const detached = fakeWindow({ contentsDestroyed: true });
    expect(() => safeSend(closed.win, 'canal', 1)).not.toThrow();
    expect(() => safeSend(detached.win, 'canal', 1)).not.toThrow();
    expect(closed.send).not.toHaveBeenCalled();
    expect(detached.send).not.toHaveBeenCalled();
  });

  it('aceita janela nula ou indefinida', () => {
    expect(() => safeSend(null, 'canal')).not.toThrow();
    expect(() => safeSend(undefined, 'canal')).not.toThrow();
  });
});
