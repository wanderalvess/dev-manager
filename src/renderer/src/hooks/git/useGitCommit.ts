import { useState } from 'react';
import type { GitFileStatus, GitProjectInfo } from '../../../../shared/types';
import type { GitOutputControls } from './useGitOutput';

interface Params extends GitOutputControls {
  currentProject: GitProjectInfo | undefined;
  refreshAfterGitChange: (projectPath: string) => Promise<void>;
}

export function useGitCommit({ currentProject, setGitOutput, setGitOutputIsError, refreshAfterGitChange }: Params) {
  const [isCommitModalOpen, setIsCommitModalOpen] = useState<boolean>(false);
  const [commitMessage, setCommitMessage] = useState<string>('');
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [commitFiles, setCommitFiles] = useState<GitFileStatus[]>([]);
  const [isLoadingCommitFiles, setIsLoadingCommitFiles] = useState<boolean>(false);

  const openCommitModal = async () => {
    if (!currentProject) return;
    setCommitError(null);
    setIsCommitModalOpen(true);
    setIsLoadingCommitFiles(true);
    try {
      const files = await window.electronAPI.getGitStatusDetails(currentProject.path);
      setCommitFiles(files || []);
    } catch {
      setCommitFiles([]);
    } finally {
      setIsLoadingCommitFiles(false);
    }
  };

  const handleCommitAndPush = async () => {
    if (!currentProject || !commitMessage.trim() || isCommitting) return;
    setIsCommitting(true);
    setCommitError(null);
    setGitOutputIsError(false);
    setGitOutput(`Executando commit & push no repositório ${currentProject.name}...`);
    try {
      const res = await window.electronAPI.commitAndPush(currentProject.path, commitMessage.trim());
      if (!res.success) {
        // Mantém o modal aberto com a mensagem digitada para o usuário corrigir e tentar de novo.
        setCommitError(res.output);
        setGitOutputIsError(true);
        setGitOutput(res.output);
      } else {
        // Push com falha: o commit já existe localmente, então o modal fecha, mas o aviso fica em destaque.
        setGitOutputIsError(Boolean(res.pushFailed));
        setGitOutput(res.output);
        setIsCommitModalOpen(false);
        setCommitMessage('');
      }
      await refreshAfterGitChange(currentProject.path);
    } catch (err: any) {
      const message = `Erro no commit/push: ${err?.message || err}`;
      setCommitError(message);
      setGitOutputIsError(true);
      setGitOutput(message);
    } finally {
      setIsCommitting(false);
    }
  };

  return {
    isCommitModalOpen,
    setIsCommitModalOpen,
    commitMessage,
    setCommitMessage,
    isCommitting,
    commitError,
    commitFiles,
    isLoadingCommitFiles,
    openCommitModal,
    handleCommitAndPush
  };
}
