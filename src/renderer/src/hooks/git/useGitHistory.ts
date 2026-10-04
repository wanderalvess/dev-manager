import { useState } from 'react';
import type { GitCommitInfo, GitProjectInfo } from '../../../../shared/types';
import { useCopyToClipboard } from '../useCopyToClipboard';

export function useGitHistory(currentProject: GitProjectInfo | undefined) {
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [commitHistory, setCommitHistory] = useState<GitCommitInfo[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const { copy: copyHash, copiedKey: copiedHash } = useCopyToClipboard();

  const handleOpenHistory = async () => {
    if (!currentProject) return;
    setIsHistoryModalOpen(true);
    setIsLoadingHistory(true);
    setHistoryError(null);
    setCommitHistory([]);
    try {
      const history = await window.electronAPI.getCommitHistory(currentProject.path, 15);
      setCommitHistory(history || []);
    } catch (err: any) {
      console.error('Erro ao buscar histórico de commits:', err);
      setHistoryError(err?.message || String(err));
    } finally {
      setIsLoadingHistory(false);
    }
  };

  return {
    isHistoryModalOpen,
    setIsHistoryModalOpen,
    commitHistory,
    isLoadingHistory,
    historyError,
    copyHash,
    copiedHash,
    handleOpenHistory
  };
}
