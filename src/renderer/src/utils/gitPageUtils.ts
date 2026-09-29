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

/**
 * Converte um título de tarefa para formato amigável de slug de branch git.
 * Remove acentos, caracteres especiais, limita tamanho e evita hífens soltos.
 */
export function slugifyTaskTitle(title: string, maxLength = 45): string {
  if (!title) return '';
  const normalized = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (normalized.length <= maxLength) {
    return normalized;
  }
  return normalized.slice(0, maxLength).replace(/-+$/, '');
}

/**
 * Faz parse inteligente de entrada digitada ou colada pelo usuário (URL do Azure/Jira ou formato id+título).
 */
export function parseTaskInput(rawInput: string): { taskId?: string; taskTitle?: string } {
  const trimmed = rawInput.trim();
  if (!trimmed) return {};

  // URL do Azure DevOps: .../_workitems/edit/12345 ou similar
  const azureUrlMatch = trimmed.match(/_workitems\/edit\/(\d+)/i);
  if (azureUrlMatch) {
    return { taskId: azureUrlMatch[1] };
  }

  // URL do Jira: .../browse/ABC-1234
  const jiraUrlMatch = trimmed.match(/\/browse\/([A-Za-z0-9]+-\d+)/i);
  if (jiraUrlMatch) {
    return { taskId: jiraUrlMatch[1].toUpperCase() };
  }

  // Formato tipo "#12345 - Título da tarefa" ou "12345 - Título"
  const hashIdMatch = trimmed.match(/^#?(\d+)\s*[-:]\s*(.+)$/i);
  if (hashIdMatch) {
    return { taskId: hashIdMatch[1], taskTitle: hashIdMatch[2].trim() };
  }

  // Formato tipo "PROJ-1234: Título da tarefa" ou "PROJ-1234 - Título"
  const jiraKeyMatch = trimmed.match(/^([A-Za-z0-9]+-\d+)\s*[-:]\s*(.+)$/i);
  if (jiraKeyMatch) {
    return { taskId: jiraKeyMatch[1].toUpperCase(), taskTitle: jiraKeyMatch[2].trim() };
  }

  // Apenas ID numérico ou chave Jira isolada
  if (/^\d+$/.test(trimmed)) {
    return { taskId: trimmed };
  }
  if (/^[A-Za-z0-9]+-\d+$/i.test(trimmed)) {
    return { taskId: trimmed.toUpperCase() };
  }

  // Caso genérico: texto livre interpretado como título
  return { taskTitle: trimmed };
}

export interface TaskBranchOptions {
  prefix?: string;
  taskId?: string;
  title?: string;
}

/**
 * Gera o nome padronizado da branch a partir dos parâmetros da tarefa.
 */
export function generateTaskBranchName({ prefix = 'feature/', taskId, title }: TaskBranchOptions): string {
  const cleanPrefix = prefix ? (prefix.endsWith('/') ? prefix : `${prefix}/`) : '';
  const cleanTaskId = taskId?.trim() ? taskId.trim() : '';
  const slug = title ? slugifyTaskTitle(title) : '';

  let part = '';
  if (cleanTaskId && slug) {
    part = `${cleanTaskId}-${slug}`;
  } else if (cleanTaskId) {
    part = cleanTaskId;
  } else if (slug) {
    part = slug;
  }

  return `${cleanPrefix}${part}`;
}

/**
 * Valida se um nome de branch segue regras básicas do Git.
 */
export function validateBranchName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { valid: false, error: 'O nome da branch não pode ser vazio.' };
  }
  if (/\s/.test(trimmed)) {
    return { valid: false, error: 'O nome da branch não pode conter espaços.' };
  }
  if (trimmed.startsWith('/') || trimmed.endsWith('/')) {
    return { valid: false, error: 'O nome da branch não pode iniciar nem terminar com barra ("/").' };
  }
  if (trimmed.includes('//')) {
    return { valid: false, error: 'O nome da branch não pode conter barras consecutivas ("//").' };
  }
  if (trimmed.includes('..')) {
    return { valid: false, error: 'O nome da branch não pode conter dois pontos consecutivos ("..").' };
  }
  if (trimmed.endsWith('.lock')) {
    return { valid: false, error: 'O nome da branch não pode terminar com ".lock".' };
  }
  if (/[\x00-\x20\x7F~^:?*\[\\@]/.test(trimmed) || trimmed.includes('@{')) {
    return { valid: false, error: 'O nome da branch contém caracteres proibidos pelo Git (~, ^, :, ?, *, [, \\, @{).' };
  }
  return { valid: true };
}
