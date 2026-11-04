/**
 * Dependências das features antes do build. O catálogo da rotina 801 (que fala com o Nexus) traz, em cada feature, as
 * `dependencias` dela com a versão exigida. Aqui a lista final de uma versão nova é conferida contra elas, para achar
 * antes (e não depois de 30 minutos de build) uma feature que exige outra numa versão que a lista não tem. Quando o
 * próprio catálogo oferece a versão exigida, ela é ajustada na lista.
 */
import type { Routine801CatalogResponse } from './types';
import { BLOCKED_STATUS, catalogRepoFor, compareVersions, winthorLineOf, type ManifestChange, type ManifestUpgrade, type VersionManifest } from './infrVersionManifest';

type CatalogFeature = Routine801CatalogResponse['funcionalidades'][number];

export type DependencyKind = 'conflict' | 'missing';

export interface DependencyIssue {
  /** Feature que exige (a da lista) */
  feature: string;
  version: string;
  /** Feature exigida e a versão ou faixa que ela pede */
  dependency: string;
  required: string;
  /** Versão que a lista tem da exigida; vazia quando ela nem está na lista */
  found?: string;
  kind: DependencyKind;
  /** Versão que o catálogo oferece e que atende à exigida */
  fix?: string;
  /** De onde veio a dependência: o catálogo da 801 (padrão) ou o features.xml do Nexus */
  source?: 'catalog' | 'xml';
}

export interface DependencyReport {
  /** Features da lista que o catálogo conhece na versão exata (as que dá para conferir) */
  checked: number;
  /** Dessas, as que declaram dependências */
  withDependencies: number;
  issues: DependencyIssue[];
  /** Quantas dependências o Hub ajustou na lista pelo catálogo */
  fixed: number;
  /** Um exemplo do que o catálogo traz, para ver o formato (nome → exigida versão) */
  sample?: string;
  /** O que a conferência pelos features.xml do Nexus fez (repositórios baixados, features achadas, por que não deu) */
  xml?: { repos: number; fetched: number; missing: number; checked: number; withDependencies: number; error?: string };
}

export interface VersionRange {
  min?: string;
  minInclusive: boolean;
  max?: string;
  maxInclusive: boolean;
}

/** Faixa de versão no estilo OSGi: [1.40.1.0,1.40.1.0], [1.0,2.0) ou só 1.40 (que vale como mínimo). */
export function parseVersionSpec(spec: string | undefined): VersionRange | null {
  const s = (spec ?? '').trim();
  if (!s) return null;
  const range = /^([[(])\s*([^,\s]*)\s*,\s*([^\])\s]*)\s*([\])])$/.exec(s);
  if (range) return { min: range[2] || undefined, minInclusive: range[1] === '[', max: range[3] || undefined, maxInclusive: range[4] === ']' };
  return /^\d/.test(s) ? { min: s, minInclusive: true, maxInclusive: false } : null;
}

/** A versão atende à faixa? `undefined` quando a faixa não é de um formato que o Hub entende (não acusa nada). */
export function satisfiesSpec(version: string, spec: string | undefined): boolean | undefined {
  const r = parseVersionSpec(spec);
  if (!r) return undefined;
  if (r.min) {
    const c = compareVersions(version, r.min);
    if (c < 0 || (c === 0 && !r.minInclusive)) return false;
  }
  if (r.max) {
    const c = compareVersions(version, r.max);
    if (c > 0 || (c === 0 && !r.maxInclusive)) return false;
  }
  return true;
}

const isOwn = (name: string) => /^winthor-/.test(name);

/** O catálogo oferece essa versão? Não vale bloqueada nem de uma linha acima da alvo. */
function offerable(f: CatalogFeature, target: number): boolean {
  if (BLOCKED_STATUS.has(String(f.status).toUpperCase())) return false;
  const line = winthorLineOf(f.versao);
  return !(line !== undefined && line > target);
}

function indexCatalog(catalog: Routine801CatalogResponse): { byName: Map<string, CatalogFeature[]>; exact: Map<string, CatalogFeature> } {
  const byName = new Map<string, CatalogFeature[]>();
  const exact = new Map<string, CatalogFeature>();
  for (const f of catalog.funcionalidades) {
    if (!f.nome || !f.versao) continue;
    byName.set(f.nome, [...(byName.get(f.nome) ?? []), f]);
    exact.set(`${f.nome}@${f.versao}`, f);
  }
  return { byName, exact };
}

