import type { KarafBundleInfo } from '../../../shared/types';
import type { KarafContainerStatus } from './karafBundleUtils';

export type KarafBundleTableViewKind = 'loading' | 'offline' | 'starting' | 'empty' | 'table';

/** Decide qual conteúdo a área da tabela exibe, na mesma precedência do render original. */
export function resolveKarafBundleTableView(params: {
  isLoading: boolean;
  filteredCount: number;
  totalCount: number;
  karafStatus: KarafContainerStatus;
}): KarafBundleTableViewKind {
  const { isLoading, filteredCount, totalCount, karafStatus } = params;
  if (isLoading) return 'loading';
  if (filteredCount > 0) return 'table';
  if (karafStatus === 'OFFLINE' && totalCount === 0) return 'offline';
  if (karafStatus === 'STARTING' && totalCount === 0) return 'starting';
  return 'empty';
}

export function isAllVisibleSelected(filteredCount: number, selectedCount: number): boolean {
  return filteredCount > 0 && selectedCount === filteredCount;
}

// O título compara só os tamanhos (sem checar lista vazia), como no original.
export function getSelectAllTitle(filteredCount: number, selectedCount: number): string {
  return selectedCount === filteredCount ? 'Desmarcar todos' : 'Selecionar todos os bundles visíveis';
}

export function getBundleStateBadgeClass(state: KarafBundleInfo['state']): string {
  if (state === 'Active') return 'bg-success/10 text-success border-success/25';
  if (state === 'Resolved') return 'bg-warning/10 text-warning border-warning/25';
  if (state === 'Installed') return 'bg-info/10 text-info border-info/25';
  return 'bg-muted text-muted-foreground border-border';
}

export function getBundleStateDotClass(state: KarafBundleInfo['state']): string {
  if (state === 'Active') return 'bg-success';
  if (state === 'Resolved') return 'bg-warning';
  return 'bg-info';
}

export function getBundleRowClass(isSelected: boolean): string {
  return `transition ${isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/40'}`;
}

export function shouldShowSymbolicName(bundle: Pick<KarafBundleInfo, 'name' | 'symbolicName'>): boolean {
  return Boolean(bundle.symbolicName) && bundle.symbolicName !== bundle.name;
}
