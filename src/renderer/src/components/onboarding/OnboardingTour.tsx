import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react';
import { TourStep } from './tourSteps';
import { announceTourFinished } from './tourCoordinator';

interface OnboardingTourProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  /** Chave de localStorage marcada ao concluir/pular este tour (cada página usa a sua) */
  storageKey: string;
}

const RING_PADDING = 6;
const TOOLTIP_WIDTH = 320;
const TOOLTIP_GAP = 14;
const VIEWPORT_MARGIN = 16;

function getTargetEl(target: string | null): HTMLElement | null {
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
function isStepValid(step: TourStep | undefined): boolean {
  if (!step) return false;
  if (step.target === null) return true;
  const el = getTargetEl(step.target);
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

function findValidIndex(steps: TourStep[], start: number, dir: 1 | -1): number | null {
  let i = start;
  while (i >= 0 && i < steps.length) {
    if (isStepValid(steps[i])) return i;
    i += dir;
  }
  return null;
}

function markStorage(storageKey: string): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify({ done: true, ts: Date.now() }));
  } catch {
    // localStorage indisponível — tour volta a aparecer na próxima abertura
  }
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ steps, isOpen, onClose, storageKey }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [tooltipDimensions, setTooltipDimensions] = useState<{ width: number; height: number }>({
    width: TOOLTIP_WIDTH,
    height: 180
  });
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const directionRef = useRef<1 | -1>(1);

  const finish = useCallback(() => {
    markStorage(storageKey);
    announceTourFinished();
    onClose();
  }, [onClose, storageKey]);

  // Reseta ao abrir
  useEffect(() => {
    if (isOpen) {
      directionRef.current = 1;
      setStepIndex(0);
    }
  }, [isOpen]);

  // Resolve passo atual pulando alvos ausentes na direção da navegação
  useEffect(() => {
    if (!isOpen) return;
    if (stepIndex < 0 || stepIndex >= steps.length) {
      finish();
      return;
    }
    const dir = directionRef.current;
    const valid = findValidIndex(steps, stepIndex, dir);
    if (valid === null) {
      finish();
      return;
    }
    if (valid !== stepIndex) setStepIndex(valid);
  }, [stepIndex, isOpen, steps, finish]);

  // Mede as dimensões reais do tooltip renderizado para posicionamento preciso
  useEffect(() => {
    if (tooltipRef.current) {
      const { offsetWidth, offsetHeight } = tooltipRef.current;
      if (offsetWidth > 0 && offsetHeight > 0) {
        setTooltipDimensions({ width: offsetWidth, height: offsetHeight });
      }
    }
  }, [stepIndex, isOpen]);

  // Rastreamento contínuo em tempo real de coordenadas (evita desvios em tela cheia e mudanças assíncronas)
  useEffect(() => {
    if (!isOpen) return;
    const step = steps[stepIndex];
    if (!step || step.target === null) {
      setRect(null);
      return;
    }
    const el = getTargetEl(step.target);
    if (!el) {
      setRect(null);
      return;
    }

    const measure = () => {
      const newRect = el.getBoundingClientRect();
      setRect((prev) => {
        if (
          prev &&
          Math.abs(prev.top - newRect.top) < 0.5 &&
          Math.abs(prev.left - newRect.left) < 0.5 &&
          Math.abs(prev.width - newRect.width) < 0.5 &&
          Math.abs(prev.height - newRect.height) < 0.5
        ) {
          return prev;
        }
        return newRect;
      });
    };

    // Medição imediata
    measure();

    // Rola para a área visível se estiver fora da tela
    const initial = el.getBoundingClientRect();
    const outOfView =
      initial.top < 60 ||
      initial.bottom > window.innerHeight - 60 ||
      initial.left < 0 ||
      initial.right > window.innerWidth;

    if (outOfView) {
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

  // Atalhos de teclado
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      else if (e.key === 'ArrowRight') {
        directionRef.current = 1;
        setStepIndex((i) => i + 1);
      } else if (e.key === 'ArrowLeft') {
        directionRef.current = -1;
        setStepIndex((i) => i - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, finish]);

  if (!isOpen) return null;

  const step = steps[stepIndex];
  if (!step) return null;

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  const goNext = () => {
    directionRef.current = 1;
    setStepIndex((i) => i + 1);
  };
  const goPrev = () => {
    directionRef.current = -1;
    setStepIndex((i) => i - 1);
  };

  const tooltipStyle: React.CSSProperties = rect
    ? (() => {
        const tooltipW = tooltipDimensions.width || TOOLTIP_WIDTH;
        const tooltipH = tooltipDimensions.height || 180;

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
      })()
    : {
        position: 'fixed',
        top: '50%',
        left: '50%',
        width: TOOLTIP_WIDTH,
        transform: 'translate(-50%, -50%)',
        zIndex: 10000
      };

  return (
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true">
      {/* Overlay escuro + spotlight */}
      <div className="fixed inset-0" onClick={(e) => e.stopPropagation()}>
        {rect ? (
          <div
            className="fixed rounded-2xl border-2 border-primary pointer-events-none transition-all duration-200 ease-out shadow-lg"
            style={{
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.72)',
              top: Math.round(rect.top - RING_PADDING),
              left: Math.round(rect.left - RING_PADDING),
              width: Math.round(rect.width + RING_PADDING * 2),
              height: Math.round(rect.height + RING_PADDING * 2)
            }}
          />
        ) : (
          <div className="fixed inset-0 bg-black/70" />
        )}
      </div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        key={stepIndex}
        style={tooltipStyle}
        className="animate-tour-fade bg-card text-card-foreground rounded-2xl border border-border shadow-2xl p-4 space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 text-primary">
            <Sparkles className="w-4 h-4 shrink-0" />
            <h3 className="text-sm font-bold text-foreground">{step.title}</h3>
          </div>
          <button
            type="button"
            onClick={finish}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition shrink-0 cursor-pointer"
            title="Pular tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] font-mono text-muted-foreground">
            {stepIndex + 1} de {steps.length}
          </span>
          <div className="flex items-center gap-1.5">
            {!isFirst && (
              <button
                type="button"
                onClick={goPrev}
                className="h-7 px-2.5 rounded-lg text-xs font-semibold border border-border/60 hover:border-border text-muted-foreground hover:text-foreground transition flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Voltar
              </button>
            )}
            <button
              type="button"
              onClick={isLast ? finish : goNext}
              className="h-7 px-3 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition flex items-center gap-1 cursor-pointer shadow-xs"
            >
              {isLast ? 'Concluir' : 'Próximo'}
              {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
