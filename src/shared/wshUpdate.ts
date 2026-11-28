/**
 * Atualização do jar do WSH (winthor-integracao-core) de um container: lógica pura, sem rede nem disco.
 * Quem baixa, extrai e troca o arquivo é o WshUpdateService (main).
 */
import { compareVersions } from './infrVersionManifest';

/** Onde a TOTVS publica o instalador de cada versão do WSH (um .exe por versão). */
export const WSH_INSTALLER_BASE = 'https://storage.googleapis.com/artefatos-winthor/WSH';

/** Destino do jar dentro do container: é o arquivo montado pelo `wsh_setup.sh`. */
export const WSH_JAR_MOUNT_DEST = '/opt/winthor-integracao-core/winthor-integracao-core.jar';

/** Mensagem que o Spring Boot do WSH imprime quando terminou de subir. */
export const WSH_STARTED_MARKER = 'Started WinthorSmartHubeApplication';

const VERSION_RE = /^\d{1,3}(\.\d{1,4}){2,4}$/;
const WSL_FILE_RE = /^\/[a-zA-Z0-9_./-]+$/;

export function isValidWshVersion(version: unknown): version is string {
  return typeof version === 'string' && VERSION_RE.test(version.trim());
}

export function wshInstallerFileName(version: string): string {
  return `winthor-integracao-core-${version.trim()}.exe`;
}

export function wshInstallerUrl(version: string): string {
  return `${WSH_INSTALLER_BASE}/${wshInstallerFileName(version)}`;
}

/** O jar fica em /opt do WSL; qualquer outro caminho (ou com caracteres de shell) é recusado. */
export function isSafeWshJarPath(jarPath: unknown): jarPath is string {
  return typeof jarPath === 'string' && WSL_FILE_RE.test(jarPath) && jarPath.startsWith('/opt/') && !jarPath.includes('..') && jarPath.endsWith('.jar');
}

export interface WshJarManifest {
  version?: string;
  springBootVersion?: string;
  startClass?: string;
}

/** Lê o MANIFEST.MF juntando as linhas continuadas (começam com espaço, limite de 72 colunas). */
export function parseJarManifest(text: string): WshJarManifest {
  const lines: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    if (raw.startsWith(' ') && lines.length) lines[lines.length - 1] += raw.slice(1);
    else lines.push(raw);
  }
  const attr = (key: string) => {
    const line = lines.find((l) => l.toLowerCase().startsWith(`${key.toLowerCase()}:`));
    return line ? line.slice(key.length + 1).trim() || undefined : undefined;
  };
  return { version: attr('Implementation-Version'), springBootVersion: attr('Spring-Boot-Version'), startClass: attr('Start-Class') };
}

/** Origem do jar montado: a linha `Source|Destination` do container cujo destino é o jar do WSH. */
export function mountedJarSource(mountLines: string): string | null {
  for (const line of mountLines.split(/\r?\n/)) {
    const [source, dest] = line.trim().split('|');
    if (dest === WSH_JAR_MOUNT_DEST && isSafeWshJarPath(source)) return source;
  }
  return null;
}

/** Valor de uma variável no `docker inspect --format '{{range .Config.Env}}…'` (uma por linha). */
export function envValue(envLines: string, key: string): string | undefined {
  for (const line of envLines.split(/\r?\n/)) {
    const i = line.indexOf('=');
    if (i > 0 && line.slice(0, i) === key) return line.slice(i + 1).trim() || undefined;
  }
  return undefined;
}

export interface WshRequiredFeature {
  service: string;
  version: string;
}

export interface WshFeatureCheck extends WshRequiredFeature {
  /** Versão instalada no WTA; ausente quando a feature não existe lá */
  found?: string;
  ok: boolean;
}

/** O WSH encerra ao subir se o WTA não tiver cada serviço na versão exigida ou acima. */
export function checkRequiredFeatures(required: WshRequiredFeature[], installed: { name: string; version: string }[]): WshFeatureCheck[] {
  return required.map((r) => {
    const found = installed.find((f) => f.name === r.service)?.version;
    return { ...r, found, ok: found !== undefined && compareVersions(found, r.version) >= 0 };
  });
}

export type WshUpdateVerdict = 'newer' | 'same' | 'older' | 'unknown';

export function compareWshVersions(current: string | undefined, next: string): WshUpdateVerdict {
  if (!current) return 'unknown';
  const diff = compareVersions(next, current);
  return diff > 0 ? 'newer' : diff < 0 ? 'older' : 'same';
}

