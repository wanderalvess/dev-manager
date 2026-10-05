import { useEffect, useState } from 'react';
import type { TourStep } from '../../components/onboarding/tourSteps';
import { areTourRectsEqual, getTourTargetEl, isTourRectOutOfView } from '../../utils/onboardingTourUtils';

/** Rastreamento contínuo em tempo real das coordenadas do alvo (evita desvios em tela cheia e mudanças assíncronas). */
export function useOnboardingTourSpotlight(steps: TourStep[], stepIndex: number, isOpen: boolean) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const step = steps[stepIndex];
    if (!step || step.target === null) {
      setRect(null);
      return;
    }
    const el = getTourTargetEl(step.target);
    if (!el) {
      setRect(null);
      return;
    }

    const measure = () => {
      const newRect = el.getBoundingClientRect();
      setRect((prev) => (prev && areTourRectsEqual(prev, newRect) ? prev : newRect));
    };

    // Medição imediata
    measure();

    // Rola para a área visível se estiver fora da tela
    if (isTourRectOutOfView(el.getBoundingClientRect())) {
      el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    }

    // Acompanha a rolagem a 60fps nos primeiros 750ms para manter o spotlight sincronizado
    let animId: number;
    const startTime = performance.now();
    const trackScroll = () => {
      measure();
      if (performance.now() - startTime < 750) {
        animId = requestAnimationFrame(trackScroll);
      }
    };
    animId = requestAnimationFrame(trackScroll);

    // ResizeObserver no alvo e no documento para detectar carregamento de dados e reflows responsivos
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        measure();
      });
      resizeObserver.observe(el);
      if (document.body) {
        resizeObserver.observe(document.body);
      }
    }

    // MutationObserver para capturar inclusão de elementos assíncronos no DOM
    let mutationObserver: MutationObserver | null = null;
    if (typeof MutationObserver !== 'undefined') {
      mutationObserver = new MutationObserver(() => {
        measure();
      });
      mutationObserver.observe(document.body, { childList: true, subtree: true, attributes: true });
    }

    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);

    return () => {
      cancelAnimationFrame(animId);
      if (resizeObserver) resizeObserver.disconnect();
      if (mutationObserver) mutationObserver.disconnect();
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [stepIndex, isOpen, steps]);

  return rect;
}
