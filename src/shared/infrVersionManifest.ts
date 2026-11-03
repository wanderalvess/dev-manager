/**
 * Manifesto de versão do INFR-Docker (`linux-winthor/versions/<versão>.features`) e a geração de
 * uma versão nova a partir de outra: a lista do ambiente de origem sobe pelo catálogo de
 * atualizações da rotina 801, sem passar da versão alvo, e é conferida contra o que o WSH da
 * versão cobra do WTA (`dependencies.json` do jar).
 */
import type { Routine801CatalogResponse } from './types';
import type { InfrEnvField } from './infrEnvConfig';
import type { DryRunReport } from './infrDryRun';
import type { ArtifactReport } from './infrFeatureArtifacts';
import type { PreflightItem } from './infrPreflight';
import type { DependencyReport } from './infrFeatureDependencies';
import type { InfrCloneInfo } from './infrClone';

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
  /** Por que mudou, quando não é só "o catálogo tem uma versão mais nova" (ex.: exigida por outra feature) */
  reason?: string;
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
  /** Ensaiar a resolução no Karaf do WTA de origem (feature:install -t); leva alguns minutos */
  dryRun?: boolean;
  /** Clonar sem mudar nada: mesma versão da origem, sem catálogo da 801 nem troca de feature (targetVersion é ignorado) */
  cloneOnly?: boolean;
  /** Portas escolhidas na tela (Oracle, WTA, WSH), para a pré-checagem olhar as que valem de fato */
  ports?: { oracle?: number; web?: number; wsh?: number };
}

/** Como a lista da prévia se compara ao manifesto que já existe da versão. */
export interface ManifestComparison {
  /** Na prévia numa versão acima da do manifesto existente */
  newer: number;
  /** Na prévia numa versão abaixo: gravar a prévia rebaixaria essas features */
  older: number;
  onlyExisting: number;
  onlyPreview: number;
}

/** `versions/<versão>.features` que já existe no INFR-Docker. */
/** Features da lista que nenhum repositório dela tem: as que voltam para uma versão que ele tem e as que não têm saída. */
export interface ManifestRepoRepair {
  repairs: ManifestChange[];
  unresolved: { name: string; version: string }[];
}

export interface ExistingVersionManifest {
  path: string;
  count: number;
  comparison: ManifestComparison;
  wshCheck?: WshDependencyCheck[];
  /** Conferida pelos features.xml dos repositórios dela (ausente = não deu para conferir) */
  repair?: ManifestRepoRepair;
  /** O arquivo com as versões corrigidas, que o Gerar grava no lugar do existente */
  repairText?: string;
}

/** Qual manifesto a geração usa: o que já existe da versão ou o montado pela prévia. */
export type InfrManifestSource = 'existing' | 'preview';

export interface InfrVersionPreview {
  success: boolean;
  error?: string;
  originWtaUrl?: string;
  originCount?: number;
  /** Linha do WinThor em que a origem está (a mais comum entre as features); maior que a alvo é downgrade */
  originLine?: number;
  upgrade?: Omit<ManifestUpgrade, 'manifest'>;
  /** Dependências das features conferidas contra o catálogo da 801 antes do build */
  dependencies?: DependencyReport;
  /** Repositórios novos da lista testados no Nexus que o WTA de origem usa */
  artifacts?: ArtifactReport;
  /** Portas, disco, memória e rede da distro para o ambiente novo */
  preflight?: PreflightItem[];
  /** Resultado do ensaio da resolução, quando pedido */
  dryRun?: DryRunReport;
  /** Leitura de um clone (cloneOnly): versão e imagem da origem, e o que já existe na distro */
  clone?: InfrCloneInfo;
  wshCheck?: WshDependencyCheck[];
  /** Erro ao ler o jar do WSH (não impede a prévia) */
  wshError?: string;
  manifestText?: string;
  /** Lista nova conferida pelos features.xml; `manifestText` já sai com as correções */
  repair?: ManifestRepoRepair;
  /** Manifesto da versão que já existe: a geração só o substitui se o usuário escolher */
  existing?: ExistingVersionManifest;
  /** Registro de cada passo (comandos, respostas HTTP, login sem senha), para mostrar e copiar */
  log?: string[];
}

