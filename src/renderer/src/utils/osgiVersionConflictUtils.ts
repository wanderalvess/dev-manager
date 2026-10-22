import type { KarafBundleInfo, OsgiResolutionDiagnosticSummary } from '../../../shared/types';

/** Divergência típica: o Karaf tem o módulo em versão de desenvolvimento (0.0.1.SNAPSHOT) e o consumidor exige uma faixa de release. */

export interface PomDependencyOption {
  groupId: string;
  artifactId: string;
  version: string;
  /** Pasta do projeto/módulo cujo pom.xml declara a dependência. */
  projectPath: string;
}

interface ParsedVersion {
  nums: [number, number, number];
  qualifier: string;
}

function parseOsgiVersion(raw: string): ParsedVersion {
  const [main = '', ...rest] = raw.trim().replace(/-/, '.').split('.');
  const parts = [main, ...rest];
  const num = (i: number) => {
    const n = parseInt(parts[i] ?? '0', 10);
    return Number.isNaN(n) ? 0 : n;
  };
  return { nums: [num(0), num(1), num(2)], qualifier: parts.slice(3).join('.') };
}

/** Compara major.minor.micro; o qualificador (SNAPSHOT, build) só desempata e não pesa na faixa. */
export function compareOsgiVersions(a: string, b: string): number {
  const pa = parseOsgiVersion(a);
  const pb = parseOsgiVersion(b);
  for (let i = 0; i < 3; i++) {
    if (pa.nums[i] !== pb.nums[i]) return pa.nums[i] < pb.nums[i] ? -1 : 1;
  }
  return 0;
}

/** Faixa do filtro OSGi: mínimo inclusivo, máximo exclusivo. Sem limites a versão é aceita. */
export function satisfiesVersionRange(version: string, min?: string, max?: string): boolean {
  if (min && compareOsgiVersions(version, min) < 0) return false;
  if (max && compareOsgiVersions(version, max) >= 0) return false;
  return true;
}

export function isSnapshotVersion(version: string): boolean {
  return /snapshot/i.test(version);
}

/** Forma que o Karaf mostra (0.0.1.SNAPSHOT) → forma do pom.xml (0.0.1-SNAPSHOT). Releases ficam como estão. */
export function osgiToMavenVersion(version: string): string {
  return version.trim().replace(/\.SNAPSHOT$/i, '-SNAPSHOT');
}

const GENERIC_SEGMENTS = new Set([
  'com', 'br', 'pcsist', 'winthor', 'totvs', 'integracao', 'domain', 'model', 'dto', 'entity', 'service', 'api',
  'impl', 'util', 'repository', 'bundle'
]);

function tokens(text: string, minLength = 3): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= minLength && !GENERIC_SEGMENTS.has(t));
}

/** Palavras que identificam o módulo; as mais à direita do pacote são mais específicas e pesam mais. */
function weightedHints(diag: Pick<OsgiResolutionDiagnosticSummary, 'missingItem' | 'matchedProfileName' | 'matchedPomDependency'>) {
  const hints = new Map<string, number>();
  const add = (token: string, weight: number) => hints.set(token, Math.max(hints.get(token) ?? 0, weight));
  tokens(diag.missingItem).forEach((t, i) => add(t, i + 1));
  if (diag.matchedProfileName) tokens(diag.matchedProfileName).forEach((t) => add(t, 10));
  if (diag.matchedPomDependency) tokens(diag.matchedPomDependency.artifactId).forEach((t) => add(t, 10));
  return hints;
}

/** Bundles instalados que parecem fornecer o módulo faltante mas estão fora da faixa exigida (melhor palpite primeiro). */
export function findConflictingBundles(
  bundles: KarafBundleInfo[],
  diag: Pick<
    OsgiResolutionDiagnosticSummary,
    'missingItem' | 'matchedProfileName' | 'matchedPomDependency' | 'versionMin' | 'versionMax'
  >
): KarafBundleInfo[] {
  const hints = weightedHints(diag);
  return bundles
    .map((bundle) => {
      const own = new Set(tokens(`${bundle.symbolicName ?? ''} ${bundle.name}`));
      let score = 0;
      hints.forEach((weight, token) => {
        if (own.has(token)) score += weight;
      });
      return { bundle, score };
    })
    .filter(({ bundle, score }) => score > 0 && !satisfiesVersionRange(bundle.version, diag.versionMin, diag.versionMax))
    .sort(
      (a, b) =>
        b.score - a.score || Number(isSnapshotVersion(b.bundle.version)) - Number(isSnapshotVersion(a.bundle.version))
    )
    .slice(0, 5)
    .map(({ bundle }) => bundle);
}

/** Dependências do pom ordenadas pela semelhança com o bundle instalado (a primeira é a sugerida). */
export function rankPomDependencies(deps: PomDependencyOption[], bundle: KarafBundleInfo): PomDependencyOption[] {
  const bundleSymbolic = (bundle.symbolicName ?? '').toLowerCase();
  const bundleTokens = new Set(tokens(`${bundle.symbolicName ?? ''} ${bundle.name}`));
  return deps
    .map((dep) => {
      let score = dep.artifactId.toLowerCase() === bundleSymbolic ? 100 : 0;
      tokens(dep.artifactId).forEach((t) => {
        if (bundleTokens.has(t)) score += 1;
      });
      return { dep, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ dep }) => dep);
}
