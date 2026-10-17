import { describe, expect, it, vi } from 'vitest';
import type { UsageMetricsService } from '../services/UsageMetricsService';
import { installIpcUsageTracking, type IpcHandleTarget } from './usageTracking';

function makeTarget() {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const target: IpcHandleTarget = {
    handle: (channel, listener) => {
      handlers.set(channel, listener as (...args: unknown[]) => unknown);
    }
  };
  return { target, handlers };
}

function makeUsage() {
  const track = vi.fn(async (_info: unknown, run: () => unknown) => run());
  return { usage: { track } as unknown as UsageMetricsService, track };
}

describe('installIpcUsageTracking', () => {
  it('canal da lista passa pelo track com módulo, ação e origem ui', async () => {
    const { target, handlers } = makeTarget();
    const { usage, track } = makeUsage();
    installIpcUsageTracking(target, usage);

    const handler = vi.fn(async (_event: unknown, id: string) => `ok:${id}`);
    target.handle('db:run-backup', handler as never);

    const result = await handlers.get('db:run-backup')!({ sender: 1 }, 'conexao-1');
    expect(result).toBe('ok:conexao-1');
    expect(handler).toHaveBeenCalledWith({ sender: 1 }, 'conexao-1');
    expect(track).toHaveBeenCalledTimes(1);
    expect(track.mock.calls[0][0]).toEqual({ module: 'database', action: 'backup-run', origin: 'ui' });
  });

  it('canal fora da lista (polling, leitura) não é medido', async () => {
    const { target, handlers } = makeTarget();
    const { usage, track } = makeUsage();
    installIpcUsageTracking(target, usage);

    const handler = vi.fn(async () => 'ips');
    target.handle('network:get-ips', handler as never);
    await handlers.get('network:get-ips')!();

    expect(handlers.get('network:get-ips')).toBe(handler);
    expect(track).not.toHaveBeenCalled();
  });

  it('o erro do handler continua chegando ao renderer', async () => {
    const { target, handlers } = makeTarget();
    const track = vi.fn(async (_info: unknown, run: () => unknown) => run());
    installIpcUsageTracking(target, { track } as unknown as UsageMetricsService);

    target.handle('taut:run-tests', (async () => {
      throw new Error('falhou');
    }) as never);
    await expect(handlers.get('taut:run-tests')!({})).rejects.toThrow('falhou');
  });

  it('o restore remove a sobrescrita quando o handle vinha do protótipo (caso do ipcMain)', () => {
    class FakeIpcMain {
      handlers = new Map<string, unknown>();
      handle(channel: string, listener: unknown) {
        this.handlers.set(channel, listener);
      }
    }
    const ipc = new FakeIpcMain();
    const { usage } = makeUsage();

    const restore = installIpcUsageTracking(ipc as unknown as IpcHandleTarget, usage);
    expect(Object.prototype.hasOwnProperty.call(ipc, 'handle')).toBe(true);
    restore();
    expect(Object.prototype.hasOwnProperty.call(ipc, 'handle')).toBe(false);
    expect(ipc.handle).toBe(FakeIpcMain.prototype.handle);
  });

  it('o restore devolve o handle original', async () => {
    const { target, handlers } = makeTarget();
    const originalHandle = target.handle;
    const { usage, track } = makeUsage();

    const restore = installIpcUsageTracking(target, usage);
    expect(target.handle).not.toBe(originalHandle);
    restore();
    expect(target.handle).toBe(originalHandle);

    target.handle('db:run-backup', (async () => 1) as never);
    await handlers.get('db:run-backup')!({});
    expect(track).not.toHaveBeenCalled();
  });
});
