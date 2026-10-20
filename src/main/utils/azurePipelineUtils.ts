import path from 'path';
import type {
  AzureBuildArtifact,
  AzureBuildInfo,
  AzurePipelineTarget
} from '../../shared/types';

const AZURE_API_VERSION = '7.1';
const AZURE_HOST = 'dev.azure.com';

/**
 * Org e projeto entram na URL da API; vindos de IPC/MCP não podem carregar `/`, `?` ou `..`
 * que mudariam o recurso consultado. Nome de projeto do Azure aceita espaço, ponto e hífen.
 */
export function isValidAzureTarget(target: AzurePipelineTarget | undefined | null): target is AzurePipelineTarget {
  if (!target || typeof target.org !== 'string' || typeof target.project !== 'string') return false;
  const org = target.org.trim();
  const project = target.project.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(org)) return false;
  if (!/^[A-Za-z0-9_][A-Za-z0-9_. -]{0,127}$/.test(project)) return false;
  return !project.includes('..');
}

function apiBase(target: AzurePipelineTarget): string {
  return `https://${AZURE_HOST}/${encodeURIComponent(target.org.trim())}/${encodeURIComponent(target.project.trim())}/_apis`;
}

/** Aceita `main` ou `refs/heads/main`; a API exige o ref completo. */
export function normalizeBranchRef(branch?: string): string | undefined {
  const trimmed = (branch || '').trim();
  if (!trimmed) return undefined;
  return trimmed.startsWith('refs/') ? trimmed : `refs/heads/${trimmed}`;
}

export function buildListBuildsUrl(target: AzurePipelineTarget, branch?: string, top = 20): string {
  const safeTop = Math.min(Math.max(Math.trunc(top) || 20, 1), 50);
  const params = new URLSearchParams({
    $top: String(safeTop),
    queryOrder: 'finishTimeDescending',
    statusFilter: 'completed',
    'api-version': AZURE_API_VERSION
  });
  const ref = normalizeBranchRef(branch);
  if (ref) params.set('branchName', ref);
  return `${apiBase(target)}/build/builds?${params.toString()}`;
}

export function buildListArtifactsUrl(target: AzurePipelineTarget, buildId: number): string {
  return `${apiBase(target)}/build/builds/${buildId}/artifacts?api-version=${AZURE_API_VERSION}`;
}

/** Endpoint único para os dois tipos de artefato; PipelineArtifact responde com redirect para o blob. */
export function buildArtifactZipUrl(target: AzurePipelineTarget, buildId: number, artifactName: string): string {
  const params = new URLSearchParams({
    artifactName,
    $format: 'zip',
    'api-version': AZURE_API_VERSION
  });
  return `${apiBase(target)}/build/builds/${buildId}/artifacts?${params.toString()}`;
}

export function parseBuildsResponse(body: any): AzureBuildInfo[] {
  const items = Array.isArray(body?.value) ? body.value : [];
  return items
    .filter((b: any) => typeof b?.id === 'number')
    .map((b: any) => ({
      id: b.id,
      buildNumber: String(b.buildNumber ?? b.id),
      pipelineName: b.definition?.name || '',
      pipelineId: typeof b.definition?.id === 'number' ? b.definition.id : 0,
      status: b.status || '',
      result: b.result || undefined,
      sourceBranch: String(b.sourceBranch || '').replace(/^refs\/heads\//, ''),
      sourceVersion: typeof b.sourceVersion === 'string' ? b.sourceVersion.slice(0, 8) : undefined,
      requestedFor: b.requestedFor?.displayName || undefined,
      finishTime: b.finishTime || undefined,
      webUrl: b._links?.web?.href || undefined
    }));
}

export function parseArtifactsResponse(body: any): AzureBuildArtifact[] {
  const items = Array.isArray(body?.value) ? body.value : [];
  return items
    .filter((a: any) => typeof a?.name === 'string' && a.name)
    .map((a: any) => {
      const size = Number(a.resource?.properties?.artifactsize);
      return {
        id: typeof a.id === 'number' ? a.id : 0,
        name: a.name,
        type: a.resource?.type || '',
        sizeBytes: Number.isFinite(size) && size > 0 ? size : undefined
      };
    });
}

/** Nome do .zip local: só caracteres seguros para o Windows, sem separadores de pasta. */
export function buildArtifactFileName(buildNumber: string, artifactName: string): string {
  const clean = (value: string) =>
    // eslint-disable-next-line no-control-regex -- caracteres de controle são inválidos em nome de arquivo do Windows
    value.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/\.{2,}/g, '.').replace(/^[.\s]+|[.\s]+$/g, '');
  const base = [clean(buildNumber), clean(artifactName)].filter(Boolean).join('_') || 'artefato';
  return `${base.slice(0, 150)}.zip`;
}

/**
 * Só repassa o PAT se o redirect continuar em dev.azure.com. O blob do PipelineArtifact vem com
 * SAS na própria URL; mandar o token para lá vazaria a credencial para outro host.
 */
export function shouldSendAuthTo(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.toLowerCase() === AZURE_HOST;
  } catch {
    return false;
  }
}

export function resolveArtifactsDir(configured: string | undefined, homeDir: string): string {
  const trimmed = (configured || '').trim();
  return trimmed ? path.resolve(trimmed) : path.join(homeDir, 'Downloads', 'HubManager-Azure');
}
