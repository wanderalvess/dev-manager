import type { KarafFeatureInfo, KarafFeatureRepoInfo } from '../../../shared/types';

/**
 * Filtra repositórios de features por termo de busca e escopo (WinThor / Sistema / Todos).
 */
export function filterFeatureRepos(
  repos: KarafFeatureRepoInfo[],
  search: string,
  filterType: 'ALL' | 'WINTHOR' | 'SYSTEM' = 'ALL'
): KarafFeatureRepoInfo[] {
  const query = (search || '').trim().toLowerCase();

  return repos.filter((r) => {
    // Filtro por escopo
    if (filterType === 'WINTHOR' && !r.isWinthor) return false;
    if (filterType === 'SYSTEM' && r.isWinthor) return false;

    // Filtro por busca textual
    if (!query) return true;
    return r.name.toLowerCase().includes(query) || r.url.toLowerCase().includes(query);
  });
}

export interface FilterFeaturesOptions {
  search?: string;
  filterMode?: 'all' | 'installed' | 'winthor';
  scopeFilter?: 'ALL' | 'WINTHOR' | 'SYSTEM';
  statusFilter?: 'ALL' | 'INSTALLED' | 'AVAILABLE';
}

/**
 * Filtra lista de features Karaf com suporte a status (instalada / disponível / todas) e escopo.
 */
export function filterFeatures(
  features: KarafFeatureInfo[],
  searchOrOptions: string | FilterFeaturesOptions = '',
  scopeFilter: 'ALL' | 'WINTHOR' | 'SYSTEM' = 'ALL',
  statusFilter: 'ALL' | 'INSTALLED' | 'AVAILABLE' = 'ALL'
): KarafFeatureInfo[] {
  let query = '';
  let effectiveScope = scopeFilter;
  let effectiveStatus = statusFilter;

  if (typeof searchOrOptions === 'object' && searchOrOptions !== null) {
    query = (searchOrOptions.search || '').trim().toLowerCase();
    if (searchOrOptions.scopeFilter) effectiveScope = searchOrOptions.scopeFilter;
    if (searchOrOptions.statusFilter) effectiveStatus = searchOrOptions.statusFilter;
    if (searchOrOptions.filterMode === 'installed') {
      effectiveStatus = 'INSTALLED';
    } else if (searchOrOptions.filterMode === 'winthor') {
      effectiveScope = 'WINTHOR';
    }
  } else {
    query = (searchOrOptions || '').trim().toLowerCase();
  }

  return features.filter((f) => {
    // Status
    const isInstalled = f.installed ?? (f.state?.toLowerCase() === 'started' || f.state?.toLowerCase() === 'installed');
    if (effectiveStatus === 'INSTALLED' && !isInstalled) return false;
    if (effectiveStatus === 'AVAILABLE' && isInstalled) return false;

    // Escopo
    const isWinthor = f.isWinthor ?? (/winthor|totvs/i.test(f.name) || /winthor|totvs/i.test(f.repository || ''));
    if (effectiveScope === 'WINTHOR' && !isWinthor) return false;
    if (effectiveScope === 'SYSTEM' && isWinthor) return false;

    // Busca textual
    if (!query) return true;
    return (
      f.name.toLowerCase().includes(query) ||
      (f.version && f.version.toLowerCase().includes(query)) ||
      (f.repository && f.repository.toLowerCase().includes(query)) ||
      (f.description && f.description.toLowerCase().includes(query))
    );
  });
}

