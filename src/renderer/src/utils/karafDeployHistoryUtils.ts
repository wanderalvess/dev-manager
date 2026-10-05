import type { KarafDeployHistoryEntry } from '../../../shared/types';

export type KarafDeployHistoryFilter = 'ALL' | 'SUCCESS' | 'FAILURE' | 'MCP' | 'UI';

export interface KarafDeployStats {
  total: number;
  successes: number;
  failures: number;
  successRate: number;
  avgDuration: string;
  mcpCount: number;
  uiCount: number;
}

export function computeKarafDeployStats(history: KarafDeployHistoryEntry[]): KarafDeployStats {
  const total = history.length;
  const successes = history.filter((d) => d.success).length;
  const failures = total - successes;
  const successRate = total > 0 ? Math.round((successes / total) * 100) : 100;
  const totalDuration = history.reduce((acc, d) => acc + (d.durationMs || 0), 0);
  const avgDuration = total > 0 ? (totalDuration / total / 1000).toFixed(1) : '0.0';
  const mcpCount = history.filter((d) => d.trigger === 'mcp').length;
  const uiCount = total - mcpCount;

  return { total, successes, failures, successRate, avgDuration, mcpCount, uiCount };
}

export function filterKarafDeployHistory(
  history: KarafDeployHistoryEntry[],
  filter: KarafDeployHistoryFilter,
  search: string
): KarafDeployHistoryEntry[] {
  return history.filter((entry) => {
    if (filter === 'SUCCESS' && !entry.success) return false;
    if (filter === 'FAILURE' && entry.success) return false;
    if (filter === 'MCP' && entry.trigger !== 'mcp') return false;
    if (filter === 'UI' && entry.trigger !== 'ui') return false;

    if (search.trim()) {
      const query = search.toLowerCase().trim();
      const art = (entry.artifactId || '').toLowerCase();
      const proj = (entry.projectName || '').toLowerCase();
      const feat = (entry.featureInstall || '').toLowerCase();
      const ver = (entry.version || '').toLowerCase();
      const msg = (entry.message || '').toLowerCase();
      const repo = (entry.repoUrl || '').toLowerCase();
      return (
        art.includes(query) ||
        proj.includes(query) ||
        feat.includes(query) ||
        ver.includes(query) ||
        msg.includes(query) ||
        repo.includes(query)
      );
    }
    return true;
  });
}

export function buildKarafDeployMvnCoords(entry: KarafDeployHistoryEntry): string {
  return entry.groupId && entry.artifactId && entry.version
    ? `mvn:${entry.groupId}/${entry.artifactId}/${entry.version}`
    : entry.featureInstall;
}
