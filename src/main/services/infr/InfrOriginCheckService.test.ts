import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const execFileAsync = vi.fn();
const httpRequest = vi.fn();
vi.mock('../../utils/security', async (orig) => ({ ...(await orig<object>()), execFileAsync }));
vi.mock('../../utils/httpRequest', () => ({ httpRequest }));

const { InfrOriginCheckService } = await import('./InfrOriginCheckService');
const { INFR_NEW_VERSION_SCRIPTS } = await import('../../../shared/infrNewVersionScripts');

describe('InfrOriginCheckService', () => {
  let dir: string;
  const testWtaLogin = vi.fn();
  const service = () =>
    new InfrOriginCheckService(
      { findDockerWslDistro: async () => 'ubuntu2604-winthor', resolveInfrPaths: () => ({ windows: dir, wsl: '/mnt/c/x' }) } as any,
      { testWtaLogin } as any
    );

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'infr-'));
    fs.mkdirSync(path.join(dir, 'linux-winthor', 'scripts'), { recursive: true });
    for (const s of INFR_NEW_VERSION_SCRIPTS) fs.writeFileSync(path.join(dir, s), '');
    execFileAsync.mockReset();
    httpRequest.mockReset();
    testWtaLogin.mockReset();
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('WTA rodando e respondendo: testa o login na porta publicada', async () => {
    execFileAsync.mockResolvedValue({ stdout: 'running\n@@\n0.0.0.0:8087\n' });
    httpRequest.mockResolvedValue({ status: 200 });
    testWtaLogin.mockResolvedValue({ ok: true, user: 'PCADMIN' });
    const res = await service().check({ fromEnv: 'develop' });
    expect(testWtaLogin).toHaveBeenCalledWith('http://localhost:8087');
    expect(res.items.map((i) => i.status)).toEqual(['ok', 'ok', 'ok']);
    expect(res.originWtaUrl).toBe('http://localhost:8087');
  });

  it('WTA parado: não tenta HTTP nem login', async () => {
    execFileAsync.mockResolvedValue({ stdout: 'exited\n@@\n' });
    const res = await service().check({ fromEnv: 'develop' });
    expect(httpRequest).not.toHaveBeenCalled();
    expect(testWtaLogin).not.toHaveBeenCalled();
    expect(res.items.find((i) => i.id === 'wta')?.status).toBe('block');
  });

  it('origem inválida não roda nada', async () => {
    const res = await service().check({ fromEnv: 'a; rm -rf /' });
    expect(res.success).toBe(false);
    expect(execFileAsync).not.toHaveBeenCalled();
  });
});
