import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { AppLogo } from '../AppLogo';
import { Modal } from '../ui/Modal';
import { SPLASH_BOOT_ITEMS } from './onboardingContent';
import { getSplashTiming } from './splashTiming';
import { SplashBootPanel, SplashStepsPanel } from './splash/SplashPanels';
import { StartHome } from './splash/StartHome';
import { useStartScreenData } from './splash/useStartScreenData';
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
  /** Cartão da tela de início que leva direto a um módulo */
  onOpenTab: (tab: string) => void;
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

const PRIMARY_BUTTON =
  'h-14 rounded-2xl bg-primary text-primary-foreground text-base font-extrabold flex items-center gap-3 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg';
const SECONDARY_BUTTON =
  'h-14 px-6 rounded-2xl border border-border text-muted-foreground hover:text-foreground font-semibold cursor-pointer transition-colors';
const PAGE_X = 'px-5 sm:px-10 lg:px-16 xl:px-20';

export const SplashScreen: React.FC<SplashScreenProps> = ({
  isOpen,
  isNewUser,
  appVersion,
  onStartOnboarding,
  onExplore,
  onEnter,
  onOpenTab,
  onWhatsNew
}) => {
  const [completed, setCompleted] = useState(0);
  const [done, setDone] = useState(false);
  const news = useMemo(() => extractVersionHighlights(changelogRaw, appVersion), [appVersion]);
  const start = useStartScreenData(isOpen && !isNewUser);

  useEffect(() => {
    if (!isOpen) return;
    setCompleted(0);
    setDone(false);
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

  const skip = () => {
    setCompleted(SPLASH_BOOT_ITEMS.length);
    setDone(true);
  };

  // Quem já usa o app fica na tela de início até entrar (clique em Entrar ou Enter); nada fecha sozinho
  const home = done && !isNewUser;
  const showNews = home && news !== null && news.items.length > 0;
  let letterIndex = 0;

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
      {/* As linhas e a órbita são da abertura; na tela de início elas cruzariam os cartões */}
      {!home && (
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 w-full h-full" fill="none">
          <line x1="0" y1="20%" x2="100%" y2="20%" className="stroke-border" />
          <line x1="0" y1="80%" x2="100%" y2="80%" className="stroke-border" />
          <line x1="6.5%" y1="0" x2="6.5%" y2="100%" className="stroke-border" />
          <line x1="93.5%" y1="0" x2="93.5%" y2="100%" className="stroke-border" />
        </svg>
      )}
      {!home && (
        <svg
          aria-hidden="true"
          viewBox="0 0 660 660"
          fill="none"
          className="pointer-events-none absolute left-[30%] top-1/2 w-[660px] h-[660px] -ml-[330px] -mt-[330px] animate-splash-orbit"
        >
          <circle cx="330" cy="330" r="328" className="stroke-border" strokeDasharray="2 10" />
          <circle cx="658" cy="330" r="4" className="fill-primary" />
        </svg>
      )}

      {/* Na tela de início, uma luz da cor do tema atrás da saudação (no claro e no escuro) */}
      {home && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-48 -top-96 w-[80rem] h-[48rem] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.18)_0%,transparent_60%)]"
        />
      )}

      <header className={`relative ${home ? 'h-11 sm:h-12' : 'h-16'} shrink-0 ${PAGE_X} flex items-center font-mono text-xs text-muted-foreground`}>
        <span className="flex items-center gap-2.5">
          {home && <AppLogo size="xs" />}
          HUB MANAGER{appVersion ? ` · v${appVersion}` : ''}
        </span>
      </header>

      {home ? (
        <main className={`relative flex-1 min-h-0 overflow-y-auto flex flex-col ${PAGE_X} 2xl:px-24 pt-1 pb-4 sm:pb-6`}>
          <StartHome data={start} news={showNews ? news : null} onEnter={onEnter} onOpenTab={onOpenTab} onWhatsNew={onWhatsNew} />
        </main>
      ) : (
        <main className={`relative flex-1 min-h-0 overflow-y-auto ${PAGE_X} py-6 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-24 items-center`}>
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
            {done && <h1 className="m-0 text-5xl sm:text-7xl font-extrabold tracking-tighter leading-none animate-splash-rise">Primeira vez por aqui?</h1>}

            <p className="m-0 max-w-lg text-lg sm:text-xl leading-relaxed text-muted-foreground">
              {done
                ? 'A gente detecta seus caminhos, liga só os módulos que você usa e deixa o cockpit pronto. Dá para mudar tudo depois em Configurações.'
                : 'O cockpit do seu dia: ambiente, Karaf, banco, deploy e qualidade num lugar só.'}
            </p>

            {done && (
              <div className="flex flex-wrap gap-3 animate-splash-rise">
                <button type="button" autoFocus onClick={onStartOnboarding} className={`${PRIMARY_BUTTON} px-7`}>
                  Configurar meu cockpit <ArrowRight className="w-4 h-4" />
                </button>
                <button type="button" onClick={onExplore} className={SECONDARY_BUTTON}>
                  Explorar sozinho
                </button>
              </div>
            )}
          </section>

          {done ? <SplashStepsPanel /> : <SplashBootPanel completed={completed} />}
        </main>
      )}

      {!done && (
        <footer className={`relative h-20 shrink-0 ${PAGE_X} flex items-center justify-end font-mono text-xs text-muted-foreground`}>
          <button
            type="button"
            onClick={skip}
            className="min-h-11 px-5 rounded-xl border border-border hover:text-foreground cursor-pointer transition-colors"
          >
            Pular abertura
          </button>
        </footer>
      )}
    </Modal>
  );
};
