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
// Estimativa da altura do tooltip usada só para limitar sua posição vertical à tela — não precisa ser exata,
// só suficiente para nunca deixar os botões (Próximo/Pular) fora da área visível.
const TOOLTIP_ESTIMATED_HEIGHT = 200;
const TOOLTIP_GAP = 16;
const VIEWPORT_MARGIN = 12;

function getTargetEl(target: string | null): HTMLElement | null {
  if (!target) return null;
  return document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
}

// Passo cujo alvo não existe agora (sessão vazia, filtro escondeu, breakpoint mobile etc) é inválido e deve ser pulado.
function isStepValid(step: TourStep | undefined): boolean {
  if (!step) return false;
  return step.target === null || !!getTargetEl(step.target);
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
    // localStorage indisponível — tour volta a aparecer na próxima abertura, sem problema
  }
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ steps, isOpen, onClose, storageKey }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
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
      // Não há mais passos válidos nessa direção (ex: página sem itens pra destacar) — encerra em vez de voltar sozinho.
      finish();
      return;
    }
    if (valid !== stepIndex) setStepIndex(valid);
  }, [stepIndex, isOpen, steps, finish]);

  // Mede o alvo e mantém a posição atualizada durante scroll/resize
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

    const measure = () => setRect(el.getBoundingClientRect());
    const initial = el.getBoundingClientRect();
    const outOfView = initial.top < 0 || initial.bottom > window.innerHeight;

    let scrollTimeout: ReturnType<typeof setTimeout> | undefined;
    if (outOfView) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      scrollTimeout = setTimeout(measure, 350);
    } else {
      measure();
    }

    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
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
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const placeBelow = spaceBelow >= spaceAbove;

        let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
        left = Math.min(Math.max(left, VIEWPORT_MARGIN), window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_MARGIN);

        // Alvo alto (ex: sidebar de altura total) pode deixar rect.top/rect.bottom fora da viewport —
        // sempre limita o `top` final aos limites da tela para o tooltip nunca ficar inacessível.
        let top = placeBelow ? rect.bottom + TOOLTIP_GAP : rect.top - TOOLTIP_GAP - TOOLTIP_ESTIMATED_HEIGHT;
        top = Math.min(Math.max(top, VIEWPORT_MARGIN), window.innerHeight - TOOLTIP_ESTIMATED_HEIGHT - VIEWPORT_MARGIN);

        return {
          position: 'fixed',
          left,
          top,
          width: TOOLTIP_WIDTH
        };
      })()
    : {
        position: 'fixed',
        top: '50%',
        left: '50%',
        width: TOOLTIP_WIDTH,
        transform: 'translate(-50%, -50%)'
      };

  return (
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true">
      {/* Overlay escuro + spotlight (box-shadow com spread cobre tudo exceto o alvo) */}
      <div className="fixed inset-0" onClick={(e) => e.stopPropagation()}>
        {rect ? (
          <div
            className="fixed rounded-2xl border-2 border-primary pointer-events-none transition-all duration-300 ease-out"
            style={{
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)',
              top: rect.top - RING_PADDING,
              left: rect.left - RING_PADDING,
              width: rect.width + RING_PADDING * 2,
              height: rect.height + RING_PADDING * 2
            }}
          />
        ) : (
          <div className="fixed inset-0 bg-black/70" />
        )}
      </div>

      {/* Tooltip — troca de conteúdo por chave com transição suave */}
      <div
        key={stepIndex}
        style={tooltipStyle}
        className="animate-tour-fade bg-card text-card-foreground rounded-xl border border-border shadow-2xl p-4 space-y-3"
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
              className="h-7 px-3 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition flex items-center gap-1 cursor-pointer"
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
