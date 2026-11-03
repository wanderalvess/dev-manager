import fs from 'fs';
import path from 'path';
import type {
  AiLimitStatus,
  AiUsageDays,
  AiUsagePeriod,
  AiUsageReport,
  AiUsageStore,
  AppSettings,
  LlmChatResponse,
  LlmProviderConfig
} from '../../shared/types';
import { normalizeAiUsageSource } from '../../shared/aiUsageTypes';
import { dayKey } from '../../shared/usageDates';
import {
  buildAiUsageReport,
  limitStatusFor,
  mergeAiUsageDays,
  mergeRow,
  newAiUsageStore,
  normalizeAiUsageStore,
  pruneAiUsageDays,
  tokensOf
} from '../utils/aiUsageUtils';
import { withFileLock } from '../utils/fileLock';
import { getAppDataDir } from './ConfigService';

const STORE_FILE = 'ai-usage.json';
const LOCK_FILE = 'ai-usage.lock';

export interface AiUsageSettingsSource {
  getSettings(): Pick<AppSettings, 'usageMetricsEnabled' | 'llmProviders'>;
}

export interface AiUsageOptions {
  dir?: string;
  now?: () => Date;
}

/**
 * Registro local dos tokens de IA (data, provedor, modelo, origem e contagem — nunca prompt, resposta ou
 * chave) e aplicação do teto por provedor. O arquivo é compartilhado por app, REST e MCP, então cada
 * chamada grava na hora, sob lock, e o teto sempre lê o disco: o que outro processo gastou conta.
 *
 * Respeita `usageMetricsEnabled`: com a contagem desligada nada é registrado, e sem registro não há
 * como aplicar o teto. Falha de disco nunca derruba a chamada de IA.
 */
export class AiUsageService {
  private readonly storePath: string;
  private readonly lockPath: string;
  private readonly now: () => Date;

  constructor(
    private readonly settings: AiUsageSettingsSource,
    options: AiUsageOptions = {}
  ) {
    const dir = options.dir ?? getAppDataDir();
    this.storePath = path.join(dir, STORE_FILE);
    this.lockPath = path.join(dir, LOCK_FILE);
    this.now = options.now ?? (() => new Date());
  }

  public isEnabled(): boolean {
    try {
      return this.settings.getSettings().usageMetricsEnabled !== false;
    } catch {
      return true;
    }
  }

  /** Status do teto do provedor agora (`ok` quando a contagem está desligada ou não há teto). */
  public getLimitStatus(provider: LlmProviderConfig): AiLimitStatus {
    if (!this.isEnabled()) return limitStatusFor({}, provider, this.now());
    return limitStatusFor(this.readStore().days, provider, this.now());
  }

  /** Lança o erro em pt-BR (com o "Como resolver") se o teto do dia ou do mês já foi atingido. */
  public assertWithinLimit(provider: LlmProviderConfig): void {
    const status = this.getLimitStatus(provider);
    if (status.level === 'blocked') throw new Error(status.message);
  }

  /** Grava os tokens de uma chamada bem-sucedida. Nunca lança. */
  public record(provider: LlmProviderConfig, response: LlmChatResponse, source?: string): void {
    try {
      if (!this.isEnabled() || !response.usage) return;
      const tokens = tokensOf(response.usage);
      if (tokens.totalTokens === 0) return;
      const day = dayKey(this.now());
      const delta: AiUsageDays = { [day]: [] };
      mergeRow(delta[day], {
        providerId: provider.id,
        provider: provider.name,
        model: response.model || provider.model,
        source: normalizeAiUsageSource(source),
        calls: 1,
        ...tokens
      });
      withFileLock(this.lockPath, () => {
        const store = this.readStore();
        mergeAiUsageDays(store.days, delta);
        pruneAiUsageDays(store.days, this.now());
        this.writeStore(store);
      });
    } catch {
      /* contar nunca pode quebrar a chamada */
    }
  }

  public getReport(period: AiUsagePeriod = '30d'): AiUsageReport {
    const providers = this.settings.getSettings().llmProviders ?? [];
    return buildAiUsageReport(this.readStore().days, period, this.now(), providers, this.isEnabled());
  }

  public clear(): void {
    withFileLock(this.lockPath, () => this.writeStore(newAiUsageStore()));
  }

  private readStore(): AiUsageStore {
    try {
      if (!fs.existsSync(this.storePath)) return newAiUsageStore();
      return normalizeAiUsageStore(JSON.parse(fs.readFileSync(this.storePath, 'utf-8'))) ?? newAiUsageStore();
    } catch {
      return newAiUsageStore();
    }
  }

  private writeStore(store: AiUsageStore): void {
    const tmp = `${this.storePath}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(store));
    fs.renameSync(tmp, this.storePath);
  }
}
