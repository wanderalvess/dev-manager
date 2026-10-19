import fs from 'fs';
import os from 'os';
import path from 'path';
import type {
  AzureArtifactDownloadResult,
  AzureListArtifactsResult,
  AzureListBuildsOptions,
  AzureListBuildsResult,
  AzurePipelineTarget
} from '../../shared/types';
import { ConfigService } from './ConfigService';
import { httpRequest, SimpleHttpResponse } from '../utils/httpRequest';
import { isSafeLocalPath, isSafePath } from '../utils/security';
import {
  buildArtifactFileName,
  buildArtifactZipUrl,
  buildListArtifactsUrl,
  buildListBuildsUrl,
  isValidAzureTarget,
  parseArtifactsResponse,
  parseBuildsResponse,
  resolveArtifactsDir,
  shouldSendAuthTo
} from '../utils/azurePipelineUtils';

const LIST_TIMEOUT_MS = 15_000;
/** Timeout de ociosidade (sem receber bytes), não do download inteiro. */
const DOWNLOAD_IDLE_TIMEOUT_MS = 120_000;
const MAX_REDIRECTS = 3;

const INVALID_TARGET = 'Organização/projeto do Azure DevOps inválidos.';
const NO_TOKEN = 'Configure o Personal Access Token do Azure DevOps em Configurações → Azure (escopo Build: Read).';

/** Lista builds do Azure Pipelines (Build API) e baixa os artefatos publicados como .zip. */
export class AzurePipelineService {
  constructor(private configService: ConfigService) {}

  private getToken(): string | null {
    return this.configService.getSettings().azureDevOpsToken || null;
  }

  private authHeaders(token: string): Record<string, string> {
    return {
      Accept: 'application/json',
      Authorization: `Basic ${Buffer.from(`:${token}`).toString('base64')}`
    };
  }

  private describeHttpError(res: SimpleHttpResponse): string {
    if (res.status === 401 || res.status === 203) return 'PAT do Azure DevOps inválido ou expirado.';
    if (res.status === 403) return 'O PAT não tem permissão de leitura de builds (escopo Build: Read).';
    if (res.status === 404) return 'Projeto, build ou artefato não encontrado no Azure DevOps.';
    return `Azure DevOps respondeu ${res.status} ${res.statusText}.`;
  }

  private async getJson(url: string, token: string): Promise<{ ok: true; body: any } | { ok: false; error: string }> {
    const res = await httpRequest(url, { method: 'GET', headers: this.authHeaders(token), timeout: LIST_TIMEOUT_MS });
    // Sem autenticação válida o Azure devolve 203 com a página HTML de login em vez de 401.
    if (!res.ok || res.status === 203) return { ok: false, error: this.describeHttpError(res) };
    return { ok: true, body: JSON.parse(await res.text()) };
  }

  public async listBuilds(target: AzurePipelineTarget, options: AzureListBuildsOptions = {}): Promise<AzureListBuildsResult> {
    if (!isValidAzureTarget(target)) return { success: false, builds: [], error: INVALID_TARGET };
    const token = this.getToken();
    if (!token) return { success: false, builds: [], error: NO_TOKEN };
    try {
      const result = await this.getJson(buildListBuildsUrl(target, options.branch, options.top), token);
      if (!result.ok) return { success: false, builds: [], error: result.error };
      return { success: true, builds: parseBuildsResponse(result.body) };
    } catch (err: any) {
      return { success: false, builds: [], error: err?.message || 'Falha ao listar builds.' };
    }
  }

  public async listArtifacts(target: AzurePipelineTarget, buildId: number): Promise<AzureListArtifactsResult> {
    if (!isValidAzureTarget(target)) return { success: false, artifacts: [], error: INVALID_TARGET };
    if (!Number.isInteger(buildId) || buildId <= 0) return { success: false, artifacts: [], error: 'Build inválido.' };
    const token = this.getToken();
    if (!token) return { success: false, artifacts: [], error: NO_TOKEN };
    try {
      const result = await this.getJson(buildListArtifactsUrl(target, buildId), token);
      if (!result.ok) return { success: false, artifacts: [], error: result.error };
      return { success: true, artifacts: parseArtifactsResponse(result.body) };
    } catch (err: any) {
      return { success: false, artifacts: [], error: err?.message || 'Falha ao listar artefatos.' };
    }
  }

  /** Segue redirects manualmente para nunca enviar o PAT a um host fora de dev.azure.com. */
  private async fetchZip(url: string, token: string): Promise<SimpleHttpResponse> {
    let current = url;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const headers: Record<string, string> = shouldSendAuthTo(current)
        ? { ...this.authHeaders(token), Accept: 'application/zip, application/octet-stream' }
        : { Accept: 'application/zip, application/octet-stream' };
      const res = await httpRequest(current, { method: 'GET', headers, timeout: DOWNLOAD_IDLE_TIMEOUT_MS });
      const location = res.headers?.location;
      if (res.status >= 300 && res.status < 400 && typeof location === 'string') {
        const next = new URL(location, current);
        if (next.protocol !== 'https:') throw new Error('Redirect para URL não HTTPS recusado.');
        current = next.toString();
        continue;
      }
      return res;
    }
    throw new Error('Redirecionamentos demais ao baixar o artefato.');
  }

  public getArtifactsDir(): string {
    return resolveArtifactsDir(this.configService.getSettings().azureArtifactsDir, os.homedir());
  }

  public async downloadArtifact(
    target: AzurePipelineTarget,
    buildId: number,
    buildNumber: string,
    artifactName: string
  ): Promise<AzureArtifactDownloadResult> {
    if (!isValidAzureTarget(target)) return { success: false, message: INVALID_TARGET };
    if (!Number.isInteger(buildId) || buildId <= 0) return { success: false, message: 'Build inválido.' };
    if (typeof artifactName !== 'string' || !artifactName.trim()) return { success: false, message: 'Artefato inválido.' };
    const token = this.getToken();
    if (!token) return { success: false, message: NO_TOKEN };

    const dir = this.getArtifactsDir();
    if (!isSafeLocalPath(dir)) return { success: false, message: `Pasta de destino não permitida: ${dir}` };
    const filePath = path.join(dir, buildArtifactFileName(String(buildNumber || buildId), artifactName));
    if (!isSafePath(filePath, dir)) return { success: false, message: 'Nome de arquivo de destino inválido.' };

    try {
      const res = await this.fetchZip(buildArtifactZipUrl(target, buildId, artifactName), token);
      if (!res.ok || res.status === 203) return { success: false, message: this.describeHttpError(res) };
      const data = await res.buffer();
      if (data.length < 4 || data.readUInt32LE(0) !== 0x04034b50) {
        return { success: false, message: 'A resposta do Azure DevOps não é um arquivo .zip.' };
      }
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, data);
      return { success: true, message: `Artefato salvo em ${filePath}`, filePath, sizeBytes: data.length };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Falha ao baixar o artefato.' };
    }
  }
}
