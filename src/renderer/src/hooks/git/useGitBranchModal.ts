import { useState } from 'react';
import type { GitProjectInfo } from '../../../../shared/types';
import type { GitOutputControls } from './useGitOutput';

interface Params extends GitOutputControls {
  currentProject: GitProjectInfo | undefined;
  isExecutingGit: boolean;
  setIsExecutingGit: (value: boolean) => void;
  refreshAfterGitChange: (projectPath: string) => Promise<void>;
}

export function useGitBranchModal({
  currentProject,
  isExecutingGit,
  setIsExecutingGit,
  setGitOutput,
  setGitOutputIsError,
  refreshAfterGitChange
}: Params) {
  const [isBranchModalOpen, setIsBranchModalOpen] = useState<boolean>(false);
  const [newBranchName, setNewBranchName] = useState<string>('');
  const [branchFilter, setBranchFilter] = useState<string>('');
  const [branchError, setBranchError] = useState<string | null>(null);

  const closeBranchModal = () => {
    setIsBranchModalOpen(false);
    setBranchError(null);
    setBranchFilter('');
  };

  const handleCheckoutBranch = async (branchName: string, createNew = false) => {
    if (!currentProject || isExecutingGit) return;
    setIsExecutingGit(true);
    setBranchError(null);
    setGitOutputIsError(false);
    setGitOutput(`Alternando branch para '${branchName}' no repositório ${currentProject.name}...`);
    try {
      const res = await window.electronAPI.checkoutBranch(currentProject.path, branchName, createNew);
      setGitOutputIsError(!res.success);
      setGitOutput(res.output);
      if (res.success) {
        closeBranchModal();
        setNewBranchName('');
        await refreshAfterGitChange(currentProject.path);
      } else {
        // O modal cobre o terminal da página; o erro precisa aparecer dentro dele.
        setBranchError(res.output);
      }
    } catch (err: any) {
      const message = `Erro ao alternar branch: ${err?.message || err}`;
      setGitOutputIsError(true);
      setGitOutput(message);
      setBranchError(message);
    } finally {
      setIsExecutingGit(false);
    }
  };

  return {
    isBranchModalOpen,
    setIsBranchModalOpen,
    newBranchName,
    setNewBranchName,
    branchFilter,
    setBranchFilter,
    branchError,
    closeBranchModal,
    handleCheckoutBranch
  };
}
