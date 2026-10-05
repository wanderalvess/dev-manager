import { useState } from 'react';
import type { GitProjectInfo } from '../../../../shared/types';
import type { GitOutputControls } from './useGitOutput';

interface Params extends GitOutputControls {
  currentProject: GitProjectInfo | undefined;
  selectedPath: string;
  targetBranch: string;
  prBlockedReason: string | null;
  refreshAfterGitChange: (projectPath: string) => Promise<void>;
  refreshUncommittedCounts: () => Promise<void>;
}

/** Ações rápidas do painel: fetch/pull/stash, abrir PR/remoto/pipelines, abrir arquivo na IDE e sincronizar. */
export function useGitOperations({
  currentProject,
  selectedPath,
  targetBranch,
  prBlockedReason,
  setGitOutput,
  setGitOutputIsError,
  refreshAfterGitChange,
  refreshUncommittedCounts
}: Params) {
  const [isExecutingGit, setIsExecutingGit] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [ideFeedback, setIdeFeedback] = useState<string | null>(null);

  const handleOpenFileInIde = async (filePath: string) => {
    if (!currentProject || !window.electronAPI?.openFileInIde) return;
    try {
      const res = await window.electronAPI.openFileInIde(currentProject.path, filePath);
      if (!res.success) {
        setGitOutputIsError(true);
        setGitOutput(`Falha ao abrir '${filePath}' na IDE: ${res.error || 'Erro desconhecido'}`);
      } else {
        setIdeFeedback(filePath);
        setTimeout(() => setIdeFeedback(null), 3500);
      }
    } catch (err: any) {
      setGitOutputIsError(true);
      setGitOutput(`Erro ao acionar IDE: ${err?.message || err}`);
    }
  };

  const handleOpenPr = async () => {
    if (!currentProject || prBlockedReason) return;
    const url = await window.electronAPI.buildPrUrl(currentProject.path, targetBranch);
    if (url) {
      await window.electronAPI.openExternal(url);
    } else {
      setGitOutputIsError(true);
      setGitOutput('Não foi possível montar a URL do Pull Request para este repositório.');
    }
  };

  const handleOpenRemoteRepo = async () => {
    if (!currentProject?.webUrl) return;
    await window.electronAPI.openExternal(currentProject.webUrl);
  };

  const handleOpenAzurePipelines = async () => {
    if (!currentProject || !currentProject.isAzure || !currentProject.azureOrg || !currentProject.azureProject) return;
    const url = `https://dev.azure.com/${currentProject.azureOrg}/${currentProject.azureProject}/_build`;
    await window.electronAPI.openExternal(url);
  };

  const handleExecGit = async (command: 'fetch' | 'pull' | 'stash' | 'stash-pop') => {
    if (!currentProject || isExecutingGit) return;
    setIsExecutingGit(true);
    setGitOutputIsError(false);
    setGitOutput(`Executando git ${command} no repositório ${currentProject.name}...`);
    try {
      const res = await window.electronAPI.execGitCommand(currentProject.path, command);
      setGitOutputIsError(!res.success);
      setGitOutput(res.output);
      await refreshAfterGitChange(currentProject.path);
    } catch (err: any) {
      setGitOutputIsError(true);
      setGitOutput(`Erro: ${err?.message || err}`);
    } finally {
      setIsExecutingGit(false);
    }
  };

  const handleSyncRepositories = async () => {
    setIsSyncing(true);
    try {
      await refreshAfterGitChange(selectedPath);
      await refreshUncommittedCounts();
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    isExecutingGit,
    setIsExecutingGit,
    isSyncing,
    ideFeedback,
    handleOpenFileInIde,
    handleOpenPr,
    handleOpenRemoteRepo,
    handleOpenAzurePipelines,
    handleExecGit,
    handleSyncRepositories
  };
}
