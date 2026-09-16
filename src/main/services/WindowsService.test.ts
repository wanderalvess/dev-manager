import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import * as security from '../utils/security';
import { WindowsService } from './WindowsService';
import { ConfigService } from './ConfigService';
import { KarafService } from './KarafService';
import type { DatabaseService } from './DatabaseService';
import type { NetworkService } from './NetworkService';
import type { AutomationStep } from '../../shared/types';

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

describe('WindowsService.runProfileStep — db-query', () => {
  let tmpDir: string;
  let originalConfigDir: string | undefined;
  let originalAppData: string | undefined;
  let configService: ConfigService;
  let fakeDatabaseService: { executeQuery: ReturnType<typeof vi.fn> };
  let fakeNetworkService: { getNetworkIps: ReturnType<typeof vi.fn> };
  let service: WindowsService;

  const baseStep: AutomationStep = {
    id: 'step-1',
    name: 'Atualizar IP',
    type: 'db-query',
    enabled: true,
    dbConnectionId: 'conn-1',
    sql: "UPDATE tb_parametro SET valor = '{{localIp}}' WHERE valor LIKE '%{{wslIp}}%'"
  };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-manager-test-'));
    originalConfigDir = process.env.CONFIG_DIR;
    originalAppData = process.env.APPDATA;
    process.env.CONFIG_DIR = tmpDir;
    delete process.env.APPDATA;

    configService = new ConfigService();
    configService.saveSettings({
      databaseConnections: [
        { id: 'conn-1', name: 'MySQL Local', type: 'mysql', host: 'localhost', port: 3306, database: 'consinco', user: 'consinco' }
      ]
    });
    const karafService = new KarafService(configService);
    fakeDatabaseService = { executeQuery: vi.fn() };
    fakeNetworkService = { getNetworkIps: vi.fn().mockResolvedValue({ primaryLocalIp: '10.0.0.5', wslIp: '172.20.1.2', localIps: [], hostname: 'host' }) };
    service = new WindowsService(
      configService,
      karafService,
      fakeDatabaseService as unknown as DatabaseService,
      fakeNetworkService as unknown as NetworkService
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    if (originalConfigDir === undefined) delete process.env.CONFIG_DIR;
    else process.env.CONFIG_DIR = originalConfigDir;
    if (originalAppData === undefined) delete process.env.APPDATA;
    else process.env.APPDATA = originalAppData;
  });

  it('substitui {{localIp}} e {{wslIp}} pelos valores detectados antes de executar', async () => {
    fakeDatabaseService.executeQuery.mockResolvedValue({
      success: true,
      columns: [],
      rows: [],
      rowCount: 1,
      affectedRows: 1,
      executionTimeMs: 5,
      isQuery: false
    });

    const ok = await service.runProfileStep(baseStep);

    expect(ok).toBe(true);
    expect(fakeDatabaseService.executeQuery).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'conn-1' }),
      "UPDATE tb_parametro SET valor = '10.0.0.5' WHERE valor LIKE '%172.20.1.2%'"
    );
  });

  it('retorna false e não executa SQL quando dbConnectionId não corresponde a nenhuma conexão salva', async () => {
    const ok = await service.runProfileStep({ ...baseStep, dbConnectionId: 'conn-inexistente' });

    expect(ok).toBe(false);
    expect(fakeDatabaseService.executeQuery).not.toHaveBeenCalled();
  });

  it('retorna false e não executa SQL quando o sql está vazio', async () => {
    const ok = await service.runProfileStep({ ...baseStep, sql: '   ' });

    expect(ok).toBe(false);
    expect(fakeDatabaseService.executeQuery).not.toHaveBeenCalled();
  });

  it('retorna false quando executeQuery reporta falha', async () => {
    fakeDatabaseService.executeQuery.mockResolvedValue({
      success: false,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: 5,
      isQuery: false,
      error: 'ORA-00001'
    });

    const ok = await service.runProfileStep(baseStep);

    expect(ok).toBe(false);
  });

  it('retorna false sem lançar quando databaseService/networkService não foram injetados', async () => {
    const karafService = new KarafService(configService);
    const serviceSemDb = new WindowsService(configService, karafService);

    const ok = await serviceSemDb.runProfileStep(baseStep);

    expect(ok).toBe(false);
  });
});

