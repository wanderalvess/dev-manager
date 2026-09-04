import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import * as security from '../utils/security';
import { WindowsService } from './WindowsService';
import { ConfigService } from './ConfigService';
import { KarafService } from './KarafService';

vi.mock('../utils/security', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/security')>();
  return {
    ...actual,
    execFileAsync: vi.fn()
  };
});

describe('WindowsService.isCommandAvailable', () => {
  let tmpDir: string;
  let originalConfigDir: string | undefined;
  let originalAppData: string | undefined;
  let service: WindowsService;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-manager-test-'));
    originalConfigDir = process.env.CONFIG_DIR;
    originalAppData = process.env.APPDATA;
    process.env.CONFIG_DIR = tmpDir;
    delete process.env.APPDATA;

    vi.mocked(security.execFileAsync).mockReset();
    const configService = new ConfigService();
    const karafService = new KarafService(configService);
    service = new WindowsService(configService, karafService);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    if (originalConfigDir === undefined) delete process.env.CONFIG_DIR;
    else process.env.CONFIG_DIR = originalConfigDir;
    if (originalAppData === undefined) delete process.env.APPDATA;
    else process.env.APPDATA = originalAppData;
  });

  it('sempre retorna true fora do Windows, sem consultar where.exe', async () => {
    const platformSpy = vi.spyOn(process, 'platform', 'get').mockReturnValue('linux');
    const available = await service.isCommandAvailable('wt.exe');

    expect(available).toBe(true);
    expect(security.execFileAsync).not.toHaveBeenCalled();
    platformSpy.mockRestore();
  });

  it('no Windows, cacheia disponibilidade e evita spawns repetidos de where.exe', async () => {
    const platformSpy = vi.spyOn(process, 'platform', 'get').mockReturnValue('win32');
    vi.mocked(security.execFileAsync).mockResolvedValue({ stdout: 'C:\\wt.exe', stderr: '' } as any);

    const first = await service.isCommandAvailable('wt.exe');
    const second = await service.isCommandAvailable('wt.exe');
    const third = await service.isCommandAvailable('wt.exe');

    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(third).toBe(true);
    expect(security.execFileAsync).toHaveBeenCalledTimes(1);
    expect(security.execFileAsync).toHaveBeenCalledWith('where.exe', ['wt.exe']);
    platformSpy.mockRestore();
  });

  it('cacheia também o resultado negativo quando o comando não é encontrado', async () => {
    const platformSpy = vi.spyOn(process, 'platform', 'get').mockReturnValue('win32');
    vi.mocked(security.execFileAsync).mockRejectedValue(new Error('not found'));

    const first = await service.isCommandAvailable('inexistente.exe');
    const second = await service.isCommandAvailable('inexistente.exe');

    expect(first).toBe(false);
    expect(second).toBe(false);
    expect(security.execFileAsync).toHaveBeenCalledTimes(1);
    platformSpy.mockRestore();
  });

  it('mantém cache independente por comando', async () => {
    const platformSpy = vi.spyOn(process, 'platform', 'get').mockReturnValue('win32');
    vi.mocked(security.execFileAsync).mockResolvedValue({ stdout: '', stderr: '' } as any);

    await service.isCommandAvailable('wt.exe');
    await service.isCommandAvailable('git.exe');
    await service.isCommandAvailable('wt.exe');

    expect(security.execFileAsync).toHaveBeenCalledTimes(2);
    platformSpy.mockRestore();
  });
});
