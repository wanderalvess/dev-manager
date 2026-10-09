import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight, ChevronLeft, Sun, Moon, Check } from 'lucide-react';
import { WELCOME_STEPS, WELCOME_STORAGE_KEY } from './welcomeSteps';
import { AppLogo } from '../AppLogo';
import { useTheme } from '../../context/ThemeContext';
import { Modal } from '../ui/Modal';

interface WelcomeIntroProps {
  isOpen: boolean;
  onFinish: () => void;
}

function markStorage(): void {
  try {
    window.localStorage.setItem(WELCOME_STORAGE_KEY, JSON.stringify({ done: true, ts: Date.now() }));
  } catch {
    // localStorage indisponível — a introdução volta a aparecer na próxima abertura
  }
}

export const WelcomeIntro: React.FC<WelcomeIntroProps> = ({ isOpen, onFinish }) => {
  const { mode, setMode } = useTheme();
  const [stepIndex, setStepIndex] = useState(0);
  // Controla o sentido da transição (avançar desliza da direita, voltar desliza da esquerda)
  const directionRef = useRef<1 | -1>(1);

  useEffect(() => {
    if (isOpen) {
      directionRef.current = 1;
      setStepIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc é tratado pelo Modal (onClose = finish)
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, stepIndex]);

  const step = WELCOME_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === WELCOME_STEPS.length - 1;
  const Icon = step.icon;

  const finish = () => {
    try {
      localStorage.setItem('theme', mode);
    } catch {
      // localStorage indisponível
    }
    markStorage();
    onFinish();
  };
  const goNext = () => {
    if (isLast) {
      finish();
      return;
    }
    directionRef.current = 1;
    setStepIndex((i) => i + 1);
  };
  const goPrev = () => {
    directionRef.current = -1;
    setStepIndex((i) => Math.max(0, i - 1));
  };

  const slideClass = directionRef.current === 1 ? 'animate-welcome-in-next' : 'animate-welcome-in-prev';

  return (
    <Modal
      open={isOpen}
      onClose={finish}
      bare
      closeOnBackdrop={false}
      zIndexClass="z-10002"
      ariaLabel="Introdução ao Hub Manager"
      panelClassName="fixed inset-0 bg-background overflow-hidden select-none animate-welcome-overlay"
    >
      {/* Grade de precisão técnica */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black 40%, transparent 90%)'
        }}
      />

      {/* Topo: progresso (só com mais de uma tela) + pular.
          z-10 é essencial aqui: sem isso, o botão "Pular introdução" fica visualmente por cima mas
          clicos nele são engolidos pelo <div> de conteúdo abaixo (irmão posicionado que vem depois
          no DOM, então empilha acima em z-index:auto — o clique nunca chega ao botão). */}
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between gap-4 p-5 sm:p-6">
        <div className="flex items-center gap-1.5">
          {WELCOME_STEPS.length > 1 &&
            WELCOME_STEPS.map((_, i) => (
              <div key={i} className="h-1 w-8 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                  style={{ width: i <= stepIndex ? '100%' : '0%' }}
                />
              </div>
            ))}
        </div>
        <button
          type="button"
          onClick={finish}
          className="h-8 px-3 rounded-lg text-xs font-semibold border border-border/70 text-muted-foreground hover:text-foreground hover:border-border bg-card/60 backdrop-blur-xs transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
        >
          Pular introdução
        </button>
      </div>

      {/* Conteúdo central */}
      <div className="relative h-full w-full flex items-center justify-center px-6">
        <div
          key={stepIndex}
          className={`max-w-xl w-full flex ${step.id === 'theme' ? 'items-start sm:items-center' : 'items-center'} gap-6 sm:gap-8 ${slideClass}`}
        >
          {isFirst ? (
            <div className="shrink-0 animate-welcome-icon">
              <AppLogo size="lg" />
            </div>
          ) : (
            <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary animate-welcome-icon">
              <Icon className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <span className="text-2xs font-bold uppercase tracking-widest text-primary">{step.eyebrow}</span>
            <h1 className="mt-1.5 text-3xl sm:text-4xl font-extrabold leading-tight text-foreground">
              {step.title} <span className="text-primary">{step.highlight}</span>
            </h1>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">{step.desc}</p>

            {step.id === 'theme' && (
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Cartão Tema Claro */}
                <button
                  type="button"
                  onClick={() => setMode('light')}
                  className={`group relative p-3.5 sm:p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                    mode === 'light'
                      ? 'border-primary ring-2 ring-primary/25 bg-primary/10 shadow-md'
                      : 'border-border/80 hover:border-border bg-card/60 hover:bg-card/90'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center border border-amber-500/30">
                      <Sun className="w-4 h-4" />
                    </div>
                    {mode === 'light' ? (
                      <span className="flex items-center gap-1 text-2xs font-bold text-primary bg-primary/15 px-2 py-0.5 rounded-full border border-primary/30">
                        <Check className="w-3 h-3 stroke-3" /> Selecionado
                      </span>
                    ) : (
                      <span className="text-2xs font-medium text-muted-foreground px-1.5 py-0.5 rounded bg-muted/60">Padrão</span>
                    )}
                  </div>
                  <div className="font-bold text-xs sm:text-sm text-foreground">Modo Claro</div>
                  <div className="text-2xs text-muted-foreground mt-0.5 leading-snug">Visual clássico e limpo para o dia a dia</div>

                  {/* Preview Mini UI */}
                  <div className="mt-3 p-2 rounded-lg bg-[#f8fafc] border border-slate-200/90 space-y-1.5 pointer-events-none shadow-2xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      <div className="h-1.5 w-10 bg-slate-300 rounded-full" />
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full" />
                    <div className="h-1.5 w-3/4 bg-slate-200 rounded-full" />
                  </div>
                </button>

                {/* Cartão Tema Escuro */}
                <button
                  type="button"
                  onClick={() => setMode('dark')}
                  className={`group relative p-3.5 sm:p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                    mode === 'dark'
                      ? 'border-primary ring-2 ring-primary/25 bg-primary/10 shadow-md'
                      : 'border-border/80 hover:border-border bg-card/60 hover:bg-card/90'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center border border-blue-500/30">
                      <Moon className="w-4 h-4" />
                    </div>
                    {mode === 'dark' && (
                      <span className="flex items-center gap-1 text-2xs font-bold text-primary bg-primary/15 px-2 py-0.5 rounded-full border border-primary/30">
                        <Check className="w-3 h-3 stroke-3" /> Selecionado
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-xs sm:text-sm text-foreground">Modo Escuro</div>
                  <div className="text-2xs text-muted-foreground mt-0.5 leading-snug">Confortável para os olhos e pouca luz</div>

                  {/* Preview Mini UI */}
                  <div className="mt-3 p-2 rounded-lg bg-[#0b0f19] border border-slate-700/90 space-y-1.5 pointer-events-none shadow-2xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      <div className="h-1.5 w-10 bg-slate-600 rounded-full" />
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full" />
                    <div className="h-1.5 w-3/4 bg-slate-800 rounded-full" />
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navegação inferior */}
      <div className="absolute bottom-0 inset-x-0 flex items-center justify-between gap-3 p-5 sm:p-6">
        <span className="text-2xs font-mono text-muted-foreground">
          {WELCOME_STEPS.length > 1 ? `${stepIndex + 1} de ${WELCOME_STEPS.length}` : ''}
        </span>
        <div className="flex items-center gap-2">
          {!isFirst && (
            <button
              type="button"
              onClick={goPrev}
              className="h-9 px-3.5 rounded-lg text-sm font-semibold border border-border/70 text-muted-foreground hover:text-foreground hover:border-border transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </button>
          )}
          <button
            type="button"
            onClick={goNext}
            className="h-9 px-4 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-xs group"
          >
            {isLast ? 'Começar' : 'Avançar'}
            <ChevronRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </Modal>
  );
};
