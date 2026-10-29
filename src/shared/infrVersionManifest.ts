/**
 * Manifesto de versão do INFR-Docker (`linux-winthor/versions/<versão>.features`) e a geração de
 * uma versão nova a partir de outra: a lista do ambiente de origem sobe pelo catálogo de
 * atualizações da rotina 801, sem passar da versão alvo, e é conferida contra o que o WSH da
 * versão cobra do WTA (`dependencies.json` do jar).
 */
import type { Routine801CatalogResponse } from './types';
import type { InfrEnvField } from './infrEnvConfig';

export interface ManifestFeature {
  name: string;
  version: string;
}

export interface VersionManifest {
  repos: string[];
  features: ManifestFeature[];
  /** Linhas `# feature ...` (features tiradas de propósito), preservadas na regravação */
  disabled: string[];
}

export interface ManifestChange {
  name: string;
  from: string;
  to: string;
}

export interface ManifestSkip {
  name: string;
  version: string;
  reason: string;
}

export interface ManifestUpgrade {
  manifest: VersionManifest;
  changes: ManifestChange[];
  /** Ficaram numa linha anterior à alvo: o catálogo não trouxe versão da linha */
  behind: ManifestFeature[];
  skipped: ManifestSkip[];
}

export interface WshDependency {
  service: string;
  version: string;
  description?: string;
}

export interface WshDependencyCheck extends WshDependency {
  found?: string;
  ok: boolean;
}

/** Pedido da prévia de uma versão nova (Assistente INFR → Nova versão). */
export interface InfrVersionPreviewRequest {
  distro?: string;
  infrPath?: string;
  /** Ambiente de origem (master): lê o container wta-master */
  fromEnv: string;
  targetVersion: string;
  /** URL do WTA de origem para o catálogo da 801; vazio = porta publicada do wta-<origem> */
  originWtaUrl?: string;
  /** Jar do WSH da versão alvo, caminho no WSL (/opt/wsh/40/winthor-integracao-core.jar) */
  wshJar?: string;
}

export interface InfrVersionPreview {
  success: boolean;
  error?: string;
  originWtaUrl?: string;
  originCount?: number;
  upgrade?: Omit<ManifestUpgrade, 'manifest'>;
  wshCheck?: WshDependencyCheck[];
  /** Erro ao ler o jar do WSH (não impede a prévia) */
  wshError?: string;
  manifestText?: string;
}

/** Configuração da origem para a tela da Nova versão. */
export interface InfrEnvTemplate {
  success: boolean;
  error?: string;
  wta: InfrEnvField[];
  wsh: InfrEnvField[];
  /** O ambiente de origem tem WSH (wsh-<origem>) */
  hasWsh?: boolean;
}

/** Gravação de wta.env.<v> e .env.<v> com as edições do usuário. */
export interface InfrEnvSaveRequest {
  distro?: string;
  infrPath?: string;
  version: string;
  name: string;
  from: string;
  dbContainer?: string;
  wshJar?: string;
  wshPort?: number;
  wtaEdits?: Record<string, string>;
  wshEdits?: Record<string, string>;
}

export interface InfrManifestSaveResult {
  success: boolean;
  path?: string;
  error?: string;
}

const BLOCKED_STATUS = new Set(['BLOQUEADO', 'NENHUM']);

export function parseVersionManifest(text: string): VersionManifest {
  const manifest: VersionManifest = { repos: [], features: [], disabled: [] };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (/^#\s*feature\s/.test(line)) manifest.disabled.push(line);
    if (!line || line.startsWith('#')) continue;
    const [kind, a, b] = line.split(/\s+/);
    if (kind === 'repo' && a) manifest.repos.push(a);
    if (kind === 'feature' && a && b) manifest.features.push({ name: a, version: b });
  }
  return manifest;
}

