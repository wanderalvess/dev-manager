import type { KarafBundleInfo, KarafFeatureInfo } from '../../../shared/types';

// Infere o nome provável da feature removendo prefixos corporativos e sufixos de módulo.
export function inferFeatureNameFromBundle(target: Pick<KarafBundleInfo, 'symbolicName' | 'name'>): string {
  const rawName = target.symbolicName || target.name || '';
  return rawName
    .replace(/^(com\.br\.com\.pcsist\.winthor\.|br\.com\.totvs\.|com\.pcsist\.)/, '')
    .replace(/-service$|-impl$|-core$|-api$/, '');
}

// A resposta do IPC pode vir como array puro ou embrulhada em { features }.
export function normalizeFeatureList(res: unknown): KarafFeatureInfo[] {
  return Array.isArray(res) ? res : ((res as any)?.features || []);
}

export function findMatchingFeature(list: KarafFeatureInfo[], candidate: string): KarafFeatureInfo | undefined {
  const needle = candidate.toLowerCase();
  return list.find(
    (f) =>
      f.name.toLowerCase() === needle ||
      needle.includes(f.name.toLowerCase()) ||
      f.name.toLowerCase().includes(needle)
  );
}

export function buildFeatureUninstallPreview(name: string, version: string): string {
  return `feature:uninstall -r ${name || '<nome-feature>'}${version ? `/${version}` : ''}`;
}

export function getBundleStateBadgeClass(state: string): string {
  if (state === 'Active') return 'bg-success/15 text-success border-success/30';
  if (state === 'Resolved') return 'bg-warning/15 text-warning border-warning/30';
  if (state === 'Installed') return 'bg-info/15 text-info border-info/30';
  return 'bg-muted text-muted-foreground border-border';
}

export function getBundleStateDotClass(state: string): string {
  if (state === 'Active') return 'bg-success';
  if (state === 'Resolved') return 'bg-warning';
  return 'bg-info';
}