/** Nome do backup ao lado do jar; leva a versão que estava em uso para a pessoa reconhecer. */
export function wshJarBackupPath(jarPath: string, version: string | undefined): string {
  return `${jarPath}.bak-${(version || 'anterior').replace(/[^0-9A-Za-z.]/g, '_')}`;
}

export interface WshUpdateInspectResult {
  success: boolean;
  error?: string;
  distro?: string;
  container?: string;
  running?: boolean;
  /** Caminho do jar no WSL (origem do volume montado) */
  jarPath?: string;
  version?: string;
  requires?: WshRequiredFeature[];
  /** Container do WTA lido da variável WTA_CONTAINER do WSH */
  wtaContainer?: string;
  /** Backups ao lado do jar, do mais novo para o mais antigo (nomes de arquivo) */
  backups?: string[];
}

export interface WshUpdateProbeResult {
  success: boolean;
  error?: string;
  version?: string;
  url?: string;
  sizeBytes?: number;
  lastModified?: string;
}

export interface WshUpdatePrepareResult {
  success: boolean;
  error?: string;
  version?: string;
  verdict?: WshUpdateVerdict;
  sizeBytes?: number;
  /** De onde veio o jar: baixado da TOTVS ou de um arquivo escolhido no computador */
  source?: 'download' | 'local';
  requires?: WshRequiredFeature[];
  /** Conferência contra o WTA; vazia quando não deu para ler as features do WTA */
  checks?: WshFeatureCheck[];
  checksError?: string;
}

export interface WshUpdateApplyResult {
  success: boolean;
  error?: string;
  /** O log do container mostrou que o Spring Boot terminou de subir */
  started?: boolean;
  backup?: string;
  logTail?: string;
}

export interface WshUpdateRequest {
  distro?: string;
  container: string;
  version?: string;
  /** Instalador (.exe) ou jar já baixado, no Windows: usado no lugar do download (ex.: sem acesso ao servidor da TOTVS) */
  localFile?: string;
}

/** Uma versão do WSH publicada pela TOTVS. */
export interface WshInstallerInfo {
  version: string;
  sizeBytes?: number;
  /** Data de publicação (ISO) */
  updated?: string;
}

export interface WshInstallerListResult {
  success: boolean;
  error?: string;
  /** Da mais nova para a mais antiga */
  installers?: WshInstallerInfo[];
}

export interface WshClearCacheResult {
  success: boolean;
  /** Bytes liberados na pasta temporária dos instaladores baixados */
  freedBytes: number;
  error?: string;
}

export interface WshUpdateProgress {
  step: 'download' | 'extract' | 'check' | 'apply' | 'restart' | 'wait';
  message: string;
  /** 0 a 100 quando o passo mede o andamento */
  percent?: number;
}

const INSTALLER_NAME_RE = /^WSH\/winthor-integracao-core-(\d{1,3}(?:\.\d{1,4}){2,4})\.exe$/;

/** Endereço da listagem pública (JSON) da pasta de instaladores do WSH no bucket da TOTVS. */
export const WSH_INSTALLER_LISTING_URL = 'https://storage.googleapis.com/storage/v1/b/artefatos-winthor/o?prefix=WSH/&fields=items(name,size,updated),nextPageToken&maxResults=1000';

/** Versões publicadas a partir da resposta da listagem; ignora o que não é o instalador versionado (WSH_setup.jar etc.). */
export function parseInstallerListing(json: unknown): WshInstallerInfo[] {
  const items = (json as { items?: unknown })?.items;
  if (!Array.isArray(items)) return [];
  const found: WshInstallerInfo[] = [];
  for (const item of items) {
    const m = typeof item?.name === 'string' ? INSTALLER_NAME_RE.exec(item.name) : null;
    if (!m) continue;
    const size = Number(item.size);
    found.push({ version: m[1], sizeBytes: Number.isFinite(size) && size > 0 ? size : undefined, updated: typeof item.updated === 'string' ? item.updated : undefined });
  }
  return found.sort((a, b) => compareVersions(b.version, a.version));
}

/** Instalador ou jar escolhido no computador: caminho absoluto do Windows, só .exe ou .jar, sem rede (UNC). */
export function isSupportedLocalWshFile(file: unknown): file is string {
  if (typeof file !== 'string' || file.includes(String.fromCharCode(0))) return false;
  const f = file.trim();
  if (f.startsWith('\\') || f.startsWith('//')) return false;
  return /^[A-Za-z]:[/\x5c]/.test(f) && /\.(exe|jar)$/i.test(f);
}
