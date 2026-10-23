import type { GitBranchPublishStatus, GitProjectInfo } from '../../../shared/types';

/** Leitura barata (sem rede) a partir das refs do origin já carregadas; o PR confirma no origin de verdade. */
export function isBranchLocalOnly(
  project: Pick<GitProjectInfo, 'currentBranch' | 'detachedHead' | 'remoteBranches' | 'provider'> | undefined
): boolean {
  if (!project || !project.provider || project.detachedHead) return false;
  return !(project.remoteBranches || []).includes(project.currentBranch);
}

export interface PublishPrompt {
  title: string;
  message: string;
  confirmLabel: string;
}

/** Pergunta exibida antes de abrir o PR; null quando a branch já está no origin e em dia. */
export function describePublishPrompt(status: GitBranchPublishStatus, targetBranch: string): PublishPrompt | null {
  if (!status.branch) return null;

  if (!status.publishedOnRemote) {
    return {
      title: 'Branch ainda não publicada',
      message:
        `A branch '${status.branch}' existe só neste computador. O provedor não consegue abrir o PR de uma branch ` +
        `que não está no origin (no Azure DevOps o erro é TF401175).\n\n` +
        `Publicar agora (git push --set-upstream origin ${status.branch}) e abrir o PR para '${targetBranch}'?`,
      confirmLabel: 'Publicar e abrir PR'
    };
  }

  if (status.unpushedCommits && status.unpushedCommits > 0) {
    const plural = status.unpushedCommits === 1 ? 'commit local ainda não foi enviado' : 'commits locais ainda não foram enviados';
    return {
      title: 'Há commits sem push',
      message:
        `${status.unpushedCommits} ${plural} para o origin; o PR não vai incluí-los.\n\n` +
        `Enviar agora (git push) e abrir o PR para '${targetBranch}'?`,
      confirmLabel: 'Enviar e abrir PR'
    };
  }

  return null;
}

export function getPrActionLabel(
  provider: GitProjectInfo['provider'],
  localOnly: boolean
): string {
  const kind = provider === 'gitlab' ? 'Merge Request' : 'Pull Request';
  const where = provider === 'github' ? 'GitHub' : provider === 'gitlab' ? 'GitLab' : 'Azure DevOps';
  return localOnly
    ? `Publicar Branch e Abrir ${kind} no ${where}`
    : `Abrir Formulário de ${kind} no ${where}`;
}
