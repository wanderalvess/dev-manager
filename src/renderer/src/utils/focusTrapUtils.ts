/** Seletor dos elementos que recebem foco pelo teclado dentro de um diálogo. */
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

/**
 * Próximo índice de foco ao apertar Tab (ou Shift+Tab) dentro do diálogo, dando a volta nas pontas para o foco
 * nunca escapar para a página que está por trás. `current` é -1 quando o foco está fora dos itens do diálogo.
 */
export function nextFocusIndex(current: number, total: number, backwards: boolean): number {
  if (total <= 0) return -1;
  if (current < 0) return backwards ? total - 1 : 0;
  return backwards ? (current - 1 + total) % total : (current + 1) % total;
}