export function serializeVersionManifest(manifest: VersionManifest, header: string[]): string {
  return [
    ...header.map((h) => `# ${h}`),
    '# Formato: "repo <url>" e "feature <nome> <versão>"; lido por common/install_features.sh.',
    '',
    ...manifest.repos.map((r) => `repo ${r}`),
    '',
    ...manifest.features.map((f) => `feature ${f.name} ${f.version}`),
    ...(manifest.disabled.length ? ['', ...manifest.disabled] : []),
    ''
  ].join('\n');
}

/** Compara versões por segmento numérico (1.39.20.3 > 1.39.5.0); sufixos não numéricos valem 0. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(/[.-]/).map((p) => parseInt(p, 10) || 0);
  const pb = b.split(/[.-]/).map((p) => parseInt(p, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/**
 * Linha do WinThor que a versão carrega no segundo número (1.39.0.1 e 0.39.0.2 → 39). Versões
 * fora do padrão (ferramenta-acesso 1.9.15, jolt 2.1.0) não têm linha e seguem o catálogo.
 */
export function winthorLineOf(version: string): number | undefined {
  const m = /^\d+\.(\d{2})\./.exec(version);
  if (!m) return undefined;
  const line = parseInt(m[1], 10);
  return line >= 30 ? line : undefined;
}

/**
 * Sobe a lista de origem para a versão alvo pelo catálogo `/atualizacao` da rotina 801: cada
 * feature recebe a versão do catálogo quando ela é mais nova e não passa da linha alvo
 * (a 41 não entra numa 40). O repositório Maven da versão nova entra no manifesto.
 */
export function upgradeManifestFromCatalog(
  origin: VersionManifest,
  catalog: Routine801CatalogResponse,
  target: number
): ManifestUpgrade {
  const repos = [...origin.repos];
  const changes: ManifestChange[] = [];
  const skipped: ManifestSkip[] = [];
  const byName = new Map(catalog.funcionalidades.map((f) => [f.nome, f]));

  const features = origin.features.map((feature) => {
    const update = byName.get(feature.name);
    if (!update || !update.versao || compareVersions(update.versao, feature.version) <= 0) return feature;
    const line = winthorLineOf(update.versao);
    if (BLOCKED_STATUS.has(String(update.status).toUpperCase())) {
      skipped.push({ name: feature.name, version: update.versao, reason: `status ${update.status} na rotina 801` });
      return feature;
    }
    if (line !== undefined && line > target) {
      skipped.push({ name: feature.name, version: update.versao, reason: `linha ${line}, acima da ${target}` });
      return feature;
    }
    const repo =
      update.featureMavenUrl ||
      catalog.repositorios.find((r) => r.repositorio.version === update.versao && r.repositorio.featureMavenUrl)?.repositorio
        .featureMavenUrl;
    if (repo && !repos.includes(repo)) repos.push(repo);
    changes.push({ name: feature.name, from: feature.version, to: update.versao });
    return { name: feature.name, version: update.versao };
  });

  const behind = features.filter((f) => {
    const line = winthorLineOf(f.version);
    return line !== undefined && line < target && /^winthor-/.test(f.name);
  });
  return { manifest: { repos, features, disabled: origin.disabled }, changes, behind, skipped };
}

/** Lê o `BOOT-INF/classes/dependencies.json` do jar do WSH (lista de serviços e versão mínima). */
export function parseWshDependencies(json: string): WshDependency[] {
  const data = JSON.parse(json);
  if (!Array.isArray(data)) return [];
  return data
    .filter((d) => d && typeof d.service === 'string' && typeof d.version === 'string')
    .map((d) => ({ service: d.service, version: d.version, description: d.description }));
}

/** O WSH encerra ao subir se o WTA não tiver cada serviço na versão exigida ou acima. */
export function checkManifestAgainstWsh(manifest: VersionManifest, deps: WshDependency[]): WshDependencyCheck[] {
  return deps.map((dep) => {
    const found = manifest.features.find((f) => f.name === dep.service)?.version;
    return { ...dep, found, ok: found !== undefined && compareVersions(found, dep.version) >= 0 };
  });
}
