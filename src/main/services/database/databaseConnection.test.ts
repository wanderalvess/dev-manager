import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DatabaseConnectionConfig } from '../../../shared/types';
import type { CachedConnection, DatabaseContext } from './databaseContext';
import { withConnection } from './databaseConnection';

function makeCtx(idleMs: number): DatabaseContext {
  return {
    connCache: new Map<string, Promise<CachedConnection>>(),
    idleMs,
    resolveConnectionConfig: (c: DatabaseConnectionConfig) => c
  } as unknown as DatabaseContext;
}

const base: DatabaseConnectionConfig = {
  id: 'c1',
  name: 'x',
  type: 'oracle',
  host: 'h',
  port: 1521,
  database: 'svc',
  user: 'u',
  password: 'senha-1'
};

describe('withConnection (conexão reutilizada)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('não fecha a conexão no meio de uma execução mais longa que idleMs', async () => {
    const ctx = makeCtx(1000);
    const close = vi.fn().mockResolvedValue(undefined);
    const getConn = vi.fn().mockResolvedValue({ id: 1 });

    const run = withConnection(
      ctx,
      base,
      getConn,
      close,
      async () => {
        await new Promise((r) => setTimeout(r, 5000));
        return 'ok';
      },
      true
    );

    await vi.advanceTimersByTimeAsync(4000);
    expect(close).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);
    await expect(run).resolves.toBe('ok');
    expect(close).not.toHaveBeenCalled();

    // só depois de idleMs sem uso a conexão é fechada
    await vi.advanceTimersByTimeAsync(1001);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('com execuções concorrentes, só arma o timer quando a última termina', async () => {
    const ctx = makeCtx(1000);
    const close = vi.fn().mockResolvedValue(undefined);
    const getConn = vi.fn().mockResolvedValue({});
    const slow = (ms: number) => async () => {
      await new Promise((r) => setTimeout(r, ms));
      return ms;
    };

    const a = withConnection(ctx, base, getConn, close, slow(3000), true);
    const b = withConnection(ctx, base, getConn, close, slow(3000), true);
    await vi.advanceTimersByTimeAsync(6000);
    await Promise.all([a, b]);
    expect(close).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1001);
    expect(close).toHaveBeenCalledTimes(1);
    expect(getConn).toHaveBeenCalledTimes(1);
  });

  it('descarta a conexão quando a execução falha', async () => {
    const ctx = makeCtx(1000);
    const close = vi.fn().mockResolvedValue(undefined);
    await expect(
      withConnection(
        ctx,
        base,
        vi.fn().mockResolvedValue({}),
        close,
        async () => {
          throw new Error('boom');
        },
        true
      )
    ).rejects.toThrow('boom');
    expect(close).toHaveBeenCalledTimes(1);
    expect(ctx.connCache.size).toBe(0);
  });

  it('senha, modo SID/Service, Thick e SSL diferentes não compartilham a mesma sessão', async () => {
    const ctx = makeCtx(1000);
    const close = vi.fn().mockResolvedValue(undefined);
    const getConn = vi.fn().mockImplementation(async () => ({}));
    const noop = async () => 1;

    await withConnection(ctx, base, getConn, close, noop, true);
    await withConnection(ctx, base, getConn, close, noop, true);
    expect(getConn).toHaveBeenCalledTimes(1);

    await withConnection(ctx, { ...base, password: 'senha-2' }, getConn, close, noop, true);
    await withConnection(ctx, { ...base, oracleMode: 'sid' }, getConn, close, noop, true);
    await withConnection(ctx, { ...base, oracleThickMode: true }, getConn, close, noop, true);
    await withConnection(ctx, { ...base, ssl: true }, getConn, close, noop, true);
    expect(getConn).toHaveBeenCalledTimes(5);
  });

  it('a chave do cache não contém a senha em texto', async () => {
    const ctx = makeCtx(1000);
    await withConnection(
      ctx,
      base,
      vi.fn().mockResolvedValue({}),
      vi.fn().mockResolvedValue(undefined),
      async () => 1,
      true
    );
    for (const key of ctx.connCache.keys()) {
      expect(key).not.toContain('senha-1');
    }
  });
});
