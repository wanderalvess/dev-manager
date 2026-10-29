import { vi } from 'vitest';
import os from 'os';
import path from 'path';
import type { AppSettings, TraceSummary } from '../../shared/types';
import { IntegrationTraceService } from './IntegrationTraceService';
import { LogWatcherService } from './LogWatcherService';

/** Monta o `IntegrationTraceService` com dublês dos serviços vizinhos, para os testes do pré-voo e do rastreio. */
export interface MakeOptions {
  testConnection?: ReturnType<typeof vi.fn>;
  executeQuery?: ReturnType<typeof vi.fn>;
  configDir?: string;
  traces?: TraceSummary[];
}

export function makeService(settings: Partial<AppSettings>, overrides: MakeOptions = {}) {
  const configService = {
    getSettings: () => settings as AppSettings,
    getConfigFilePath: () => path.join(overrides.configDir ?? os.tmpdir(), 'config.json')
  };
  const databaseService = {
    testConnection: overrides.testConnection ?? vi.fn(async () => ({ success: true, message: 'ok', version: 'Oracle 19' })),
    executeQuery: overrides.executeQuery ?? vi.fn(async () => ({ success: true, rows: [{ c: 3 }] }))
  };
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
    httpClientService as never,
    { logWatcherService: new LogWatcherService(), apmTraces: { getTraces: vi.fn(async () => overrides.traces ?? []) } }
  );
  return { service, databaseService, networkService, windowsService, httpClientService };
}