describe('WindowsService.runProfileStep / stopProfileStep — serviços e processos', () => {
  let tmpDir: string;
  let originalConfigDir: string | undefined;
  let originalAppData: string | undefined;
  let service: WindowsService;

  const startStep: AutomationStep = {
    id: 'svc-start',
    name: 'Iniciar Serviço',
    type: 'service-start',
    enabled: true,
    targetName: 'MeuServico'
  };
  const stopStep: AutomationStep = {
    id: 'svc-stop',
    name: 'Parar Serviço',
    type: 'service-stop',
    enabled: true,
    targetName: 'MeuServico'
  };
  const killStep: AutomationStep = {
    id: 'kill-proc',
    name: 'Finalizar Processo',
    type: 'kill-process',
    enabled: true,
    targetName: 'proc.exe'
  };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-manager-test-'));
    originalConfigDir = process.env.CONFIG_DIR;
    originalAppData = process.env.APPDATA;
    process.env.CONFIG_DIR = tmpDir;
    delete process.env.APPDATA;

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

  it('runProfileStep(service-start) pula startService quando o serviço já está RUNNING', async () => {
    vi.spyOn(service, 'getServiceStatus').mockResolvedValue('RUNNING');
    const startSpy = vi.spyOn(service, 'startService');

    const ok = await service.runProfileStep(startStep);

    expect(ok).toBe(true);
    expect(startSpy).not.toHaveBeenCalled();
  });

  it('runProfileStep(service-start) chama startService quando o serviço está STOPPED', async () => {
    vi.spyOn(service, 'getServiceStatus').mockResolvedValue('STOPPED');
    const startSpy = vi.spyOn(service, 'startService').mockResolvedValue(true);

    const ok = await service.runProfileStep(startStep);

    expect(ok).toBe(true);
    expect(startSpy).toHaveBeenCalledWith('MeuServico');
  });

  it('runProfileStep(service-stop) pula stopService quando o serviço já está STOPPED', async () => {
    vi.spyOn(service, 'getServiceStatus').mockResolvedValue('STOPPED');
    const stopSpy = vi.spyOn(service, 'stopService');

    const ok = await service.runProfileStep(stopStep);

    expect(ok).toBe(true);
    expect(stopSpy).not.toHaveBeenCalled();
  });

  it('runProfileStep(service-stop) chama stopService quando o serviço está RUNNING', async () => {
    vi.spyOn(service, 'getServiceStatus').mockResolvedValue('RUNNING');
    const stopSpy = vi.spyOn(service, 'stopService').mockResolvedValue(true);

    const ok = await service.runProfileStep(stopStep);

    expect(ok).toBe(true);
    expect(stopSpy).toHaveBeenCalledWith('MeuServico');
  });

  it('runProfileStep(kill-process) pula killProcess quando o processo não está em execução', async () => {
    vi.spyOn(service, 'isProcessRunning').mockResolvedValue(false);
    const killSpy = vi.spyOn(service, 'killProcess');

    const ok = await service.runProfileStep(killStep);

    expect(ok).toBe(true);
    expect(killSpy).not.toHaveBeenCalled();
  });

  it('runProfileStep(kill-process) chama killProcess quando o processo está em execução', async () => {
    vi.spyOn(service, 'isProcessRunning').mockResolvedValue(true);
    const killSpy = vi.spyOn(service, 'killProcess').mockResolvedValue(true);

    const ok = await service.runProfileStep(killStep);

    expect(ok).toBe(true);
    expect(killSpy).toHaveBeenCalledWith('proc.exe');
  });

  it('stopProfileStep pula stopService quando o serviço alvo já está STOPPED', async () => {
    vi.spyOn(service, 'getServiceStatus').mockResolvedValue('STOPPED');
    const stopSpy = vi.spyOn(service, 'stopService');

    const stopped = await service.stopProfileStep(stopStep);

    expect(stopped).toBe(true);
    expect(stopSpy).not.toHaveBeenCalled();
  });

  it('stopProfileStep chama stopService (garantindo parada) quando o serviço alvo está RUNNING', async () => {
    vi.spyOn(service, 'getServiceStatus').mockResolvedValue('RUNNING');
    const stopSpy = vi.spyOn(service, 'stopService').mockResolvedValue(true);

    const stopped = await service.stopProfileStep(startStep);

    expect(stopped).toBe(true);
    expect(stopSpy).toHaveBeenCalledWith('MeuServico');
  });

  it('stopProfileStep pula killProcess quando o processo alvo já não está em execução', async () => {
    vi.spyOn(service, 'isProcessRunning').mockResolvedValue(false);
    const killSpy = vi.spyOn(service, 'killProcess');

    const stopped = await service.stopProfileStep(killStep);

    expect(stopped).toBe(true);
    expect(killSpy).not.toHaveBeenCalled();
  });
});
