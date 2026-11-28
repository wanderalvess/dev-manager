import type { ConfigService } from '../ConfigService';
import { isSafeLocalPath } from '../../utils/security';
import type {
  KbAskResponse,
  KbDivergenceReport,
  KbSearchRequest,
  KbSearchResponse
} from '../../../shared/knowledgeBaseTypes';
import { KnowledgeBaseClient, type KbAskParams } from './KnowledgeBaseClient';
import { KnowledgeBaseImportService, type KbImportProgress, type KbImportSummary } from './KnowledgeBaseImportService';

export interface KbStatus {
  enabled: boolean;
  configured: boolean;
  baseUrl: string;
  hasApiKey: boolean;
  sourcePath: string;
}

/** Fachada da Base de Conhecimento: monta o cliente a partir das configurações salvas. */
export class KnowledgeBaseService {
  constructor(private readonly configService: ConfigService) {}

  getStatus(): KbStatus {
    const kb = this.configService.getSettings().knowledgeBase;
    return {
      enabled: Boolean(kb?.enabled),
      configured: Boolean(kb?.baseUrl && kb?.apiKey),
      baseUrl: kb?.baseUrl ?? '',
      hasApiKey: Boolean(kb?.apiKey),
      sourcePath: kb?.sourcePath ?? ''
    };
  }

  private client(): KnowledgeBaseClient {
    const kb = this.configService.getSettings().knowledgeBase;
    if (!kb?.enabled) throw new Error('A Base de Conhecimento está desativada nas configurações.');
    return new KnowledgeBaseClient({ baseUrl: kb.baseUrl, apiKey: kb.apiKey ?? '' });
  }

  search(req: KbSearchRequest): Promise<KbSearchResponse> {
    return this.client().search(req);
  }

  ask(params: KbAskParams): Promise<KbAskResponse> {
    return this.client().ask(params);
  }

  divergences(module?: string, limit?: number): Promise<KbDivergenceReport> {
    return this.client().divergences(module, limit);
  }

  importFolder(
    options: { path?: string; version?: string; onProgress?: (p: KbImportProgress) => void } = {}
  ): Promise<KbImportSummary> {
    const kb = this.configService.getSettings().knowledgeBase;
    const root = (options.path || kb?.sourcePath || '').trim();
    if (!root) throw new Error('Informe a pasta do prompt-hub nas configurações da Base de Conhecimento.');
    if (!isSafeLocalPath(root)) throw new Error('Caminho da pasta do prompt-hub inválido ou remoto não permitido.');
    return new KnowledgeBaseImportService(this.client()).importFolder(root, options);
  }
}
