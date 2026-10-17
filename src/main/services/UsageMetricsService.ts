import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type {
  AppSettings,
  UsageDays,
  UsageEvent,
  UsageImpact,
  UsageMetricsStore,
  UsageOrigin,
  UsageRisk,
  UsageSummary,
  UsageSummaryQuery
} from '../../shared/types';
import {
  USAGE_SCHEMA_VERSION,
  addEventToDays,
  hasAnyDay,
  mergeDays,
  normalizeStore,
  pruneDays,
  resultIndicatesFailure,
  summarizeUsage
} from '../utils/usageMetricsUtils';
import { sanitizeBaselineOverrides, type UsageBaselineOverrides } from '../../shared/usageBaselines';
import { computeImpact } from '../../shared/usageImpact';
import { withFileLock } from '../utils/fileLock';
import { getAppDataDir } from './ConfigService';

const STORE_FILE = 'usage-metrics.json';
const LOCK_FILE = 'usage-metrics.lock';
const DEFAULT_FLUSH_DELAY_MS = 1500;

/** O que o service precisa das configurações (o `ConfigService` real cumpre isto). */
export interface UsageSettingsSource {
  getSettings(): Pick<AppSettings, 'usageMetricsEnabled' | 'usageBaselines'>;
}

export interface UsageMetricsOptions {
  /** Pasta do arquivo; padrão é a pasta de dados do app, compartilhada por app, REST e MCP. */
  dir?: string;
  now?: () => Date;
  flushDelayMs?: number;
}

export interface UsageTrackInfo {
  module: string;
  action: string;
  origin: UsageOrigin;
  risk?: UsageRisk;
}

/**
 * Métricas locais de uso (épico #11, issue #12): conta execuções por módulo/ação/origem, com
 * duração e sucesso, agregadas por dia, num arquivo na pasta de dados do app.
 *
 * - Só contadores e durações. Nada de conteúdo (ver usageMetricsUtils).
 * - O arquivo é compartilhado por três processos (app Electron, servidor REST, servidor MCP).
 *   Estado em memória não atravessa processos, então cada um acumula um delta em memória e o
 *   grava sob um lock de arquivo, somando ao que já estava no disco (a soma é comutativa).
 * - A escrita é atômica (arquivo temporário + rename). Falha de disco nunca derruba a ação
 *   medida: `record` não lança.
 */
export class UsageMetricsService {
  private readonly dir: string;
  private readonly storePath: string;
  private readonly lockPath: string;
  private readonly now: () => Date;
  private readonly flushDelayMs: number;
  private pending: UsageDays = {};
  private timer: NodeJS.Timeout | null = null;
  private exitHookAttached = false;

  constructor(
    private readonly settings: UsageSettingsSource,
    options: UsageMetricsOptions = {}
  ) {
    this.dir = options.dir ?? getAppDataDir();
    this.storePath = path.join(this.dir, STORE_FILE);
    this.lockPath = path.join(this.dir, LOCK_FILE);
    this.now = options.now ?? (() => new Date());
    this.flushDelayMs = options.flushDelayMs ?? DEFAULT_FLUSH_DELAY_MS;
  }

  /**
   * Contagem ligada? Padrão é ligada; só `false` explícito desliga. Lê a configuração a cada
   * chamada: `getSettings` é cacheado pelo mtime do config.json, então custa um `stat`, e a
   * mudança feita na tela de Configurações vale já na próxima ação (nos três processos).
   */
  public isEnabled(): boolean {
    try {
      return this.settings.getSettings().usageMetricsEnabled !== false;
    } catch {
      return true;
    }
  }

  /** Registra um uso. Nunca lança e nunca bloqueia a ação medida. */
  public record(event: UsageEvent): void {
    try {
      if (!this.isEnabled()) return;
      if (!addEventToDays(this.pending, event, this.now())) return;
      this.scheduleFlush();
    } catch {
      /* métrica nunca pode quebrar a ação */
    }
  }

  /**
   * Mede `run` e registra o resultado. Lançar erro conta como falha (e relança); retornar
   * `{ success: false }`/`{ ok: false }`/`{ isError: true }` também conta como falha.
   */
  public async track<T>(info: UsageTrackInfo, run: () => Promise<T> | T): Promise<T> {
    const started = Date.now();
    try {
      const result = await run();
      this.record({ ...info, ok: !resultIndicatesFailure(result), durationMs: Date.now() - started });
      return result;
    } catch (err) {
      this.record({ ...info, ok: false, durationMs: Date.now() - started });
      throw err;
    }
  }

