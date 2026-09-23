/**
 * Lógica pura extraída de KarafBundleManagerModal.tsx: classificação de bundles
 * (workspace/TOTVS/sistema), estatísticas, filtros combinados e o diff entre um
 * snapshot salvo e o estado atual dos bundles. Extraída para ser testável sem
 * precisar renderizar o componente.
 */
import type { BundleSnapshot, BundleSnapshotDiff, GitProjectInfo, KarafBundleInfo } from '../../../shared/types';

export type ScopeFilter = 'ALL' | 'TOTVS' | 'WORKSPACE' | 'ISSUES' | 'SYSTEM';
export type StatusFilter = 'ALL' | 'Active' | 'Resolved' | 'Installed';

/** Encontra o projeto do workspace cujo nome/artifactId aparece no nome/symbolicName do bundle (ou vice-versa). */
export function getMatchedProject(bundle: KarafBundleInfo, projects: GitProjectInfo[]): GitProjectInfo | undefined {
  if (!projects || projects.length === 0) return undefined;
  const bName = (bundle.symbolicName || bundle.name || '').toLowerCase();
  return projects.find((p) => {
    const pName = p.name.toLowerCase();
    const art = (p.pomInfo?.artifactId || '').toLowerCase();
    return (
      (bName && pName && (bName.includes(pName) || pName.includes(bName))) ||
      (bName && art && (bName.includes(art) || art.includes(bName)))
    );
  });
}

/** Um bundle é "do workspace" quando corresponde a algum projeto Git local aberto. */
export function isWorkspaceBundle(bundle: KarafBundleInfo, projects: GitProjectInfo[]): boolean {
  return Boolean(getMatchedProject(bundle, projects));
}

/** Um bundle é "TOTVS" quando o nome/symbolicName referencia TOTVS/WinThor, ou é um bundle do workspace. */
export function isTotvsBundle(bundle: KarafBundleInfo, projects: GitProjectInfo[]): boolean {
  const text = `${bundle.symbolicName || ''} ${bundle.name || ''}`.toLowerCase();
  return (
    text.includes('totvs') ||
    text.includes('winthor') ||
    text.includes('br.com.totvs') ||
    isWorkspaceBundle(bundle, projects)
  );
}

/** Um bundle é "de sistema" (framework/infra OSGi) quando o nome/symbolicName casa com prefixos/termos conhecidos. */
export function isSystemBundle(bundle: KarafBundleInfo): boolean {
  const text = `${bundle.symbolicName || ''} ${bundle.name || ''}`.toLowerCase();
  return (
    text.startsWith('org.apache') ||
    text.startsWith('org.ops4j') ||
    text.startsWith('com.fasterxml') ||
    text.startsWith('org.eclipse') ||
    text.startsWith('org.osgi') ||
    text.includes('aries') ||
    text.includes('pax') ||
    text.includes('camel') ||
    text.includes('cxf') ||
    text.includes('felix') ||
    text.includes('jetty') ||
    text.includes('slf4j') ||
    text.includes('log4j')
  );
}

export interface BundleStats {
  total: number;
  active: number;
  resolved: number;
  installed: number;
}

/** Conta bundles por estado (Active/Resolved/Installed), sobre o total. */
export function computeBundleStats(bundles: KarafBundleInfo[]): BundleStats {
  return {
    total: bundles.length,
    active: bundles.filter((b) => b.state === 'Active').length,
    resolved: bundles.filter((b) => b.state === 'Resolved').length,
    installed: bundles.filter((b) => b.state === 'Installed').length
  };
}

export interface ScopeCounts {
  all: number;
  totvs: number;
  workspace: number;
  issues: number;
  system: number;
}

