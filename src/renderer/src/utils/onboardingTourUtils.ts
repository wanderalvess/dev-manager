import type React from 'react';
import type { TourStep } from '../components/onboarding/tourSteps';

export const TOUR_RING_PADDING = 6;
export const TOUR_TOOLTIP_WIDTH = 320;
export const TOUR_TOOLTIP_HEIGHT = 180;
const TOOLTIP_GAP = 14;
const VIEWPORT_MARGIN = 16;

export function getTourTargetEl(target: string | null): HTMLElement | null {
  if (!target) return null;
  const elements = document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`);
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const style = window.getComputedStyle(el);
    if (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      el.offsetWidth > 0 &&
      el.offsetHeight > 0
    ) {
      return el;
    }
  }
  return elements[0] || null;
}

// Passo cujo alvo não existe ou está invisível (ex: aba oculta, dropdown fechado, breakpoint mobile etc) deve ser pulado.
export function isTourStepValid(step: TourStep | undefined): boolean {
  if (!step) return false;
  if (step.target === null) return true;
  const el = getTourTargetEl(step.target);
  if (!el) return false;
  const style = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    (rect.width > 0 || el.offsetWidth > 0) &&
    (rect.height > 0 || el.offsetHeight > 0)
  );
}

export function findValidTourIndex(steps: TourStep[], start: number, dir: 1 | -1): number | null {
  let i = start;
  while (i >= 0 && i < steps.length) {
    if (isTourStepValid(steps[i])) return i;
    i += dir;
  }
  return null;
}

export function markTourStorage(storageKey: string): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify({ done: true, ts: Date.now() }));
  } catch {
    // localStorage indisponível — tour volta a aparecer na próxima abertura
  }
}

/** Evita re-render por variações sub-pixel durante o rastreamento do alvo. */
export function areTourRectsEqual(prev: DOMRect, next: DOMRect): boolean {
  return (
    Math.abs(prev.top - next.top) < 0.5 &&
    Math.abs(prev.left - next.left) < 0.5 &&
    Math.abs(prev.width - next.width) < 0.5 &&
    Math.abs(prev.height - next.height) < 0.5
  );
}

export function isTourRectOutOfView(rect: DOMRect): boolean {
  return (
    rect.top < 60 ||
    rect.bottom > window.innerHeight - 60 ||
    rect.left < 0 ||
    rect.right > window.innerWidth
  );
}

export function computeTourTooltipStyle(
  rect: DOMRect | null,
  dimensions: { width: number; height: number }
): React.CSSProperties {
  if (!rect) {
    return {
      position: 'fixed',
      top: '50%',
      left: '50%',
      width: TOUR_TOOLTIP_WIDTH,
      transform: 'translate(-50%, -50%)',
      zIndex: 10000
    };
  }

  const tooltipW = dimensions.width || TOUR_TOOLTIP_WIDTH;
  const tooltipH = dimensions.height || TOUR_TOOLTIP_HEIGHT;

  // Centralizado horizontalmente no elemento alvo, respeitando as bordas da tela
  let left = rect.left + rect.width / 2 - tooltipW / 2;
  left = Math.min(Math.max(left, VIEWPORT_MARGIN), window.innerWidth - tooltipW - VIEWPORT_MARGIN);

  // Verifica espaço vertical disponível
  const spaceBelow = window.innerHeight - rect.bottom - TOOLTIP_GAP;
  const spaceAbove = rect.top - TOOLTIP_GAP;

  let top: number;
  if (spaceBelow >= tooltipH + VIEWPORT_MARGIN) {
    top = rect.bottom + TOOLTIP_GAP;
  } else if (spaceAbove >= tooltipH + VIEWPORT_MARGIN) {
    top = rect.top - TOOLTIP_GAP - tooltipH;
  } else {
    // Se não couber com folga em nenhum dos lados, posiciona no lado que tiver maior espaço
    top = spaceBelow >= spaceAbove ? rect.bottom + TOOLTIP_GAP : rect.top - TOOLTIP_GAP - tooltipH;
    top = Math.min(Math.max(top, VIEWPORT_MARGIN), window.innerHeight - tooltipH - VIEWPORT_MARGIN);
  }

  return {
    position: 'fixed',
    left: Math.round(left),
    top: Math.round(top),
    width: tooltipW,
    zIndex: 10000
  };
}
