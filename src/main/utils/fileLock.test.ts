import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { withFileLock } from './fileLock';

let dir: string;
let lock: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-lock-'));
  lock = path.join(dir, 'x.lock');
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('withFileLock', () => {
  it('executa com o lock e o remove no fim', () => {
    let existedInside = false;
    expect(withFileLock(lock, () => (existedInside = fs.existsSync(lock)))).toBe(true);
    expect(existedInside).toBe(true);
    expect(fs.existsSync(lock)).toBe(false);
  });

  it('devolve false e libera o lock quando a função lança', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(
      withFileLock(lock, () => {
        throw new Error('quebrou');
      })
    ).toBe(false);
    expect(fs.existsSync(lock)).toBe(false);
    warn.mockRestore();
  });

  it('desiste depois do timeout se outro processo segura o lock', () => {
    fs.writeFileSync(lock, '');
    const fn = vi.fn();
    const started = Date.now();
    expect(withFileLock(lock, fn, { timeoutMs: 100, retryMs: 10 })).toBe(false);
    expect(fn).not.toHaveBeenCalled();
    expect(Date.now() - started).toBeGreaterThanOrEqual(90);
    expect(fs.existsSync(lock)).toBe(true); // o lock do outro não é tocado
  });

  it('assume um lock vencido', () => {
    fs.writeFileSync(lock, '');
    const old = new Date(Date.now() - 60_000);
    fs.utimesSync(lock, old, old);
    const fn = vi.fn();
    expect(withFileLock(lock, fn, { staleMs: 10_000 })).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('devolve false sem esperar quando a pasta não permite criar o lock', () => {
    const started = Date.now();
    expect(withFileLock(path.join(dir, 'nao-existe', 'x.lock'), vi.fn(), { timeoutMs: 1500 })).toBe(false);
    expect(Date.now() - started).toBeLessThan(500);
  });
});