  /** Grava o que está pendente. Devolve `true` se não sobrou nada pendente. */
  public flush(): boolean {
    this.cancelTimer();
    if (!hasAnyDay(this.pending)) return true;
    // Desligou depois de registrar? O que ainda não foi para o disco é descartado.
    if (!this.isEnabled()) {
      this.pending = {};
      return true;
    }
    const delta = this.pending;
    const written = this.withLock(() => {
      const store = this.readOrCreateStore();
      mergeDays(store.days, delta);
      pruneDays(store.days, this.now());
      this.writeStore(store);
    });
    if (written) {
      // `record` pode ter somado algo em `this.pending` durante a escrita? Não: tudo é síncrono.
      this.pending = {};
      return true;
    }
    this.scheduleFlush();
    return false;
  }

  public getInstallId(): string {
    return this.getStore().installId;
  }

  public getSummary(query: UsageSummaryQuery = {}): UsageSummary {
    this.flush();
    return summarizeUsage(this.getStore(), query, this.isEnabled());
  }

  /** Contadores por dia (todos os dias guardados). A interface calcula a economia com isso. */
  public getDays(): UsageDays {
    this.flush();
    return this.getStore().days;
  }

  /** Tempo economizado com as linhas de base salvas nas configurações (issue #13). */
  public getImpact(now: Date = this.now()): UsageImpact {
    return computeImpact(this.getDays(), this.getBaselines(), now);
  }

  /** Apaga o histórico (os dias). O ID da instalação é mantido. */
  public clear(): void {
    this.pending = {};
    this.cancelTimer();
    this.withLock(() => {
      const store = this.readOrCreateStore();
      store.days = {};
      this.writeStore(store);
    });
  }

  /** Garante que o que estiver pendente seja gravado quando o processo terminar. */
  public attachProcessHooks(): void {
    if (this.exitHookAttached) return;
    this.exitHookAttached = true;
    process.on('exit', () => {
      try {
        this.flush();
      } catch {
        /* sem opção na saída */
      }
    });
  }

  public dispose(): void {
    this.flush();
    this.cancelTimer();
  }

  // ----- internos -----

  private getBaselines(): UsageBaselineOverrides {
    try {
      return sanitizeBaselineOverrides(this.settings.getSettings().usageBaselines);
    } catch {
      return {};
    }
  }

  private scheduleFlush(): void {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, this.flushDelayMs);
    this.timer.unref?.();
  }

  private cancelTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  /** Lê sem lock: a escrita é atômica, então a leitura vê o arquivo antigo ou o novo, nunca meio. */
  private getStore(): UsageMetricsStore {
    const existing = this.readStoreFile();
    if (existing) return existing;
    let created: UsageMetricsStore | null = null;
    this.withLock(() => {
      created = this.readOrCreateStore();
      this.writeStore(created);
    });
    return created ?? this.newStore();
  }

  private newStore(): UsageMetricsStore {
    return { schemaVersion: USAGE_SCHEMA_VERSION, installId: randomUUID(), createdAt: this.now().toISOString(), days: {} };
  }

  private readStoreFile(): UsageMetricsStore | null {
    try {
      if (!fs.existsSync(this.storePath)) return null;
      return normalizeStore(JSON.parse(fs.readFileSync(this.storePath, 'utf-8')));
    } catch {
      return null;
    }
  }

  /** Dentro do lock. Arquivo ilegível ou de outra versão vira backup, e um novo é criado. */
  private readOrCreateStore(): UsageMetricsStore {
    const existing = this.readStoreFile();
    if (existing) return existing;
    try {
      if (fs.existsSync(this.storePath)) {
        fs.renameSync(this.storePath, path.join(this.dir, `usage-metrics.invalid-${this.now().getTime()}.json`));
      }
    } catch {
      /* se não deu para guardar o backup, o novo arquivo sobrescreve */
    }
    return this.newStore();
  }

  private writeStore(store: UsageMetricsStore): void {
    const tmp = `${this.storePath}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(store));
    fs.renameSync(tmp, this.storePath);
  }

  /** Exclusão mútua entre processos (ver `withFileLock`). `false` = não gravou; o delta segue pendente. */
  private withLock(fn: () => void): boolean {
    return withFileLock(this.lockPath, fn);
  }
}
