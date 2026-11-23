import { EventEmitter } from 'events';
import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const spawn = vi.fn();
vi.mock('child_process', async (importOriginal) => ({ ...(await importOriginal<typeof import('child_process')>()), spawn }));
const installInfo = vi.fn();
vi.mock('./karafInstallInfo', () => ({ readKarafInstallInfo: (root: string) => installInfo(root) }));
const serviceState = vi.fn();
vi.mock('./karafServiceGuard', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./karafServiceGuard')>();
  return { ...actual, serviceBlockingStart: (info: never) => actual.serviceBlockingStart(info, (name) => serviceState(name)) };
});

const pickPort = vi.fn();
vi.mock('./karafDebugPort', () => ({ pickFreeDebugPort: (p: number) => pickPort(p) }));

const { startEmbeddedKarafDebug } = await import('./karafEmbedded');
const { serviceBlockingStart } = await vi.importActual<typeof import('./karafServiceGuard')>('./karafServiceGuard');

function makeCtx(exe: string) {
  return {
    embeddedKarafProcess: null,
    getSettings: () => ({ karafPath: 'C:\\pcsist\\produtos\\winthor', karafEmbeddedMode: 'pipe' }),
    getKarafServerExecutable: () => exe,
    getResolvedJavaEnv: () => ({})
  } as never;
}

beforeEach(() => {
  spawn.mockReset().mockImplementation(() => Object.assign(new EventEmitter(), { stdout: new EventEmitter(), stderr: new EventEmitter() }));
  installInfo.mockReset().mockReturnValue({ root: 'C:\\pcsist\\produtos\\winthor', found: true, sshPort: 8101, service: { name: 'WinThor' } });
  serviceState.mockReset().mockReturnValue('STOPPED');
  pickPort.mockReset().mockImplementation((p: number) => ({ port: p }));
});

describe('Karaf embutido', () => {
  it('roda o script na pasta dele, mesmo fora de bin/ (script na raiz ou customizado)', () => {
    const exe = path.join('C:\\pcsist\\produtos\\winthor', 'winthor.bat');

    expect(startEmbeddedKarafDebug(makeCtx(exe), () => {})).toBe(true);

    const options = spawn.mock.calls[0][2] as { cwd: string };
    expect(options.cwd).toBe(path.dirname(exe));
  });

  it('não inicia por cima do serviço Windows da mesma instalação que já está rodando', () => {
    serviceState.mockReturnValue('RUNNING');
    const logs: string[] = [];

    expect(startEmbeddedKarafDebug(makeCtx(path.join('C:\\k', 'bin', 'winthor.bat')), (chunk) => logs.push(chunk))).toBe(false);

    expect(spawn).not.toHaveBeenCalled();
    expect(logs.join('')).toContain('serviço Windows "WinThor" já está rodando');
  });

  it('porta de debug em uso: avisa quem ocupa, que a porta mudou, e sobe o Java na nova porta', () => {
    pickPort.mockReturnValue({ port: 5006, reason: 'in-use', owner: { pid: 1234, name: 'java.exe' } });
    const getEnv = vi.fn().mockReturnValue({});
    const ctx = { ...(makeCtx(path.join('C:\\k', 'bin', 'winthor.bat')) as object), getResolvedJavaEnv: getEnv } as never as { embeddedDebugPort?: unknown };
    const logs: string[] = [];

    expect(startEmbeddedKarafDebug(ctx as never, (chunk) => logs.push(chunk))).toBe(true);

    const text = logs.join('');
    expect(text).toContain('já está em uso por java.exe (PID 1234)');
    expect(text).toContain(':5005 → :5006');
    expect(getEnv).toHaveBeenCalledWith(5006);
    expect(ctx.embeddedDebugPort).toEqual({ port: 5006, replaces: 5005 });
  });

  it('porta de debug reservada pelo Windows: avisa o motivo e a nova porta', () => {
    pickPort.mockReturnValue({ port: 5006, reason: 'reserved' });
    const logs: string[] = [];

    startEmbeddedKarafDebug(makeCtx(path.join('C:\\k', 'bin', 'winthor.bat')), (chunk) => logs.push(chunk));

    expect(logs.join('')).toContain('reservada pelo Windows');
    expect(logs.join('')).toContain(':5005 → :5006');
  });

  it('porta livre: não avisa nada e usa a configurada', () => {
    const getEnv = vi.fn().mockReturnValue({});
    const ctx = { ...(makeCtx(path.join('C:\\k', 'bin', 'winthor.bat')) as object), getResolvedJavaEnv: getEnv } as never;
    const logs: string[] = [];

    startEmbeddedKarafDebug(ctx, (chunk) => logs.push(chunk));

    expect(logs.join('')).not.toContain('MUDOU');
    expect(getEnv).toHaveBeenCalledWith(undefined);
  });

  it('a regra do serviço: só RUNNING ou START_PENDING bloqueia, e sem serviço no wrapper não consulta nada', () => {
    const info = { root: 'C:\\k', found: true, service: { name: 'WinThor' } };
    expect(serviceBlockingStart(info, () => 'START_PENDING')).toContain('sc stop WinThor');
    expect(serviceBlockingStart(info, () => 'STOPPED')).toBeNull();
    const query = vi.fn();
    expect(serviceBlockingStart({ root: 'C:\\k', found: true }, query)).toBeNull();
    expect(query).not.toHaveBeenCalled();
  });
});
