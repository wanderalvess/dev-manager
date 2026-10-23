import { describe, expect, it } from 'vitest';
import type { GitProjectInfo } from '../../../shared/types';
import { countByRepoFilter, matchesRepoFilter, pendingChangesOf, type GitRepoCounts } from './gitRepoFilters';

function makeProject(path: string, overrides: Partial<GitProjectInfo> = {}): GitProjectInfo {
  return {
    name: path,
    path,
    currentBranch: 'develop',
    branches: ['develop'],
    remoteBranches: ['develop'],
    provider: 'azure',
    isAzure: true,
    ...overrides
  };
}

const projects = [
  makeProject('/limpo'),
  makeProject('/alterado'),
  makeProject('/local', { currentBranch: 'bugfix/x', branches: ['develop', 'bugfix/x'] }),
  makeProject('/adiantado')
];
const counts: GitRepoCounts = { uncommittedCounts: { '/alterado': 3 }, unpushedCounts: { '/adiantado': 2, '/limpo': 0 } };

describe('matchesRepoFilter', () => {
  it('filtra por alterações pendentes, branch só local e commits sem push', () => {
    expect(projects.filter((p) => matchesRepoFilter(p, 'changes', counts)).map((p) => p.path)).toEqual(['/alterado']);
    expect(projects.filter((p) => matchesRepoFilter(p, 'local-only', counts)).map((p) => p.path)).toEqual(['/local']);
    expect(projects.filter((p) => matchesRepoFilter(p, 'unpushed', counts)).map((p) => p.path)).toEqual(['/adiantado']);
    expect(projects.filter((p) => matchesRepoFilter(p, 'all', counts))).toHaveLength(4);
  });

  it('usa a contagem do projeto quando o lote ainda não chegou', () => {
    const project = makeProject('/novo', { uncommittedCount: 5 });
    expect(pendingChangesOf(project, { uncommittedCounts: {}, unpushedCounts: {} })).toBe(5);
    expect(matchesRepoFilter(project, 'changes', { uncommittedCounts: {}, unpushedCounts: {} })).toBe(true);
  });

  it('não marca como só local um repositório sem provedor reconhecido', () => {
    const semRemoto = makeProject('/sem-remoto', { provider: undefined, remoteBranches: [] });
    expect(matchesRepoFilter(semRemoto, 'local-only', counts)).toBe(false);
  });
});

describe('countByRepoFilter', () => {
  it('conta cada filtro para os chips e o cabeçalho', () => {
    expect(countByRepoFilter(projects, counts)).toEqual({ all: 4, changes: 1, 'local-only': 1, unpushed: 1 });
  });
});
