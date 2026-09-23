import { describe, expect, it, vi, beforeEach } from 'vitest';

type Handler = (...args: any[]) => void;

const listeners = new Map<string, Handler>();
const autoUpdaterMock = {
  autoDownload: true,
  on: vi.fn((event: string, handler: Handler) => {
    listeners.set(event, handler);
  }),
  checkForUpdates: vi.fn(() => Promise.resolve()),
  downloadUpdate: vi.fn(() => Promise.resolve()),
  quitAndInstall: vi.fn()
};

// 'electron-updater' depende de um processo Electron real pra funcionar de verdade; em
// Vitest (Node puro) precisa ser mockado antes do import.
vi.mock('electron-updater', () => ({ autoUpdater: autoUpdaterMock }));

const { AutoUpdateService } = await import('./AutoUpdateService');

describe('AutoUpdateService', () => {
  beforeEach(() => {
    listeners.clear();
    autoUpdaterMock.autoDownload = true;
    autoUpdaterMock.checkForUpdates.mockClear();
    autoUpdaterMock.checkForUpdates.mockImplementation(() => Promise.resolve());
    autoUpdaterMock.downloadUpdate.mockClear();
    autoUpdaterMock.downloadUpdate.mockImplementation(() => Promise.resolve());
    autoUpdaterMock.quitAndInstall.mockClear();
  });

  it('desativa autoDownload na construção (download só começa sob pedido explícito do usuário)', () => {
    new AutoUpdateService(vi.fn());
    expect(autoUpdaterMock.autoDownload).toBe(false);
  });

  it('mapeia cada evento do autoUpdater para o shape UpdateStatus esperado pela UI', () => {
    const onStatus = vi.fn();
    new AutoUpdateService(onStatus);

    listeners.get('checking-for-update')?.();
    expect(onStatus).toHaveBeenLastCalledWith({ status: 'checking' });

    listeners.get('update-available')?.({ version: '1.2.3' });
    expect(onStatus).toHaveBeenLastCalledWith({ status: 'available', version: '1.2.3' });

    listeners.get('update-not-available')?.();
    expect(onStatus).toHaveBeenLastCalledWith({ status: 'not-available' });

    listeners.get('download-progress')?.({ percent: 42 });
    expect(onStatus).toHaveBeenLastCalledWith({ status: 'downloading', percent: 42 });

    listeners.get('update-downloaded')?.({ version: '1.2.3' });
    expect(onStatus).toHaveBeenLastCalledWith({ status: 'downloaded', version: '1.2.3' });

    listeners.get('error')?.(new Error('boom'));
    expect(onStatus).toHaveBeenLastCalledWith({ status: 'error', message: 'boom' });

    listeners.get('error')?.('erro sem propriedade message');
    expect(onStatus).toHaveBeenLastCalledWith({ status: 'error', message: 'erro sem propriedade message' });
  });

  it('checkForUpdates() delega para autoUpdater.checkForUpdates()', () => {
    const service = new AutoUpdateService(vi.fn());
    service.checkForUpdates();
    expect(autoUpdaterMock.checkForUpdates).toHaveBeenCalledTimes(1);
  });

  it('downloadUpdate() delega para autoUpdater.downloadUpdate()', () => {
    const service = new AutoUpdateService(vi.fn());
    service.downloadUpdate();
    expect(autoUpdaterMock.downloadUpdate).toHaveBeenCalledTimes(1);
  });

  it('quitAndInstall() delega para autoUpdater.quitAndInstall()', () => {
    const service = new AutoUpdateService(vi.fn());
    service.quitAndInstall();
    expect(autoUpdaterMock.quitAndInstall).toHaveBeenCalledTimes(1);
  });

  it('checkForUpdates() não lança quando a promise rejeita, evitando unhandled rejection', async () => {
    autoUpdaterMock.checkForUpdates.mockImplementationOnce(() => Promise.reject(new Error('falha de rede')));
    const service = new AutoUpdateService(vi.fn());
    expect(() => service.checkForUpdates()).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('downloadUpdate() não lança quando a promise rejeita, evitando unhandled rejection', async () => {
    autoUpdaterMock.downloadUpdate.mockImplementationOnce(() => Promise.reject(new Error('falha de rede')));
    const service = new AutoUpdateService(vi.fn());
    expect(() => service.downloadUpdate()).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});
