import fs from 'fs';
import path from 'path';
import type { ScenarioRunListItem, ScenarioRunRecord } from '../../../shared/scenarioHistoryTypes';
import { toListItem } from '../../../shared/scenarioHistoryTypes';

/**
 * Histórico da Validação de Cenários em arquivo, um JSON por execução. Em arquivo e não em memória porque o app, o
 * servidor web e o MCP são processos diferentes e precisam ver o mesmo histórico. Guarda as últimas MAX_RUNS.
 */
export const MAX_RUNS = 50;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/;

export function isSafeRunId(id: unknown): id is string {
  return typeof id === 'string' && SAFE_ID.test(id);
}

function isRecord(value: unknown): value is ScenarioRunRecord {
  const r = value as ScenarioRunRecord;
  return !!r && typeof r === 'object' && isSafeRunId(r.id) && (r.kind === 'auth-lockout' || r.kind === 'api') && typeof r.startedAt === 'string';
}

export class ScenarioHistoryStore {
  constructor(
    private readonly dir: string,
    private readonly maxRuns: number = MAX_RUNS
  ) {}

  private fileFor(id: string): string {
    return path.join(this.dir, `${id}.json`);
  }

  async save(record: ScenarioRunRecord): Promise<void> {
    if (!isSafeRunId(record.id)) throw new Error('Identificador de execução inválido.');
    await fs.promises.mkdir(this.dir, { recursive: true });
    const target = this.fileFor(record.id);
    await fs.promises.writeFile(`${target}.tmp`, JSON.stringify(record), 'utf-8');
    await fs.promises.rename(`${target}.tmp`, target);
    await this.prune();
  }

  async get(id: string): Promise<ScenarioRunRecord | null> {
    if (!isSafeRunId(id)) return null;
    try {
      const parsed = JSON.parse(await fs.promises.readFile(this.fileFor(id), 'utf-8'));
      return isRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  /** Mais recentes primeiro; arquivo corrompido é ignorado em vez de quebrar a lista. */
  async list(): Promise<ScenarioRunListItem[]> {
    const records = await Promise.all((await this.ids()).map((id) => this.get(id)));
    return records
      .filter((r): r is ScenarioRunRecord => r !== null)
      .map(toListItem)
      .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  }

  async remove(id: string): Promise<boolean> {
    if (!isSafeRunId(id)) return false;
    try {
      await fs.promises.unlink(this.fileFor(id));
      return true;
    } catch {
      return false;
    }
  }

  async clear(): Promise<number> {
    const ids = await this.ids();
    const removed = await Promise.all(ids.map((id) => this.remove(id)));
    return removed.filter(Boolean).length;
  }

  private async ids(): Promise<string[]> {
    try {
      return (await fs.promises.readdir(this.dir))
        .filter((name) => name.endsWith('.json'))
        .map((name) => name.slice(0, -'.json'.length))
        .filter(isSafeRunId);
    } catch {
      return [];
    }
  }

  private async prune(): Promise<void> {
    const items = await this.list();
    await Promise.all(items.slice(this.maxRuns).map((item) => this.remove(item.id)));
  }
}
