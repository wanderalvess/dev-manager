import type {
  ApiScenario,
  ApiScenarioProgress,
  ApiScenarioRunResponse,
  ApiScenarioRunResult,
  ApiScenarioSaveResponse
} from '../../shared/apiScenarioTypes';
import type { ConfigService } from './ConfigService';
import { ScenarioHistoryService } from './ScenarioHistoryService';
import type { DatabaseService } from './DatabaseService';
import type { RunDbQuery } from './apiScenarios/apiDbLookup';
import { ApiScenarioStore, isSafeScenarioId, normalizeScenario } from './apiScenarios/apiScenarioStore';
import { runApiScenario } from './apiScenarios/apiScenarioRunner';

export interface ApiScenarioRunInput {
  /** Cenário salvo. */
  id?: string;
  /** Cenário ainda não salvo (rascunho da tela ou definição avulsa do MCP). */
  scenario?: Partial<ApiScenario>;
}

/** Validação de Cenários → Validação de API: cenários salvos em arquivo e execução com o confronto regra a regra. */
export class ApiScenarioService {
  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService?: DatabaseService,
    private readonly history: ScenarioHistoryService = new ScenarioHistoryService(configService)
  ) {}

  /** Campo × banco: consulta pela conexão do DB Studio, com no máximo uma linha (só a primeira coluna importa). */
  private runQuery(): RunDbQuery | undefined {
    const db = this.databaseService;
    if (!db) return undefined;
    return async (connectionId, sql, binds) => {
      const connection = this.configService.getSettings().databaseConnections?.find((c) => c.id === connectionId);
      if (!connection) return null;
      const result = await db.executeQuery(connection, sql, 1, binds);
      return { success: result.success, rows: result.rows, error: result.error };
    };
  }

  private store(): ApiScenarioStore {
    return ApiScenarioStore.forConfigFile(this.configService.getConfigFilePath());
  }

  list(): Promise<ApiScenario[]> {
    return this.store().list();
  }

  async save(input: Partial<ApiScenario>): Promise<ApiScenarioSaveResponse> {
    const normalized = normalizeScenario(input);
    if ('error' in normalized) return { success: false, error: normalized.error };
    try {
      await this.store().save(normalized.scenario);
      return { success: true, scenario: normalized.scenario };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Não foi possível salvar o cenário.' };
    }
  }

  async delete(id: string): Promise<boolean> {
    return isSafeScenarioId(id) ? this.store().delete(id) : false;
  }

  async run(input: ApiScenarioRunInput, onProgress: (progress: ApiScenarioProgress) => void = () => {}): Promise<ApiScenarioRunResponse> {
    let scenario: ApiScenario | undefined;
    if (input?.id) {
      scenario = isSafeScenarioId(input.id) ? await this.store().get(input.id) : undefined;
      if (!scenario) return { error: 'Cenário não encontrado.' };
    } else {
      // Rascunho: passa pela mesma validação do salvar, mas não grava nada
      const normalized = normalizeScenario({ ...input?.scenario, id: input?.scenario?.id || 'rascunho' });
      if ('error' in normalized) return { error: normalized.error };
      scenario = normalized.scenario;
    }
    const target = scenario;
    const result = await runApiScenario(target, this.configService.getSettings(), (entry) => onProgress({ ...entry, scenarioId: target.id }), this.runQuery());
    await this.history.saveApi(result);
    return result;
  }

  /** Roda os cenários salvos um depois do outro, na ordem da lista. */
  async runAll(onProgress: (progress: ApiScenarioProgress) => void = () => {}): Promise<ApiScenarioRunResult[]> {
    const settings = this.configService.getSettings();
    const results: ApiScenarioRunResult[] = [];
    for (const scenario of await this.list()) {
      const result = await runApiScenario(scenario, settings, (entry) => onProgress({ ...entry, scenarioId: scenario.id }), this.runQuery());
      await this.history.saveApi(result);
      results.push(result);
    }
    return results;
  }
}
