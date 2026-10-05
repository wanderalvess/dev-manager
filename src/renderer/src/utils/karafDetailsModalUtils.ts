/**
 * Lógica pura extraída de KarafDetailsModal.tsx: tipo das abas e classes de estilo
 * dos botões de aba.
 */
export type KarafDetailsTab = 'dependents' | 'tree' | 'exports' | 'imports' | 'headers' | 'diag';

export const DEFAULT_DETAILS_TAB: KarafDetailsTab = 'dependents';

const TAB_BASE = 'py-2 px-3 text-xs font-semibold border-b-2 transition cursor-pointer';

/** Classes do botão de aba; a aba de diagnóstico usa a paleta rose para sinalizar erro. */
export function getDetailsTabClass(tab: KarafDetailsTab, active: KarafDetailsTab): string {
  const isActive = tab === active;
  if (tab === 'diag') {
    return `${TAB_BASE} ${
      isActive ? 'border-rose-500 text-rose-500 font-bold' : 'border-transparent text-rose-400 hover:text-rose-300'
    }`;
  }
  const withIcon = tab === 'tree' ? ' flex items-center gap-1.5' : '';
  return `${TAB_BASE}${withIcon} ${
    isActive ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'
  }`;
}
