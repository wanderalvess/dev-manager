import { randomBytes } from 'crypto';
import path from 'path';
import type { ApiScenarioRunResult } from '../../shared/apiScenarioTypes';
import type { AuthLockoutRunResult } from '../../shared/authLockoutTypes';
import {
  toApiRecord,
  toLockoutRecord,
  type ScenarioRunKind,
  type ScenarioRunListItem,
  type ScenarioRunRecord
} from '../../shared/scenarioHistoryTypes';
import type { ConfigService } from './ConfigService';
import { ScenarioHistoryStore } from './scenarioHistory/scenarioHistoryStore';

const newRunId = () => `r-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;

/** Histórico da Validação de Cenários (Bloqueio de Login e Validação de API), compartilhado pelos três transportes. */
export class ScenarioHistoryService {
  constructor(private readonly configService: Pick<ConfigService, 'getConfigFilePath'>) {}

  private store(): ScenarioHistoryStore {
    return new ScenarioHistoryStore(path.join(path.dirname(this.configService.getConfigFilePath()), 'scenario-runs'));
  }

  async list(kind?: ScenarioRunKind): Promise<ScenarioRunListItem[]> {
    const items = await this.store().list();
    return kind ? items.filter((item) => item.kind === kind) : items;
  }

  get(id: string): Promise<ScenarioRunRecord | null> {
    return this.store().get(id);
  }

  remove(id: string): Promise<boolean> {
    return this.store().remove(id);
  }

  clear(): Promise<number> {
    return this.store().clear();
  }

  /**
   * Guardar é um extra: se o disco recusar, a execução continua valendo e só não entra no histórico.
   * Devolve o id gravado (ou undefined).
   */
  async saveLockout(result: AuthLockoutRunResult): Promise<string | undefined> {
    return this.trySave(toLockoutRecord(newRunId(), result));
  }

  async saveApi(result: ApiScenarioRunResult): Promise<string | undefined> {
    return this.trySave(toApiRecord(newRunId(), result));
  }

  private async trySave(record: ScenarioRunRecord): Promise<string | undefined> {
    try {
      await this.store().save(record);
      return record.id;
    } catch (err: any) {
      console.warn('[ScenarioHistory] execução não entrou no histórico:', err?.message ?? err);
      return undefined;
    }
  }
}
