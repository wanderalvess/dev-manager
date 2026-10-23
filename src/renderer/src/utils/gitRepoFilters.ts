import type { GitProjectInfo } from '../../../shared/types';
import { isBranchLocalOnly } from './gitPublishViewUtils';

export type GitRepoFilter = 'all' | 'changes' | 'local-only' | 'unpushed';

export const GIT_REPO_FILTERS: { id: GitRepoFilter; label: string; hint: string }[] = [
  { id: 'all', label: 'Todos', hint: 'Todos os repositórios' },
  { id: 'changes', label: 'Com alterações', hint: 'Repositórios com arquivos modificados ou não rastreados' },
  { id: 'local-only', label: 'Só locais', hint: 'A branch atual ainda não existe no origin' },
  { id: 'unpushed', label: 'Sem push', hint: 'Commits locais que o origin ainda não tem' }
];

export interface GitRepoCounts {
  uncommittedCounts: Record<string, number>;
  unpushedCounts: Record<string, number>;
}

export function pendingChangesOf(project: GitProjectInfo, counts: GitRepoCounts): number {
  return counts.uncommittedCounts[project.path] ?? project.uncommittedCount ?? 0;
}

export function unpushedCommitsOf(project: GitProjectInfo, counts: GitRepoCounts): number {
  return counts.unpushedCounts[project.path] ?? 0;
}

export function matchesRepoFilter(project: GitProjectInfo, filter: GitRepoFilter, counts: GitRepoCounts): boolean {
  switch (filter) {
    case 'changes':
      return pendingChangesOf(project, counts) > 0;
    case 'local-only':
      return isBranchLocalOnly(project);
    case 'unpushed':
      return unpushedCommitsOf(project, counts) > 0;
    default:
      return true;
  }
}

export function countByRepoFilter(projects: GitProjectInfo[], counts: GitRepoCounts): Record<GitRepoFilter, number> {
  const result: Record<GitRepoFilter, number> = { all: projects.length, changes: 0, 'local-only': 0, unpushed: 0 };
  for (const project of projects) {
    if (matchesRepoFilter(project, 'changes', counts)) result.changes++;
    if (matchesRepoFilter(project, 'local-only', counts)) result['local-only']++;
    if (matchesRepoFilter(project, 'unpushed', counts)) result.unpushed++;
  }
  return result;
}
