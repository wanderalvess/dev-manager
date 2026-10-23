import { useMemo, useState } from 'react';
import type { GitProjectInfo } from '../../../../shared/types';
import { countByRepoFilter, matchesRepoFilter, type GitRepoCounts, type GitRepoFilter } from '../../utils/gitRepoFilters';

interface Params extends GitRepoCounts {
  /** Todos os repositórios: os contadores do filtro e do cabeçalho não dependem da busca. */
  projects: GitProjectInfo[];
  /** Repositórios que já passaram pela busca por texto. */
  searchedProjects: GitProjectInfo[];
}

/** Filtro rápido da lista de repositórios (Todos / Com alterações / Só locais / Sem push). */
export function useGitRepoFilter({ projects, searchedProjects, uncommittedCounts, unpushedCounts }: Params) {
  const [filter, setFilter] = useState<GitRepoFilter>('all');

  const filterCounts = useMemo(
    () => countByRepoFilter(projects, { uncommittedCounts, unpushedCounts }),
    [projects, uncommittedCounts, unpushedCounts]
  );

  const visibleProjects = useMemo(
    () => searchedProjects.filter((p) => matchesRepoFilter(p, filter, { uncommittedCounts, unpushedCounts })),
    [searchedProjects, filter, uncommittedCounts, unpushedCounts]
  );

  return { filter, setFilter, filterCounts, visibleProjects };
}
