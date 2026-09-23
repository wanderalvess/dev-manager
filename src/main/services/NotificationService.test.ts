import { describe, expect, it, vi, beforeEach } from 'vitest';

interface RecordedNotification {
  title: string;
  body: string;
  show: ReturnType<typeof vi.fn>;
}

const notificationInstances: RecordedNotification[] = [];
let isSupported = true;

// 'electron' só existe como API real dentro de um processo Electron. Em Vitest (Node puro),
// precisa ser mockado antes do import — mesma razão pela qual este service nunca tinha teste.
vi.mock('electron', () => ({
  Notification: class {
    static isSupported() {
      return isSupported;
    }
    show = vi.fn();
    constructor(public options: { title: string; body: string }) {
      notificationInstances.push({ ...options, show: this.show });
    }
  }
}));

const { notifyUser } = await import('./NotificationService');

describe('notifyUser', () => {
  beforeEach(() => {
    notificationInstances.length = 0;
    isSupported = true;
  });

  it('envia o evento para o renderer via webContents.send', () => {
    const send = vi.fn();
    const mainWindow = { webContents: { send } } as any;

    notifyUser(mainWindow, 'deploy:done', { ok: true }, { title: 'T', body: 'B' });

    expect(send).toHaveBeenCalledWith('deploy:done', { ok: true });
  });

  it('dispara notificação nativa do SO quando suportada', () => {
    const mainWindow = { webContents: { send: vi.fn() } } as any;

    notifyUser(mainWindow, 'x', {}, { title: 'Título', body: 'Corpo' });

    expect(notificationInstances).toHaveLength(1);
    expect(notificationInstances[0].title).toBe('Título');
    expect(notificationInstances[0].body).toBe('Corpo');
    expect(notificationInstances[0].show).toHaveBeenCalled();
  });

  it('não dispara notificação nativa quando o SO não suporta', () => {
    isSupported = false;
    const mainWindow = { webContents: { send: vi.fn() } } as any;

    notifyUser(mainWindow, 'x', {}, { title: 'T', body: 'B' });

    expect(notificationInstances).toHaveLength(0);
  });

  it('não lança erro quando mainWindow é null (janela fechada)', () => {
    expect(() => notifyUser(null, 'x', {}, { title: 'T', body: 'B' })).not.toThrow();
    expect(notificationInstances).toHaveLength(1);
  });
});
