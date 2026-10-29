import fs from 'fs';
import path from 'path';
import type { IntegrationTraceListItem, IntegrationTraceResult } from '../../../shared/integrationTypes';

/**
 * Histórico dos rastreios em arquivo (decisão 0003), um JSON por rastreio. Fica em arquivo, nunca
 * em memória, porque o app e o MCP são processos diferentes e precisam enxergar os mesmos
 * resultados. Guarda os últimos `MAX_STORED_TRACES`; os mais antigos são apagados ao gravar.
 */

export const MAX_STORED_TRACES = 50;

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/;

export function isSafeTraceId(id: unknown): id is string {
  return typeof id === 'string' && SAFE_ID.test(id);
}

export function toListItem(trace: IntegrationTraceResult): IntegrationTraceListItem {
  const count = (status: string) => trace.steps.filter((step) => step.status === status).length;
  return {
    id: trace.id,
    flowId: trace.flowId,
    flowName: trace.flowName,
    batchNumber: trace.batchNumber,
    startedAt: trace.startedAt,
    finishedAt: trace.finishedAt,
    brokenAt: trace.brokenAt,
    okSteps: count('ok'),
    failedSteps: count('failed'),
    unknownSteps: count('unknown')
  };
}

export class TraceHistoryStore {
  constructor(
    private readonly dir: string,
    private readonly maxStored: number = MAX_STORED_TRACES
  ) {}

  private fileFor(id: string): string {
    return path.join(this.dir, `${id}.json`);
  }

  public async save(trace: IntegrationTraceResult): Promise<void> {
    if (!isSafeTraceId(trace.id)) throw new Error('Identificador de rastreio inválido.');
    await fs.promises.mkdir(this.dir, { recursive: true });
    const target = this.fileFor(trace.id);
    const temp = `${target}.tmp`;
    await fs.promises.writeFile(temp, JSON.stringify(trace), 'utf-8');
    await fs.promises.rename(temp, target);
    await this.prune();
  }

  private async listFiles(): Promise<{ id: string; mtimeMs: number }[]> {
    let names: string[];
    try {
      names = await fs.promises.readdir(this.dir);
    } catch {
      return [];
    }
    const files = await Promise.all(
      names
        .filter((name) => name.endsWith('.json'))
        .map(async (name) => {
          const id = name.slice(0, -'.json'.length);
          if (!isSafeTraceId(id)) return null;
          try {
            return { id, mtimeMs: (await fs.promises.stat(path.join(this.dir, name))).mtimeMs };
          } catch {
            return null;
          }
        })
    );
    return files.filter((file): file is { id: string; mtimeMs: number } => file !== null);
  }

  private async prune(): Promise<void> {
    const files = (await this.listFiles()).sort((a, b) => b.mtimeMs - a.mtimeMs);
    await Promise.all(files.slice(this.maxStored).map((file) => this.remove(file.id)));
  }

  public async get(id: string): Promise<IntegrationTraceResult | null> {
    if (!isSafeTraceId(id)) return null;
    try {
      const parsed = JSON.parse(await fs.promises.readFile(this.fileFor(id), 'utf-8'));
      return parsed && typeof parsed === 'object' && Array.isArray(parsed.steps) ? (parsed as IntegrationTraceResult) : null;
    } catch {
      return null;
    }
  }

  /** Mais recentes primeiro; arquivo corrompido é ignorado em vez de quebrar a lista. */
  public async list(): Promise<IntegrationTraceListItem[]> {
    const traces = await Promise.all((await this.listFiles()).map((file) => this.get(file.id)));
    return traces
      .filter((trace): trace is IntegrationTraceResult => trace !== null)
      .map(toListItem)
      .sort((a, b) => b.startedAt - a.startedAt);
  }

  public async remove(id: string): Promise<boolean> {
    if (!isSafeTraceId(id)) return false;
    try {
      await fs.promises.unlink(this.fileFor(id));
      return true;
    } catch {
      return false;
    }
  }
}
