import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { AppLogo } from '../AppLogo';
import { Modal } from '../ui/Modal';
import { SPLASH_BOOT_LINES } from './onboardingContent';

interface SplashScreenProps {
  isOpen: boolean;
  /** Primeira vez no app: termina oferecendo o onboarding em vez de entrar direto. */
  isNewUser: boolean;
  appVersion: string;
  onStartOnboarding: () => void;
  onExplore: () => void;
  onEnter: () => void;
  onWhatsNew: () => void;
}

const LINE_MS = 380;
const BOOT_START_MS = 1500;
// Quem já usa o app não precisa clicar para entrar: a abertura some sozinha pouco depois do boot.
const RETURNING_AUTO_CLOSE_MS = 1600;

const prefersReducedMotion = (): boolean => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

const TITLE_WORDS = [
  { word: 'Hub', accent: false },
  { word: 'Manager', accent: true }
];

export const SplashScreen: React.FC<SplashScreenProps> = ({
  isOpen,
  isNewUser,
  appVersion,
  onStartOnboarding,
  onExplore,
  onEnter,
  onWhatsNew
}) => {
  const [tick, setTick] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTick(0);
    setDone(false);
    if (prefersReducedMotion()) {
      setTick(SPLASH_BOOT_LINES.length - 1);
      setDone(true);
      return;
    }
    const timers = SPLASH_BOOT_LINES.map((_, i) => setTimeout(() => setTick(i), BOOT_START_MS + i * LINE_MS));
    timers.push(setTimeout(() => setDone(true), BOOT_START_MS + SPLASH_BOOT_LINES.length * LINE_MS));
    return () => timers.forEach(clearTimeout);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !done || isNewUser) return;
    const t = setTimeout(onEnter, RETURNING_AUTO_CLOSE_MS);
    return () => clearTimeout(t);
  }, [isOpen, done, isNewUser, onEnter]);

  const skip = () => {
    setTick(SPLASH_BOOT_LINES.length - 1);
    setDone(true);
  };

  const progress = Math.round(((tick + 1) / SPLASH_BOOT_LINES.length) * 100);
  let letterIndex = 0;

  return (
    <Modal
      open={isOpen}
      onClose={done ? (isNewUser ? onExplore : onEnter) : skip}
      bare
      closeOnBackdrop={false}
      zIndexClass="z-10003"
      ariaLabel="Abertura do Hub Manager"
      panelClassName="fixed inset-0 bg-background text-foreground overflow-hidden select-none flex flex-col items-center justify-center"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 w-[900px] h-[900px] -ml-[450px] -mt-[450px] rounded-full animate-splash-glow"
        style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.16) 0%, transparent 60%)' }}
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 1100 1100"
        fill="none"
        className="pointer-events-none absolute left-1/2 top-1/2 w-[1100px] h-[1100px] -ml-[550px] -mt-[550px] animate-splash-orbit"
      >
        <circle cx="550" cy="550" r="540" className="stroke-border" strokeOpacity="0.5" />
        <circle cx="550" cy="550" r="420" className="stroke-border" strokeOpacity="0.5" strokeDasharray="2 12" />
        <circle cx="1090" cy="550" r="5" className="fill-primary" />
        <circle cx="550" cy="130" r="3" className="fill-foreground" />
      </svg>

      <div className="relative flex flex-col items-center gap-7 px-6">
        <div className="relative w-28 h-28 flex items-center justify-center">
          <span aria-hidden="true" className="absolute inset-0 rounded-full border-2 border-primary animate-splash-ring" />
          <span aria-hidden="true" className="absolute inset-0 rounded-full border border-primary animate-splash-ring [animation-delay:0.3s]" />
          <div className="animate-splash-logo">
            <AppLogo size="lg" />
          </div>
        </div>

        <h1 aria-label="Hub Manager" className="m-0 flex gap-6 text-6xl sm:text-8xl font-extrabold tracking-tighter leading-none">
          {TITLE_WORDS.map(({ word, accent }) => (
            <span key={word} aria-hidden="true" className={accent ? 'text-primary' : undefined}>
              {word.split('').map((ch, i) => {
                const delay = 0.6 + letterIndex++ * 0.06;
                return (
                  <span key={i} className="inline-block animate-splash-letter" style={{ animationDelay: `${delay}s` }}>
                    {ch}
                  </span>
                );
              })}
            </span>
          ))}
        </h1>

        <p className="m-0 font-mono text-xs sm:text-sm tracking-[0.32em] text-muted-foreground animate-splash-rise [animation-delay:1.3s]">
          OPERAÇÃO · DESENVOLVIMENTO · QUALIDADE
        </p>

        {!done && (
          <div className="mt-4 w-[min(420px,80vw)] flex flex-col items-center gap-3 animate-splash-rise [animation-delay:1.5s]">
            <div className="relative w-full h-[3px] rounded-full bg-border overflow-hidden">
              <div className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} />
            </div>
            <span className="font-mono text-xs text-muted-foreground" aria-live="polite">
              {SPLASH_BOOT_LINES[tick]}
            </span>
          </div>
        )}

        {done && isNewUser && (
          <div className="mt-4 flex flex-col items-center gap-5">
            <p className="m-0 text-lg sm:text-xl text-muted-foreground text-center max-w-xl leading-relaxed animate-splash-rise">
              Primeira vez por aqui? Vamos deixar o seu cockpit pronto em poucos passos.
            </p>
            <div className="flex flex-wrap justify-center gap-3 animate-splash-rise [animation-delay:0.1s]">
              <button
                type="button"
                autoFocus
                onClick={onStartOnboarding}
                className="h-12 px-7 rounded-xl bg-primary text-primary-foreground font-extrabold flex items-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                Começar onboarding <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onExplore}
                className="h-12 px-5 rounded-xl border border-border text-muted-foreground hover:text-foreground font-semibold cursor-pointer transition-colors"
              >
                Explorar sozinho
              </button>
            </div>
          </div>
        )}

        {done && !isNewUser && (
          <div className="mt-4 flex flex-col items-center gap-5">
            <p className="m-0 text-xl font-bold animate-splash-rise">Bem-vindo de volta.</p>
            <div className="flex flex-wrap justify-center gap-3 animate-splash-rise [animation-delay:0.1s]">
              <button
                type="button"
                autoFocus
                onClick={onEnter}
                className="h-12 px-8 rounded-xl bg-primary text-primary-foreground font-extrabold flex items-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                Entrar <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onWhatsNew}
                className="h-12 px-5 rounded-xl border border-border text-muted-foreground hover:text-foreground font-semibold cursor-pointer transition-colors"
              >
                Ver novidades
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="absolute inset-x-6 sm:inset-x-10 bottom-6 flex items-center justify-between font-mono text-xs text-muted-foreground">
        <span>{appVersion ? `v${appVersion} · ` : ''}ecossistema WinThor</span>
        {!done && (
          <button
            type="button"
            onClick={skip}
            className="min-h-[36px] px-4 rounded-lg border border-border/70 hover:text-foreground cursor-pointer transition-colors"
          >
            Pular abertura
          </button>
        )}
      </div>
    </Modal>
  );
};
