import { useCallback, useEffect, useRef, useState } from 'react';
import type { GitFileStatus, GitProjectInfo } from '../../../../shared/types';

interface Params {
  projects: GitProjectInfo[];
  settingsVersion?: number;
  onRefreshProjects: () => void | Promise<void>;
  resetOutput: () => void;
}

export function useGitProjectState({ projects, settingsVersion, onRefreshProjects, resetOutput }: Params) {
  const [selectedPath, setSelectedPath] = useState<string>(projects[0]?.path || '');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // `projects` chega vazio no primeiro render e é populado depois de um fetch
  // assíncrono; sincroniza a seleção assim que a lista chegar, caso o usuário
  // ainda não tenha escolhido um projeto manualmente.
  useEffect(() => {
    if (!selectedPath && projects.length > 0) {
      setSelectedPath(projects[0].path);
    }
  }, [projects, selectedPath]);

  // Info "fresca" do repositório selecionado (com contagem de alterações via git status); a lista
  // vinda do App usa só leitura de filesystem. Precisa ser recarregada após cada operação git,
  // senão o painel continua mostrando a branch/contagem de antes do checkout ou commit.
  const [activeProjectOverride, setActiveProjectOverride] = useState<GitProjectInfo | null>(null);
  const selectedPathRef = useRef(selectedPath);
  selectedPathRef.current = selectedPath;

  // Contagem de alterações de todos os repositórios (git status em lote). Só roda quando esta
  // aba é aberta ou sincronizada — a lista do App vem do filesystem para não pesar no startup.
  const [uncommittedCounts, setUncommittedCounts] = useState<Record<string, number>>({});
  const isCountingRef = useRef(false);

  const refreshUncommittedCounts = useCallback(async () => {
    if (isCountingRef.current || !window.electronAPI?.getGitUncommittedCounts) return;
    isCountingRef.current = true;
    try {
      setUncommittedCounts((await window.electronAPI.getGitUncommittedCounts()) || {});
    } catch (err) {
      console.warn('[Git] Erro ao contar alterações dos repositórios:', err);
    } finally {
      isCountingRef.current = false;
    }
  }, []);

  useEffect(() => {
    refreshUncommittedCounts();
  }, [settingsVersion, refreshUncommittedCounts]);

  const refreshSelectedProject = useCallback(async (projectPath: string) => {
    if (!projectPath || !window.electronAPI?.getProjectInfo) return;
    try {
      const info = await window.electronAPI.getProjectInfo(projectPath);
      if (info) {
        setUncommittedCounts((prev) => ({ ...prev, [info.path]: info.uncommittedCount ?? 0 }));
      }
      // Descarta respostas de um repositório que deixou de estar selecionado no meio da chamada.
      if (info && info.path === selectedPathRef.current) {
        setActiveProjectOverride(info);
      }
    } catch (err) {
      console.warn('[Git] Erro ao atualizar informações do repositório:', err);
    }
  }, []);

  const [pendingChanges, setPendingChanges] = useState<GitFileStatus[]>([]);
  const [isLoadingPendingChanges, setIsLoadingPendingChanges] = useState<boolean>(false);

  const refreshPendingChanges = useCallback(async (projectPath: string) => {
    if (!projectPath || !window.electronAPI?.getGitStatusDetails) return;
    setIsLoadingPendingChanges(true);
    try {
      const files = await window.electronAPI.getGitStatusDetails(projectPath);
      setPendingChanges(files || []);
    } catch {
      setPendingChanges([]);
    } finally {
      setIsLoadingPendingChanges(false);
    }
  }, []);

  useEffect(() => {
    resetOutput();
    if (selectedPath) {
      refreshSelectedProject(selectedPath);
      refreshPendingChanges(selectedPath);
    }
  }, [selectedPath, refreshSelectedProject, refreshPendingChanges, resetOutput]);

  // Em sequência: a lista (listProjects) usa a contagem de alterações em cache no service, que só
  // fica atualizada depois do git status disparado por getProjectInfo do repositório selecionado.
  const refreshAfterGitChange = async (projectPath: string) => {
    await Promise.all([
      refreshSelectedProject(projectPath),
      refreshPendingChanges(projectPath),
      onRefreshProjects()
    ]);
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.currentBranch.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentProject =
    activeProjectOverride && activeProjectOverride.path === selectedPath
      ? activeProjectOverride
      : projects.find((p) => p.path === selectedPath) || filteredProjects[0];

  return {
    selectedPath,
    setSelectedPath,
    searchTerm,
    setSearchTerm,
    filteredProjects,
    currentProject,
    uncommittedCounts,
    pendingChanges,
    isLoadingPendingChanges,
    refreshUncommittedCounts,
    refreshAfterGitChange
  };
}