/** Gravação de `versions/<versão>.features`; sem `overwrite`, não substitui um manifesto existente. */
export interface InfrManifestSaveRequest {
  infrPath?: string;
  targetVersion: string;
  manifestText: string;
  overwrite?: boolean;
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

export const BLOCKED_STATUS = new Set(['BLOQUEADO', 'NENHUM']);

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

/** Troca só a versão das linhas `feature <nome> <versão>` indicadas; comentários, repositórios e o resto ficam como estão. */
export function rewriteFeatureVersions(text: string, changes: ManifestChange[]): string {
  const to = new Map(changes.map((c) => [`${c.name} ${c.from}`, c.to]));
  return text
    .split(/(\r?\n)/)
    .map((line) => {
      const m = /^(\s*feature\s+)(\S+)(\s+)(\S+)(.*)$/.exec(line);
      const next = m ? to.get(`${m[2]} ${m[4]}`) : undefined;
      return m && next ? `${m[1]}${m[2]}${m[3]}${next}${m[5]}` : line;
    })
    .join('');
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
 * Linha do WinThor de um ambiente pelo núcleo (winthor-core-*), que acompanha a versão: muitas
 * features ficam anos na mesma linha (um 38 tem dezenas na 36). Sem núcleo, a linha mais comum;
 * no empate, a maior.
 */
export function manifestLineOf(manifest: VersionManifest): number | undefined {
  const core = manifest.features.map((f) => (/^winthor-core-/.test(f.name) ? winthorLineOf(f.version) : undefined)).filter((l): l is number => l !== undefined);
  if (core.length) return Math.max(...core);
  const count = new Map<number, number>();
  for (const f of manifest.features) {
    const line = winthorLineOf(f.version);
    if (line !== undefined) count.set(line, (count.get(line) || 0) + 1);
  }
  let best: number | undefined;
  for (const [line, n] of count) {
    if (best === undefined || n > count.get(best)! || (n === count.get(best) && line > best)) best = line;
  }
  return best;
}

/** Versão de um `mvn:grupo/artefato/versão/xml/features`. */
const mvnVersionOf = (url: string): string | undefined => /^mvn:[^/]+\/[^/]+\/([^/]+)\//.exec(url)?.[1];

/**
 * Repositório Maven que tem a feature nesta versão, pelo catálogo da 801. Só serve repositório da mesma versão: a
 * 801 às vezes liga a feature a um repositório de outra versão, e o build não acha a feature nele. Sem o da própria
 * feature, vale o artefato com o nome dela (winthor-core-features serve a winthor-core-data); artefato de outra
 * feature, mesmo na mesma versão, não serve.
 */
export function catalogRepoFor(name: string, version: string, catalog: Routine801CatalogResponse): string | undefined {
  const own = catalog.funcionalidades.find((f) => f.nome === name && f.versao === version && f.featureMavenUrl && mvnVersionOf(f.featureMavenUrl) === version);
  if (own) return own.featureMavenUrl;
  let best: { url: string; base: number } | undefined;
  for (const { repositorio: r } of catalog.repositorios) {
    if (r.version !== version || !r.featureMavenUrl) continue;
    const base = r.artifactId.replace(/-(features?|service)$/, '');
    if ((name === base || name.startsWith(`${base}-`)) && (!best || base.length > best.base)) best = { url: r.featureMavenUrl, base: base.length };
  }
  return best?.url;
}

export const NO_REPO_REASON = 'a 801 não informou o repositório Maven desta versão';

/**
 * Sobe a lista de origem para a versão alvo pelo catálogo `/atualizacao` da rotina 801: cada
 * feature recebe a versão do catálogo quando ela é mais nova e não passa da linha alvo
 * (a 41 não entra numa 40). O repositório Maven da versão nova entra no manifesto; versão sem
 * repositório não sobe, porque o build não teria onde achar a feature.
 */
export function upgradeManifestFromCatalog(
  origin: VersionManifest,
  catalog: Routine801CatalogResponse,
  target: number
): ManifestUpgrade {
  const repos = [...origin.repos];
  const changes: ManifestChange[] = [];
  const skipped: ManifestSkip[] = [];
  // O catálogo pode trazer várias versões da mesma feature (ex.: 1.40.4.2 e 1.40.4.1), em qualquer ordem
  const byName = new Map<string, Routine801CatalogResponse['funcionalidades']>();
  for (const f of catalog.funcionalidades) {
    if (f.nome && f.versao) byName.set(f.nome, [...(byName.get(f.nome) || []), f]);
  }
  const whyNot = (f: Routine801CatalogResponse['funcionalidades'][number]): string | null => {
    if (BLOCKED_STATUS.has(String(f.status).toUpperCase())) return `status ${f.status} na rotina 801`;
    const line = winthorLineOf(f.versao);
    if (line !== undefined && line > target) return `linha ${line}, acima da ${target}`;
    return catalogRepoFor(f.nome, f.versao, catalog) ? null : NO_REPO_REASON;
  };

  const features = origin.features.map((feature) => {
    const newer = (byName.get(feature.name) || [])
      .filter((f) => compareVersions(f.versao, feature.version) > 0)
      .sort((a, b) => compareVersions(b.versao, a.versao));
    if (newer.length === 0) return feature;
    const update = newer.find((f) => !whyNot(f));
    if (!update) {
      skipped.push({ name: feature.name, version: newer[0].versao, reason: whyNot(newer[0]) as string });
      return feature;
    }
    const repo = catalogRepoFor(update.nome, update.versao, catalog) as string;
    if (!repos.includes(repo)) repos.push(repo);
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

/** Compara a lista da prévia com o manifesto existente, feature a feature, pela versão. */
export function compareManifests(existing: VersionManifest, preview: VersionManifest): ManifestComparison {
  const byName = new Map(existing.features.map((f) => [f.name, f.version]));
  const result: ManifestComparison = { newer: 0, older: 0, onlyExisting: 0, onlyPreview: 0 };
  for (const f of preview.features) {
    const current = byName.get(f.name);
    if (current === undefined) result.onlyPreview++;
    else if (compareVersions(f.version, current) > 0) result.newer++;
    else if (compareVersions(f.version, current) < 0) result.older++;
    byName.delete(f.name);
  }
  result.onlyExisting = byName.size;
  return result;
}

/** O WSH encerra ao subir se o WTA não tiver cada serviço na versão exigida ou acima. */
export function checkManifestAgainstWsh(manifest: VersionManifest, deps: WshDependency[]): WshDependencyCheck[] {
  return deps.map((dep) => {
    const found = manifest.features.find((f) => f.name === dep.service)?.version;
    return { ...dep, found, ok: found !== undefined && compareVersions(found, dep.version) >= 0 };
  });
}
