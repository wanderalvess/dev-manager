import type { GitProjectInfo } from '../../../shared/types';

export const MAX_RENDERED_DIFF_LINES = 4000;

export function classifyDiffLine(line: string): { rowClass: string; gutterClass: string } {
  let rowClass = 'hover:bg-muted/20 text-muted-foreground/90';
  let gutterClass = 'border-l-2 border-transparent';
  const isAdd = line.startsWith('+') && !line.startsWith('+++');
  const isDel = line.startsWith('-') && !line.startsWith('---');
  const isHunk = line.startsWith('@@');
  const isHeader =
    line.startsWith('diff --git') || line.startsWith('index') || line.startsWith('+++') || line.startsWith('---');

  if (isAdd) {
    rowClass = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
    gutterClass = 'border-l-2 border-emerald-500';
  } else if (isDel) {
    rowClass = 'bg-rose-500/10 text-rose-700 dark:text-rose-300';
    gutterClass = 'border-l-2 border-rose-500';
  } else if (isHunk) {
    rowClass = 'bg-muted/70 text-primary font-semibold border-y border-border/40';
  } else if (isHeader) {
    rowClass = 'text-foreground font-semibold bg-muted/30';
  }
  return { rowClass, gutterClass };
}

export function taskBranchPrefixForType(type?: string): string {
  const lowerType = (type || '').toLowerCase();
  if (lowerType.includes('bug') || lowerType.includes('fix') || lowerType.includes('defeito')) return 'bugfix/';
  if (lowerType.includes('hotfix')) return 'hotfix/';
  return 'feature/';
}

export interface BranchEntry {
  name: string;
  remote: boolean;
}

/** Locais primeiro; branches só no origin entram depois (o checkout passa a rastreá-las). */
export function buildBranchEntries(
  localBranches: string[],
  remoteBranches: string[] | undefined,
  filterText: string
): { entries: BranchEntry[]; total: number } {
  const remoteOnly = (remoteBranches || []).filter((b) => !localBranches.includes(b));
  const filter = filterText.trim().toLowerCase();
  const entries = [
    ...localBranches.map((name) => ({ name, remote: false })),
    ...remoteOnly.map((name) => ({ name, remote: true }))
  ].filter((b) => !filter || b.name.toLowerCase().includes(filter));
  return { entries, total: localBranches.length + remoteOnly.length };
}

export function getRemoteProviderLabel(provider?: GitProjectInfo['provider']): string {
  if (provider === 'github') return 'Ver no GitHub';
  if (provider === 'gitlab') return 'Ver no GitLab';
  if (provider === 'azure') return 'Ver no Azure';
  return 'Ver Remoto';
}

export function getPrBlockedReason(
  project: Pick<GitProjectInfo, 'provider' | 'detachedHead' | 'currentBranch'> | undefined,
  targetBranch: string
): string | null {
  if (!project) return null;
  if (!project.provider) return 'Repositório não possui remoto compatível (Azure DevOps, GitHub ou GitLab)';
  if (project.detachedHead) return 'HEAD destacado: faça checkout de uma branch para abrir um Pull Request';
  if (targetBranch === project.currentBranch) return 'A branch de destino é a mesma da branch atual';
  return null;
}

export function getPrPanelTitle(provider?: GitProjectInfo['provider']): string {
  if (provider === 'github') return 'Criar Pull Request no GitHub';
  if (provider === 'gitlab') return 'Criar Merge Request no GitLab';
  return 'Criar Pull Request no Azure DevOps';
}

export function getPrButtonLabel(provider?: GitProjectInfo['provider']): string {
  if (provider === 'azure') return 'Abrir Formulário de Pull Request no Azure DevOps';
  if (provider === 'github') return 'Abrir Formulário de Pull Request no GitHub';
  return 'Abrir Formulário de Merge Request no GitLab';
}
