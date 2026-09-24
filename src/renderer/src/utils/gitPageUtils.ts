import { GitFileStatus } from '../../../shared/types';

const COMMON_TARGET_BRANCHES = ['develop', 'main', 'master'];

interface TargetBranchOptionsInput {
  /** Branches do origin conhecidas localmente (vazio se o repositório nunca fez fetch). */
  remoteBranches?: string[];
  currentBranch: string;
  /** Valor atualmente selecionado; sempre entra na lista para o <select> não exibir outra opção. */
  selected: string;
  /** Branch alvo padrão definida nas configurações. */
  preferred?: string;
}

/**
 * Monta as opções de branch de destino do PR: a padrão das configurações, as convencionais
 * (develop/main/master) que existem no origin e depois as demais branches remotas. Sem refs
 * remotas (nenhum fetch ainda), cai nas convencionais.
 */
export function buildTargetBranchOptions({
  remoteBranches,
  currentBranch,
  selected,
  preferred
}: TargetBranchOptionsInput): string[] {
  const known = remoteBranches && remoteBranches.length > 0 ? remoteBranches : COMMON_TARGET_BRANCHES;
  const ordered = [preferred, ...COMMON_TARGET_BRANCHES.filter((b) => known.includes(b)), ...known];

  const options: string[] = [];
  for (const branch of ordered) {
    if (!branch || branch === currentBranch || options.includes(branch)) continue;
    options.push(branch);
  }
  if (selected && !options.includes(selected)) {
    options.unshift(selected);
  }
  return options;
}

export function fileStatusBadge(status: GitFileStatus['status']): { label: string; className: string } {
  switch (status) {
    case 'added':
      return { label: 'A', className: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' };
    case 'deleted':
      return { label: 'D', className: 'bg-rose-500/15 text-rose-500 border-rose-500/30' };
    case 'untracked':
      return { label: '?', className: 'bg-purple-500/15 text-purple-400 border-purple-500/30' };
    case 'renamed':
      return { label: 'R', className: 'bg-sky-500/15 text-sky-500 border-sky-500/30' };
    case 'copied':
      return { label: 'C', className: 'bg-sky-500/15 text-sky-500 border-sky-500/30' };
    default:
      return { label: 'M', className: 'bg-amber-500/15 text-amber-500 border-amber-500/30' };
  }
}

/** Corta o diff para renderização: dezenas de milhares de linhas em DOM travam o modal. */
export function limitDiffLines(diffText: string, maxLines: number): { lines: string[]; hiddenCount: number } {
  const allLines = diffText.split(/\r?\n/);
  if (allLines.length <= maxLines) {
    return { lines: allLines, hiddenCount: 0 };
  }
  return { lines: allLines.slice(0, maxLines), hiddenCount: allLines.length - maxLines };
}
