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

const { startEmbeddedKarafDebug } = await import('./karafEmbedded');
const { serviceBlockingStart } = await vi.importActual<typeof import('./karafServiceGuard')>('./karafServiceGuard');

function makeCtx(exe: string) {
  return {
    embeddedKarafProcess: null,
    getSettings: () => ({ karafPath: 'C:\\pcsist\\produtos\\winthor' }),
    getKarafServerExecutable: () => exe,
    getResolvedJavaEnv: () => ({})
  } as never;
}

beforeEach(() => {
  spawn.mockReset().mockImplementation(() => Object.assign(new EventEmitter(), { stdout: new EventEmitter(), stderr: new EventEmitter() }));
  installInfo.mockReset().mockReturnValue({ root: 'C:\\pcsist\\produtos\\winthor', found: true, sshPort: 8101, service: { name: 'WinThor' } });
  serviceState.mockReset().mockReturnValue('STOPPED');
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

  it('a regra do serviço: só RUNNING ou START_PENDING bloqueia, e sem serviço no wrapper não consulta nada', () => {
    const info = { root: 'C:\\k', found: true, service: { name: 'WinThor' } };
    expect(serviceBlockingStart(info, () => 'START_PENDING')).toContain('sc stop WinThor');
    expect(serviceBlockingStart(info, () => 'STOPPED')).toBeNull();
    const query = vi.fn();
    expect(serviceBlockingStart({ root: 'C:\\k', found: true }, query)).toBeNull();
    expect(query).not.toHaveBeenCalled();
  });
});
