import { useState } from 'react';
import type { GitProjectInfo } from '../../../../shared/types';
import { requestConfirm } from '../../components/ui/confirmService';
import { describePublishPrompt } from '../../utils/gitPublishViewUtils';
import type { GitOutputControls } from './useGitOutput';

interface Params extends GitOutputControls {
  currentProject: GitProjectInfo | undefined;
  refreshAfterGitChange: (projectPath: string) => Promise<void>;
}

/** Publicação da branch atual no origin (push com upstream) e a checagem que antecede a abertura do PR. */
export function useGitPublish({ currentProject, setGitOutput, setGitOutputIsError, refreshAfterGitChange }: Params) {
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  const publish = async (project: GitProjectInfo): Promise<boolean> => {
    setIsPublishing(true);
    setGitOutputIsError(false);
    setGitOutput(`Publicando '${project.currentBranch}' em origin (git push --set-upstream)...`);
    try {
      const res = await window.electronAPI.publishBranch(project.path);
      setGitOutputIsError(!res.success);
      setGitOutput(res.output);
      await refreshAfterGitChange(project.path);
      return res.success;
    } catch (err: any) {
      setGitOutputIsError(true);
      setGitOutput(`Erro ao publicar a branch: ${err?.message || err}`);
      return false;
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublish = async () => {
    if (!currentProject || isPublishing) return;
    await publish(currentProject);
  };

  /**
   * Garante que o PR terá o que mostrar: confere no origin se a branch existe e está em dia e, se não estiver,
   * oferece o push. Devolve false quando o usuário recusa ou o push falha (o PR não deve ser aberto).
   */
  const ensurePublishedForPr = async (targetBranch: string): Promise<boolean> => {
    if (!currentProject) return false;
    setGitOutputIsError(false);
    setGitOutput('Verificando no origin se a branch já foi publicada...');
    const status = await window.electronAPI.getBranchPublishStatus(currentProject.path).catch(() => null);
    const prompt = status ? describePublishPrompt(status, targetBranch) : null;
    if (!status || !prompt) {
      setGitOutput(status?.warning ?? null);
      return true;
    }

    const confirmed = await requestConfirm({ ...prompt, tone: 'warning' });
    if (!confirmed) {
      setGitOutput(`Abertura do PR cancelada: '${status.branch}' não está em dia com o origin.`);
      return false;
    }
    return publish(currentProject);
  };

  return { isPublishing, handlePublish, ensurePublishedForPr };
}