/** Conta quantos bundles caem em cada escopo (TOTVS/workspace/com problema/sistema). */
export function computeScopeCounts(bundles: KarafBundleInfo[], projects: GitProjectInfo[]): ScopeCounts {
  let totvs = 0;
  let workspace = 0;
  let issues = 0;
  let system = 0;
  for (const b of bundles) {
    if (isTotvsBundle(b, projects)) totvs++;
    if (isWorkspaceBundle(b, projects)) workspace++;
    if (b.state !== 'Active') issues++;
    if (isSystemBundle(b)) system++;
  }
  return { all: bundles.length, totvs, workspace, issues, system };
}

/** Aplica o filtro combinado de status + escopo + busca textual sobre a lista de bundles. */
export function filterBundles(
  bundles: KarafBundleInfo[],
  filters: { search: string; statusFilter: StatusFilter; scopeFilter: ScopeFilter },
  projects: GitProjectInfo[]
): KarafBundleInfo[] {
  const { search, statusFilter, scopeFilter } = filters;
  return bundles.filter((b) => {
    if (statusFilter !== 'ALL' && b.state !== statusFilter) return false;

    if (scopeFilter === 'TOTVS' && !isTotvsBundle(b, projects)) return false;
    if (scopeFilter === 'WORKSPACE' && !isWorkspaceBundle(b, projects)) return false;
    if (scopeFilter === 'ISSUES' && b.state === 'Active') return false;
    if (scopeFilter === 'SYSTEM' && !isSystemBundle(b)) return false;

    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      b.id.toLowerCase().includes(term) ||
      b.name.toLowerCase().includes(term) ||
      Boolean(b.symbolicName && b.symbolicName.toLowerCase().includes(term)) ||
      b.version.toLowerCase().includes(term) ||
      b.state.toLowerCase().includes(term)
    );
  });
}

/**
 * Compara os bundles atuais contra um snapshot salvo, classificando cada bundle do snapshot
 * como inalterado, com versão alterada, com estado alterado, ou removido; e cada bundle atual
 * que não estava no snapshot como adicionado.
 */
export function computeSnapshotDiff(
  bundles: KarafBundleInfo[],
  selectedSnapshot: BundleSnapshot | null
): BundleSnapshotDiff | null {
  if (!selectedSnapshot) return null;
  const currentMap = new Map(bundles.map((b) => [b.id, b]));
  const snapMap = new Map(selectedSnapshot.bundles.map((b) => [b.id, b]));

  const diff: BundleSnapshotDiff = { unchanged: [], versionChanged: [], stateChanged: [], added: [], removed: [] };

  for (const snapItem of selectedSnapshot.bundles) {
    const curr = currentMap.get(snapItem.id);
    if (!curr) {
      diff.removed.push(snapItem);
    } else if (curr.version !== snapItem.version) {
      diff.versionChanged.push({ snapshot: snapItem, current: curr });
    } else if (curr.state !== snapItem.state) {
      diff.stateChanged.push({ snapshot: snapItem, current: curr });
    } else {
      diff.unchanged.push(snapItem);
    }
  }

  for (const curr of bundles) {
    if (!snapMap.has(curr.id)) {
      diff.added.push(curr);
    }
  }

  return diff;
}

export type KarafContainerStatus = 'ONLINE' | 'OFFLINE' | 'STARTING';

/** Retorna rótulos, classes de estilo Tailwind e descrição para o status do container Karaf. */
export function getKarafStatusInfo(status: KarafContainerStatus): {
  label: string;
  badgeClass: string;
  dotClass: string;
  description: string;
} {
  switch (status) {
    case 'ONLINE':
      return {
        label: 'Karaf Online',
        badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        dotClass: 'bg-emerald-500 animate-pulse',
        description: 'Apache Karaf ativo e respondendo na porta SSH 8101'
      };
    case 'STARTING':
      return {
        label: 'Karaf Inicializando...',
        badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse',
        dotClass: 'bg-amber-500',
        description: 'Inicializando container Apache Karaf...'
      };
    case 'OFFLINE':
    default:
      return {
        label: 'Karaf Offline',
        badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
        dotClass: 'bg-rose-500',
        description: 'Apache Karaf parado ou inacessível via SSH (:8101)'
      };
  }
}

