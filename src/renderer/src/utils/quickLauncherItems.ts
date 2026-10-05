import { Grid, GitBranch } from 'lucide-react';
import type { GitProjectInfo, RoutineItem } from '../../../shared/types';
import { fuzzyMatchBest } from './fuzzyMatch';
import {
  buildQuickLauncherActions,
  type QuickLauncherActionHandlers,
  type QuickLauncherItem
} from './quickLauncherActions';

export interface BuildQuickLauncherItemsParams extends QuickLauncherActionHandlers {
  search: string;
  routines: RoutineItem[];
  projects: GitProjectInfo[];
  /** Injetado para manter esta função livre de acesso direto a window/IPC. */
  launchRoutine: (fullPath: string) => Promise<void>;
}

/** Aplica fuzzy match (título + subtítulo) e retorna o item enriquecido, ou null se não casar. */
export function applyQuickLauncherMatch(
  query: string,
  item: QuickLauncherItem
): QuickLauncherItem | null {
  if (!query) return item;
  const best = fuzzyMatchBest(query, [item.title, item.subtitle ?? '']);
  if (best.fieldIndex === -1) return null;
  return {
    ...item,
    score: best.score,
    titleMatchIndices: best.fieldIndex === 0 ? best.matchedIndices : undefined
  };
}

/** Monta, filtra e ordena (ações → rotinas → repositórios; por score quando há busca). */
export function buildQuickLauncherItems(params: BuildQuickLauncherItemsParams): QuickLauncherItem[] {
  const { search, routines, projects, onNavigate, onClose, launchRoutine } = params;
  const q = search.trim().toLowerCase();
  const items: QuickLauncherItem[] = [];
  const push = (item: QuickLauncherItem) => {
    const matched = applyQuickLauncherMatch(q, item);
    if (matched) items.push(matched);
  };

  buildQuickLauncherActions(params).forEach(push);

  routines.forEach((r) =>
    push({
      id: `rt-${r.id}`,
      category: 'routine',
      title: `Rotina ${r.name}`,
      subtitle: `Módulo ${r.module} • ${r.sizeMb} • ${r.id}`,
      badge: r.id,
      icon: Grid,
      isFavorite: r.isFavorite,
      onSelect: async () => {
        await launchRoutine(r.fullPath);
        onClose();
      }
    })
  );

  projects.forEach((p) =>
    push({
      id: `repo-${p.name}`,
      category: 'repo',
      title: `Projeto ${p.name}`,
      subtitle: `Branch: ${p.currentBranch} ${p.uncommittedCount ? `(${p.uncommittedCount} mods)` : ''}`,
      badge: 'Git',
      icon: GitBranch,
      onSelect: () => {
        onNavigate('git');
        onClose();
      }
    })
  );

  // Só reordena com busca ativa; sem busca mantém a ordem de composição.
  if (q) {
    items.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }

  return items;
}
