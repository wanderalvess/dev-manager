import type React from 'react';

/**
 * Padrão de grupo de rádio: só a opção escolhida entra na ordem do Tab (se nenhuma, a primeira) e as setas movem E
 * escolhem a próxima (voltando ao início no fim), levando o foco junto.
 */
export function radioProps(opts: { index: number; count: number; checked: boolean; anyChecked: boolean; pickAt: (i: number) => void }) {
  const { index, count, checked, anyChecked, pickAt } = opts;
  return {
    role: 'radio' as const,
    'aria-checked': checked,
    tabIndex: checked || (!anyChecked && index === 0) ? 0 : -1,
    onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => {
      const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      const next = (index + step + count) % count;
      pickAt(next);
      const radios = e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
      radios?.[next]?.focus();
    }
  };
}
