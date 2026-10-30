import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { AppLogo } from '../AppLogo';
import { Modal } from '../ui/Modal';
import { SPLASH_BOOT_ITEMS } from './onboardingContent';
import { countdownSeconds, getSplashTiming, RETURNING_AUTO_CLOSE_MS } from './splashTiming';
import { SplashBootPanel, SplashNewsPanel, SplashStepsPanel } from './splash/SplashPanels';
import { extractVersionHighlights } from '../../utils/changelogUtils';
import changelogRaw from '../../../../../CHANGELOG.md?raw';

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

const COUNTDOWN_TICK_MS = 100;
const RING_LENGTH = 2 * Math.PI * 15;

const PRIMARY_BUTTON =
  'h-14 rounded-2xl bg-primary text-primary-foreground text-base font-extrabold flex items-center gap-3 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg';
const SECONDARY_BUTTON =
  'h-14 px-6 rounded-2xl border border-border text-muted-foreground hover:text-foreground font-semibold cursor-pointer transition-colors';

export const SplashScreen: React.FC<SplashScreenProps> = ({
  isOpen,
  isNewUser,
  appVersion,
  onStartOnboarding,
  onExplore,
  onEnter,
  onWhatsNew
}) => {
  const [completed, setCompleted] = useState(0);
  const [done, setDone] = useState(false);
  const [remainingMs, setRemainingMs] = useState(RETURNING_AUTO_CLOSE_MS);
  const [paused, setPaused] = useState(false);
  const enterRef = useRef<HTMLButtonElement>(null);
  const news = useMemo(() => extractVersionHighlights(changelogRaw, appVersion), [appVersion]);

  useEffect(() => {
    if (!isOpen) return;
    setCompleted(0);
    setDone(false);
    setRemainingMs(RETURNING_AUTO_CLOSE_MS);
    setPaused(false);
    if (prefersReducedMotion()) {
      setCompleted(SPLASH_BOOT_ITEMS.length);
      setDone(true);
      return;
    }
    const { bootStartMs, lineMs } = getSplashTiming(isNewUser);
    const timers = SPLASH_BOOT_ITEMS.map((_, i) => setTimeout(() => setCompleted(i + 1), bootStartMs + (i + 1) * lineMs));
    timers.push(setTimeout(() => setDone(true), bootStartMs + SPLASH_BOOT_ITEMS.length * lineMs));
    return () => timers.forEach(clearTimeout);
    // isNewUser só muda quando a abertura já fechou; reiniciar o boot no meio dela seria pior que ignorar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Quem já usa o app entra sozinho ao fim da contagem, a menos que tenha pedido para ficar.
  useEffect(() => {
    if (!isOpen || !done || isNewUser || paused) return;
    const t = setInterval(() => setRemainingMs((ms) => ms - COUNTDOWN_TICK_MS), COUNTDOWN_TICK_MS);
    return () => clearInterval(t);
  }, [isOpen, done, isNewUser, paused]);

  useEffect(() => {
    if (isOpen && done && !isNewUser && !paused && remainingMs <= 0) onEnter();
  }, [isOpen, done, isNewUser, paused, remainingMs, onEnter]);

  const skip = () => {
    setCompleted(SPLASH_BOOT_ITEMS.length);
    setDone(true);
  };

  const showNews = done && !isNewUser && news !== null && news.items.length > 0;
  let letterIndex = 0;

  let hint = 'Esc para pular a abertura';
  if (done) hint = isNewUser ? 'Enter para começar · Esc para explorar sozinho' : 'Enter para entrar';

  return (
    <Modal
      open={isOpen}
      onClose={done ? (isNewUser ? onExplore : onEnter) : skip}
      bare
      closeOnBackdrop={false}
      zIndexClass="z-10003"
      ariaLabel="Abertura do Hub Manager"
      panelClassName="fixed inset-0 bg-background text-foreground overflow-hidden select-none flex flex-col"
    >
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 w-full h-full" fill="none">
        <line x1="0" y1="20%" x2="100%" y2="20%" className="stroke-border" />
        <line x1="0" y1="80%" x2="100%" y2="80%" className="stroke-border" />
        <line x1="6.5%" y1="0" x2="6.5%" y2="100%" className="stroke-border" />
        <line x1="93.5%" y1="0" x2="93.5%" y2="100%" className="stroke-border" />
      </svg>
      <svg
        aria-hidden="true"
        viewBox="0 0 660 660"
        fill="none"
        className="pointer-events-none absolute left-[30%] top-1/2 w-[660px] h-[660px] -ml-[330px] -mt-[330px] animate-splash-orbit"
      >
        <circle cx="330" cy="330" r="328" className="stroke-border" strokeDasharray="2 10" />
        <circle cx="658" cy="330" r="4" className="fill-primary" />
      </svg>

      <header className="relative h-16 shrink-0 px-6 sm:px-16 lg:px-24 flex items-center justify-between font-mono text-xs text-muted-foreground">
        <span>HUB MANAGER{appVersion ? ` · v${appVersion}` : ''}</span>
        <span>ecossistema WinThor</span>
      </header>

      <main className="relative flex-1 min-h-0 overflow-y-auto px-6 sm:px-16 lg:px-24 py-6 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-24 items-center">
        <section className="flex flex-col items-start gap-7">
          <div className="animate-splash-logo">
            <AppLogo size="xl" />
          </div>

          {!done && (
            <h1 aria-label="Hub Manager" className="m-0 flex flex-col text-6xl sm:text-8xl font-extrabold tracking-tighter leading-[0.95]">
              {TITLE_WORDS.map(({ word, accent }) => (
                <span key={word} aria-hidden="true" className={accent ? 'text-primary' : undefined}>
                  {word.split('').map((ch, i) => {
                    const delay = 0.3 + letterIndex++ * 0.05;
                    return (
                      <span key={i} className="inline-block animate-splash-letter" style={{ animationDelay: `${delay}s` }}>
                        {ch}
                      </span>
                    );
                  })}
                </span>
              ))}
            </h1>
          )}
          {done && (
            <h1 className="m-0 text-5xl sm:text-7xl font-extrabold tracking-tighter leading-none animate-splash-rise">
              {isNewUser ? 'Primeira vez por aqui?' : 'Bem-vindo de volta.'}
            </h1>
          )}

          <p className="m-0 max-w-lg text-lg sm:text-xl leading-relaxed text-muted-foreground">
            {!done && 'O cockpit do seu dia: ambiente, Karaf, banco, deploy e qualidade num lugar só.'}
            {done &&
              isNewUser &&
              'A gente detecta seus caminhos, liga só os módulos que você usa e deixa o cockpit pronto. Dá para mudar tudo depois em Configurações.'}
            {done && !isNewUser && (paused ? 'Tudo carregado. Entre quando quiser.' : 'Tudo carregado. Entrando no cockpit em instantes.')}
          </p>

          {done && isNewUser && (
            <div className="flex flex-wrap gap-3 animate-splash-rise">
              <button type="button" autoFocus onClick={onStartOnboarding} className={`${PRIMARY_BUTTON} px-7`}>
                Configurar meu cockpit <ArrowRight className="w-4 h-4" />
              </button>
              <button type="button" onClick={onExplore} className={SECONDARY_BUTTON}>
                Explorar sozinho
              </button>
            </div>
          )}

          {done && !isNewUser && (
            <div className="flex flex-wrap gap-3 animate-splash-rise">
              <button ref={enterRef} type="button" autoFocus onClick={onEnter} className={`${PRIMARY_BUTTON} ${paused ? 'px-8' : 'pl-7 pr-3'}`}>
                {paused ? 'Entrar' : 'Entrar agora'}
                {paused ? (
                  <ArrowRight className="w-4 h-4" />
                ) : (
                  <span className="relative w-9 h-9 flex items-center justify-center font-mono text-sm" aria-hidden="true">
                    <svg viewBox="0 0 36 36" fill="none" className="absolute inset-0 -rotate-90">
                      <circle cx="18" cy="18" r="15" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
                      <circle
                        cx="18"
                        cy="18"
                        r="15"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={RING_LENGTH}
                        strokeDashoffset={RING_LENGTH * (1 - Math.max(0, remainingMs) / RETURNING_AUTO_CLOSE_MS)}
                      />
                    </svg>
                    {countdownSeconds(remainingMs)}
                  </span>
                )}
              </button>
              {!paused && (
                <button
                  type="button"
                  onClick={() => {
                    setPaused(true);
                    enterRef.current?.focus();
                  }}
                  className={SECONDARY_BUTTON}
                >
                  Ficar nesta tela
                </button>
              )}
            </div>
          )}
        </section>

        {done && isNewUser && <SplashStepsPanel />}
        {showNews && news && <SplashNewsPanel version={news.version} items={news.items} onWhatsNew={onWhatsNew} />}
        {(!done || (!isNewUser && !showNews)) && <SplashBootPanel completed={completed} />}
      </main>

      <footer className="relative h-20 shrink-0 px-6 sm:px-16 lg:px-24 flex items-center justify-between gap-4 font-mono text-xs text-muted-foreground">
        <span>{hint}</span>
        {!done && (
          <button
            type="button"
            onClick={skip}
            className="min-h-11 px-5 rounded-xl border border-border hover:text-foreground cursor-pointer transition-colors"
          >
            Pular abertura
          </button>
        )}
      </footer>
    </Modal>
  );
};
