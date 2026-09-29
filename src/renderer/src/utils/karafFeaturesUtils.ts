import type { KarafFeatureInfo, KarafFeatureRepoInfo } from '../../../shared/types';

/**
 * Analisa a saída do comando feature:repo-list e extrai a lista estruturada de repositórios registrados.
 */
export function parseFeatureRepoListOutput(stdout: string): KarafFeatureRepoInfo[] {
  if (!stdout) return [];
  const lines = stdout.split(/\r?\n/);
  const repos: KarafFeatureRepoInfo[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      !trimmed ||
      trimmed.startsWith('===') ||
      trimmed.startsWith('---') ||
      trimmed.startsWith('───') ||
      trimmed.toLowerCase().includes('repository |') ||
      trimmed.toLowerCase().includes('repository │') ||
      trimmed.toLowerCase().startsWith('repository ')
    ) {
      continue;
    }

    if (trimmed.includes('|') || trimmed.includes('│')) {
      const parts = trimmed.split(/[|│]/).map((p) => p.trim());
      if (parts.length >= 2) {
        const name = parts[0];
        const url = parts[1];
        if (name.toLowerCase() === 'repository' || !url) continue;

        const isWinthor = /winthor|totvs/i.test(name) || /winthor|totvs/i.test(url);
        repos.push({ name, url, isWinthor });
        continue;
      }
    }

    // Formato com múltiplos espaços
    const spaceMatch = trimmed.match(/^([a-zA-Z0-9_.-]+)\s{2,}(mvn:[^\s]+|file:[^\s]+|http[s]?:[^\s]+)/);
    if (spaceMatch) {
      const name = spaceMatch[1];
      const url = spaceMatch[2];
      const isWinthor = /winthor|totvs/i.test(name) || /winthor|totvs/i.test(url);
      repos.push({ name, url, isWinthor });
    }
  }

  return repos;
}

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

/**
 * Formata coordenadas Maven removendo prefixos se presentes.
 */
export function formatMavenCoord(url: string): string {
  return (url || '').replace(/^mvn:/, '');
}

/**
 * Extrai nome simplificado de repositório a partir de URL ou coordenada Maven.
 */
export function extractRepoName(urlOrName: string): string {
  if (!urlOrName) return '';
  const parts = urlOrName.split('/');
  return parts[parts.length - 1] || urlOrName;
}
