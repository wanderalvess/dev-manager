import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DeployProfile, DeployStep } from '../../../../shared/types';
import {
  buildQueueSteps,
  resolveBuildQueue,
  type BuildQueueResult,
  type DeployQueueProject
} from '../../../../shared/deployQueue';
import { filterQueueProjects, mergeQueueSteps, type QueueApplyMode } from '../../utils/deployQueueBuilderUtils';

/** Estado do assistente "Montar fila": projetos do workspace, seleção, opções e a fila resultante. */
export function useDeployQueueBuilder(isOpen: boolean) {
  const [projects, setProjects] = useState<DeployQueueProject[]>([]);
  const [projectsPath, setProjectsPath] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [includeDependencies, setIncludeDependencies] = useState(true);
  const [skipTests, setSkipTests] = useState(true);
  const [installBundles, setInstallBundles] = useState(false);

  const scan = useCallback(async () => {
    if (!window.electronAPI?.scanDeployWorkspace) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await window.electronAPI.scanDeployWorkspace();
      setProjects(res.projects);
      setProjectsPath(res.projectsPath);
      setSelected((prev) => prev.filter((p) => res.projects.some((proj) => proj.path === p)));
    } catch (err: any) {
      setLoadError(err?.message || String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) void scan();
  }, [isOpen, scan]);

  const queue = useMemo<BuildQueueResult>(
    () => resolveBuildQueue(projects, selected, includeDependencies),
    [projects, selected, includeDependencies]
  );
  const visibleProjects = useMemo(() => filterQueueProjects(projects, search), [projects, search]);

  const toggle = (path: string) =>
    setSelected((prev) => (prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]));

  const buildSteps = (): DeployStep[] => buildQueueSteps(queue.ordered, { skipTests, installBundles });

  const applyTo = (profile: DeployProfile, mode: QueueApplyMode): DeployProfile => ({
    ...profile,
    steps: mergeQueueSteps(profile.steps, buildSteps(), mode)
  });

  return {
    projects,
    projectsPath,
    visibleProjects,
    isLoading,
    loadError,
    selected,
    toggle,
    clearSelection: () => setSelected([]),
    search,
    setSearch,
    includeDependencies,
    setIncludeDependencies,
    skipTests,
    setSkipTests,
    installBundles,
    setInstallBundles,
    queue,
    rescan: scan,
    applyTo
  };
}
