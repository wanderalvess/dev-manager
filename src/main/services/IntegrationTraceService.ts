import fs from 'fs';
import {
  INTEGRATION_LAYER_ORDER,
  type IntegrationLayerConfig,
  type IntegrationLayerReadiness,
  type IntegrationReadinessResult
} from '../../shared/integrationTypes';
import { checkPortOpen } from '../utils/network';
import type { ConfigService } from './ConfigService';
import type { DatabaseService } from './DatabaseService';
import type { HttpClientService } from './HttpClientService';
import type { NetworkService } from './NetworkService';
import type { WindowsService } from './WindowsService';
import { runPlannedCheck, type ReadinessDeps } from './integration/readinessChecks';
import { deriveLayerStatus, planLayerChecks } from './integration/readinessPlan';

/**
 * Rastreio de Integração ponta a ponta (decisão 0003): WinThor → WSH → CH → PDV.
 * Fase 1: pré-voo das camadas. O disparo e o rastreio de lote entram nas próximas fases.
 *
 * Sem estado em memória: tudo vem do `config.json`, então o mesmo service roda igual no app,
 * no servidor web e no MCP sem disputar recurso com ninguém.
 */
export class IntegrationTraceService {
  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly networkService: NetworkService,
    private readonly windowsService: WindowsService,
    private readonly httpClientService: HttpClientService
  ) {}

  /** Camadas na ordem da cadeia; as que ainda não foram salvas entram vazias. */
  public getLayers(): IntegrationLayerConfig[] {
    const saved = this.configService.getSettings().integrationLayers;
    return INTEGRATION_LAYER_ORDER.map((layer) => saved?.find((entry) => entry.layer === layer) ?? { layer });
  }

  /** Confere cada camada configurada. As camadas (e as verificações dentro delas) rodam em paralelo. */
  public async checkReadiness(): Promise<IntegrationReadinessResult> {
    const deps = this.createDeps();
    const layers = await Promise.all(this.getLayers().map((layer) => this.checkLayer(layer, deps)));
    return { checkedAt: Date.now(), layers };
  }

  private async checkLayer(layer: IntegrationLayerConfig, deps: ReadinessDeps): Promise<IntegrationLayerReadiness> {
    const checks = await Promise.all(planLayerChecks(layer).map((planned) => runPlannedCheck(planned, deps)));
    return { layer: layer.layer, status: deriveLayerStatus(checks), checks };
  }

  private createDeps(): ReadinessDeps {
    return {
      getServiceState: (name) => this.windowsService.getServiceStatus(name),
      isProcessRunning: (name) => this.windowsService.isProcessRunning(name),
      isPortOpen: (host, port) => checkPortOpen(port, host, 1500),
      checkHealth: (url) => this.networkService.checkHttpHealth(url, 5000),
      testDb: async (connectionId) => {
        const connection = this.configService.getSettings().databaseConnections?.find((c) => c.id === connectionId);
        return connection ? this.databaseService.testConnection(connection) : null;
      },
      loginWinthor: (url, user, password) =>
        this.httpClientService.loginWinThor({ loginUrl: url, login: user, senha: password }),
      statLog: async (path) => {
        try {
          const stat = await fs.promises.stat(path);
          return { exists: stat.isFile(), modifiedAt: stat.mtimeMs, sizeBytes: stat.size };
        } catch {
          return { exists: false };
        }
      }
    };
  }
}