/** Confere a lista contra as dependências que o catálogo declara, sem alterar nada. */
export function checkManifestDependencies(manifest: VersionManifest, catalog: Routine801CatalogResponse, target: number): DependencyReport {
  const { byName, exact } = indexCatalog(catalog);
  const inManifest = new Map(manifest.features.map((f) => [f.name, f.version]));
  const report: DependencyReport = { checked: 0, withDependencies: 0, issues: [], fixed: 0 };

  for (const f of manifest.features) {
    const entry = exact.get(`${f.name}@${f.version}`);
    if (!entry) continue;
    report.checked++;
    const deps = (entry.dependencias ?? []).filter((d) => d.featureName);
    if (deps.length === 0) continue;
    report.withDependencies++;
    report.sample ??= `${f.name} → ${deps[0].featureName} ${deps[0].version ?? '(sem versão)'}`;

    for (const d of deps) {
      const name = d.featureName as string;
      const required = d.version ?? '';
      const found = inManifest.get(name);
      const offers = (byName.get(name) ?? [])
        .filter((c) => offerable(c, target) && satisfiesSpec(c.versao, required) === true)
        .sort((a, b) => compareVersions(b.versao, a.versao));
      const fix = offers[0]?.versao;

      if (found !== undefined) {
        if (satisfiesSpec(found, required) === false) report.issues.push({ feature: f.name, version: f.version, dependency: name, required, found, kind: 'conflict', fix });
      } else if (isOwn(name) && required && satisfiesSpec('0', required) !== undefined) {
        // Fora da lista, uma feature do WinThor: o Karaf a puxa do repositório, mas só se a versão exigida existir
        if (!fix) report.issues.push({ feature: f.name, version: f.version, dependency: name, required, kind: 'missing' });
      }
    }
  }
  return report;
}

export interface DependencyResolution {
  manifest: VersionManifest;
  /** Ajustes feitos na lista, um por feature (a versão que o catálogo oferece e a exigida atende) */
  fixes: ManifestChange[];
  report: DependencyReport;
}

/**
 * Ajusta a lista: onde uma feature exige outra numa versão que a lista não tem e o catálogo oferece a exigida, a lista
 * passa a ter a exigida. Repete até estabilizar (uma feature ajustada traz as dependências dela), sem mexer duas vezes
 * na mesma feature, para duas exigências opostas não ficarem se desfazendo.
 */
export function resolveDependencies(upgrade: Pick<ManifestUpgrade, 'manifest'>, catalog: Routine801CatalogResponse, target: number): DependencyResolution {
  const repos = [...upgrade.manifest.repos];
  let features = upgrade.manifest.features.map((f) => ({ ...f }));
  const fixes: ManifestChange[] = [];
  const touched = new Set<string>();
  const current = () => ({ ...upgrade.manifest, repos, features });

  for (let pass = 0; pass < 5; pass++) {
    const fixable = checkManifestDependencies(current(), catalog, target).issues.filter((i) => i.kind === 'conflict' && i.fix && !touched.has(i.dependency));
    if (fixable.length === 0) break;
    for (const issue of fixable) {
      if (touched.has(issue.dependency)) continue;
      touched.add(issue.dependency);
      features = features.map((f) => (f.name === issue.dependency ? { name: f.name, version: issue.fix as string } : f));
      fixes.push({ name: issue.dependency, from: issue.found as string, to: issue.fix as string, reason: `exigida por ${issue.feature} ${issue.version}` });
      const repo = catalogRepoFor(issue.dependency, issue.fix as string, catalog);
      if (repo && !repos.includes(repo)) repos.push(repo);
    }
  }

  const final = current();
  const report = checkManifestDependencies(final, catalog, target);
  report.fixed = fixes.length;
  return { manifest: final, fixes, report };
}

/** Junta os ajustes às mudanças que o catálogo já fez: quem já subiu muda o destino; quem não, vira uma mudança nova. */
export function mergeDependencyFixes(changes: ManifestChange[], fixes: ManifestChange[]): ManifestChange[] {
  const merged = changes.map((c) => ({ ...c }));
  for (const fix of fixes) {
    const existing = merged.find((c) => c.name === fix.name);
    if (existing) {
      existing.to = fix.to;
      existing.reason = fix.reason;
    } else {
      merged.push({ ...fix });
    }
  }
  return merged;
}
