import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerConfirmHandler, requestConfirm, showNotice, type ConfirmRequest } from './confirmService';

describe('requestConfirm', () => {
  const cleanups: Array<() => void> = [];

  afterEach(() => {
    cleanups.splice(0).forEach((fn) => fn());
    vi.unstubAllGlobals();
  });

  it('entrega o pedido ao host registrado e resolve com a resposta do usuário', async () => {
    let received: ConfirmRequest | null = null;
    cleanups.push(registerConfirmHandler((request) => (received = request)));

    const pending = requestConfirm({ title: 'Apagar?', message: 'Sem volta', tone: 'danger' });
    expect(received).not.toBeNull();
    expect(received!.options.title).toBe('Apagar?');
    expect(received!.options.tone).toBe('danger');

    received!.resolve(true);
    await expect(pending).resolves.toBe(true);
  });

  it('cada pedido é independente: um "não" não afeta o outro', async () => {
    const requests: ConfirmRequest[] = [];
    cleanups.push(registerConfirmHandler((request) => requests.push(request)));

    const first = requestConfirm({ title: 'A', message: 'a' });
    const second = requestConfirm({ title: 'B', message: 'b' });
    requests[0].resolve(false);
    requests[1].resolve(true);

    await expect(first).resolves.toBe(false);
    await expect(second).resolves.toBe(true);
  });

  it('sem host montado cai no confirm nativo, com título e mensagem juntos', async () => {
    const confirmFn = vi.fn(() => true);
    vi.stubGlobal('window', { confirm: confirmFn });

    await expect(requestConfirm({ title: 'Título', message: 'Mensagem' })).resolves.toBe(true);
    expect(confirmFn).toHaveBeenCalledWith('Título\n\nMensagem');
  });

  it('sem host e sem window (ambiente sem DOM) não confirma nada por engano', async () => {
    vi.stubGlobal('window', undefined);
    await expect(requestConfirm({ title: 'x', message: 'y' })).resolves.toBe(false);
  });

  it('desregistrar só vale para o host que se registrou (um host novo não é derrubado pelo antigo)', async () => {
    const stale = registerConfirmHandler(() => undefined);
    let received: ConfirmRequest | null = null;
    cleanups.push(registerConfirmHandler((request) => (received = request)));
    stale();

    const pending = requestConfirm({ title: 't', message: 'm' });
    expect(received).not.toBeNull();
    received!.resolve(true);
    await expect(pending).resolves.toBe(true);
  });
});

describe('showNotice', () => {
  it('abre o diálogo só com o botão de confirmar e resolve quando o usuário o aciona', async () => {
    let received: ConfirmRequest | null = null;
    const off = registerConfirmHandler((request) => (received = request));

    const pending = showNotice({ title: 'Atenção', message: 'Leia isto' });
    expect(received!.options.hideCancel).toBe(true);
    expect(received!.options.confirmLabel).toBe('Entendi');

    received!.resolve(true);
    await expect(pending).resolves.toBeUndefined();
    off();
  });
});
