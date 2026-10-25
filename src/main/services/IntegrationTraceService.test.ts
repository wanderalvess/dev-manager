import { describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { AppSettings } from '../../shared/types';
import { IntegrationTraceService } from './IntegrationTraceService';

function makeService(settings: Partial<AppSettings>, overrides: { testConnection?: ReturnType<typeof vi.fn> } = {}) {
  const configService = { getSettings: () => settings as AppSettings };
  const databaseService = { testConnection: overrides.testConnection ?? vi.fn(async () => ({ success: true, message: 'ok', version: 'Oracle 19' })) };
  const networkService = {
    checkHttpHealth: vi.fn(async (url: string) => ({ url, reachable: true, isHealthy: true, statusCode: 200, timeMs: 12, responseTimeMs: 12 }))
  };
  const windowsService = { getServiceStatus: vi.fn(async () => 'RUNNING' as const), isProcessRunning: vi.fn(async () => true) };
  const httpClientService = { loginWinThor: vi.fn(async () => ({ success: true, accessToken: 'tok', statusCode: 200, durationMs: 50 })) };
  const service = new IntegrationTraceService(
    configService as never,
    databaseService as never,
    networkService as never,
    windowsService as never,
    httpClientService as never
  );
  return { service, databaseService, networkService, windowsService, httpClientService };
}

describe('IntegrationTraceService.checkReadiness', () => {
  it('sem nada configurado devolve as quatro camadas na ordem, todas não configuradas', async () => {
    const { service } = makeService({});
    const result = await service.checkReadiness();

    expect(result.layers.map((l) => [l.layer, l.status])).toEqual([
      ['winthor', 'not-configured'], ['wsh', 'not-configured'], ['ch', 'not-configured'], ['pdv', 'not-configured']
    ]);
    expect(result.checkedAt).toBeGreaterThan(0);
  });

  it('confere cada camada com o serviço certo e usa a conexão salva do DB Studio', async () => {
    const { service, databaseService, networkService, httpClientService } = makeService({
      databaseConnections: [{ id: 'ora', name: 'Oracle', type: 'oracle', host: 'h', port: 1521, database: 'd', user: 'u', password: 'p' }],
      integrationLayers: [
        { layer: 'winthor', baseUrl: 'http://localhost:8181', healthPath: '/health', dbConnectionId: 'ora', auth: { type: 'winthor', user: 'admin', password: 'senha' } },
        { layer: 'ch', baseUrl: 'http://localhost:9000', healthPath: '/ping', windowsServiceName: 'CommerceHub' }
      ]
    });

    const result = await service.checkReadiness();
    const winthor = result.layers[0];
    expect(winthor.status).toBe('ok');
    expect(winthor.checks.map((c) => c.label)).toEqual(['Health HTTP', 'Login WinThor', 'Banco de dados']);
    expect(networkService.checkHttpHealth).toHaveBeenCalledWith('http://localhost:8181/health', 5000);
    expect(httpClientService.loginWinThor).toHaveBeenCalledWith({
      loginUrl: 'http://localhost:8181/winthor/autenticacao/v1/login', login: 'admin', senha: 'senha'
    });
    expect(databaseService.testConnection).toHaveBeenCalledWith(expect.objectContaining({ id: 'ora' }));
    expect(result.layers[2].checks.map((c) => c.label)).toEqual(['Health HTTP', 'Serviço CommerceHub']);
    expect(result.layers[1].status).toBe('not-configured');
  });

  it('conexão apagada das configurações vira falha da camada, sem exceção', async () => {
    const { service, databaseService } = makeService({ integrationLayers: [{ layer: 'pdv', dbConnectionId: 'sumiu' }] });
    const pdv = (await service.checkReadiness()).layers[3];

    expect(pdv.status).toBe('failed');
    expect(pdv.checks[0].detail).toContain('não encontrada');
    expect(databaseService.testConnection).not.toHaveBeenCalled();
  });

  it('uma camada com falha não impede as outras de serem verificadas', async () => {
    const { service, windowsService } = makeService({
      integrationLayers: [
        { layer: 'wsh', windowsServiceName: 'WshSvc' },
        { layer: 'pdv', processName: 'pdv.exe' }
      ]
    });
    windowsService.getServiceStatus.mockResolvedValueOnce('STOPPED' as never);

    const result = await service.checkReadiness();
    expect(result.layers[1]).toMatchObject({ layer: 'wsh', status: 'failed' });
    expect(result.layers[3]).toMatchObject({ layer: 'pdv', status: 'ok' });
  });

  it('lê o arquivo de log de verdade: existente é ok, ausente é aviso', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'integration-readiness-'));
    try {
      const logFile = path.join(dir, 'wsh.log');
      fs.writeFileSync(logFile, 'linha\n');
      const { service } = makeService({
        integrationLayers: [
          { layer: 'wsh', logFilePath: logFile },
          { layer: 'ch', logFilePath: path.join(dir, 'ausente.log') }
        ]
      });

      const result = await service.checkReadiness();
      expect(result.layers[1].status).toBe('ok');
      expect(result.layers[2].status).toBe('warning');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
