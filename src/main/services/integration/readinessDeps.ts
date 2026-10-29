import fs from 'fs';
import { checkPortOpen } from '../../utils/network';
import type { ConfigService } from '../ConfigService';
import type { DatabaseService } from '../DatabaseService';
import type { HttpClientService } from '../HttpClientService';
import type { NetworkService } from '../NetworkService';
import type { WindowsService } from '../WindowsService';
import { checkPdvSyncLogin } from './pdvSyncClient';
import type { ReadinessDeps } from './readinessChecks';

export interface ReadinessServices {
  configService: ConfigService;
  databaseService: DatabaseService;
  networkService: NetworkService;
  windowsService: WindowsService;
  httpClientService: HttpClientService;
}

/** As dependências reais do pré-voo, montadas a partir dos services do app. */
export function createReadinessDeps(services: ReadinessServices): ReadinessDeps {
  const { configService, databaseService, networkService, windowsService, httpClientService } = services;
  return {
    getServiceState: (name) => windowsService.getServiceStatus(name),
    isProcessRunning: (name) => windowsService.isProcessRunning(name),
    isPortOpen: (host, port) => checkPortOpen(port, host, 1500),
    checkHealth: (url) => networkService.checkHttpHealth(url, 5000),
    testDb: async (connectionId) => {
      const connection = configService.getSettings().databaseConnections?.find((c) => c.id === connectionId);
      return connection ? databaseService.testConnection(connection) : null;
    },
    loginWinthor: (url, user, password) => httpClientService.loginWinThor({ loginUrl: url, login: user, senha: password }),
    loginPdvSync: (credentials) => checkPdvSyncLogin(credentials),
    statLog: async (filePath) => {
      try {
        const stat = await fs.promises.stat(filePath);
        return { exists: stat.isFile(), modifiedAt: stat.mtimeMs, sizeBytes: stat.size };
      } catch {
        return { exists: false };
      }
    }
  };
}
