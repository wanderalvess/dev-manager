import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Settings2, SkipForward, Wand2 } from 'lucide-react';
import { AppLogo } from '../AppLogo';
import { Modal } from '../ui/Modal';
import { SPLASH_BOOT_ITEMS } from './onboardingContent';
import { getSplashTiming } from './splashTiming';
import { SplashBootPanel, SplashStepsPanel } from './splash/SplashPanels';
import { SplashLogoAssemble } from './splash/SplashLogoAssemble';
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

// O que o primeiro acesso promete, em uma linha cada (tudo é verdade no OnboardingWizard)
const FIRST_RUN_PROMISES = [
  { icon: Wand2, text: 'Detecta os caminhos do Karaf, da IDE e dos projetos' },
  { icon: SkipForward, text: 'Qualquer etapa dá para pular' },
  { icon: Settings2, text: 'Tudo muda depois em Configurações' }
];

const PRIMARY_BUTTON =
  'h-14 rounded-2xl bg-primary text-primary-foreground text-base font-extrabold flex items-center gap-3 cursor-pointer transition-all shadow-lg shadow-primary/25 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/35';
const SECONDARY_BUTTON =
  'h-14 px-6 rounded-2xl border border-border bg-card/60 text-muted-foreground hover:text-foreground hover:border-foreground/30 font-semibold cursor-pointer transition-colors';
const PAGE_X = 'px-5 sm:px-10 lg:px-16 xl:px-20';
const KBD = 'px-1.5 py-0.5 rounded-md border border-border bg-card font-mono text-2xs text-muted-foreground';

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
  // O app só aparece depois de carregar: a abertura começa no primeiro quadro desenhado, não na montagem, senão o
  // carregamento a consome por baixo da tela preta e a pessoa cai direto na tela de início.
  const [painted, setPainted] = useState(false);
  const news = useMemo(() => extractVersionHighlights(changelogRaw, appVersion), [appVersion]);
  const start = useStartScreenData(isOpen && !isNewUser);

  useEffect(() => {
    if (!isOpen) return;
    setCompleted(0);
    setDone(false);
    setPainted(false);
    if (prefersReducedMotion()) {
      setCompleted(SPLASH_BOOT_ITEMS.length);
      setDone(true);
      setPainted(true);
      return;
    }
    const { bootStartMs, lineMs } = getSplashTiming(isNewUser);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let frame2 = 0;
    // Dois quadros: o primeiro já foi pedido, o segundo só roda depois de a tela ter sido pintada
    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => {
        setPainted(true);
        SPLASH_BOOT_ITEMS.forEach((_, i) => timers.push(setTimeout(() => setCompleted(i + 1), bootStartMs + (i + 1) * lineMs)));
        timers.push(setTimeout(() => setDone(true), bootStartMs + SPLASH_BOOT_ITEMS.length * lineMs));
      });
    });
    return () => {
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
      timers.forEach(clearTimeout);
    };
    // isNewUser só muda quando a abertura já fechou; reiniciar o boot no meio dela seria pior que ignorar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const skip = () => {
    setCompleted(SPLASH_BOOT_ITEMS.length);
    setDone(true);
    setPainted(true);
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
      {/* Fundo: pontos finos e uma luz da cor do tema (no claro e no escuro); na abertura, a órbita e uma varredura */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 splash-dot-grid animate-splash-grid" />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute transition-all duration-700 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.2)_0%,transparent_62%)] ${
          home ? '-left-48 -top-96 w-[80rem] h-[48rem]' : '-left-64 top-1/2 -translate-y-1/2 w-[70rem] h-[60rem]'
        }`}
      />
      {!done && (
        <>
          <svg
            aria-hidden="true"
            viewBox="0 0 660 660"
            fill="none"
            className="pointer-events-none absolute left-[30%] top-1/2 w-[660px] h-[660px] -ml-[330px] -mt-[330px] animate-splash-orbit"
          >
            <circle cx="330" cy="330" r="328" className="stroke-border" strokeDasharray="2 10" />
            <circle cx="330" cy="330" r="236" className="stroke-border/60" strokeDasharray="1 14" />
            <circle cx="658" cy="330" r="4" className="fill-primary" />
            <circle cx="330" cy="94" r="3" className="fill-primary/60" />
          </svg>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-transparent via-primary/[0.06] to-transparent animate-splash-scan"
          />
        </>
      )}

      {/* Na tela de início a barra da janela já diz "Hub Manager": sem cabeçalho repetido, a versão vai junto da data */}
      {painted && !home && (
        <header
          className={`relative ${home ? 'h-11 sm:h-12' : 'h-16'} shrink-0 ${PAGE_X} flex items-center justify-between font-mono text-xs text-muted-foreground`}
        >
          <span className="flex items-center gap-2.5">
            HUB MANAGER{appVersion ? ` · v${appVersion}` : ''}
          </span>
        </header>
      )}

      {!painted ? null : home ? (
        <main
          className={`relative flex-1 min-h-0 overflow-y-auto flex flex-col ${PAGE_X} 2xl:px-24 pt-4 pb-4 [@media(max-height:900px)]:pt-3 [@media(max-height:900px)]:pb-3`}
        >
          <StartHome
            data={start}
            news={showNews ? news : null}
            appVersion={appVersion}
            onEnter={onEnter}
            onOpenTab={onOpenTab}
            onWhatsNew={onWhatsNew}
          />
        </main>
      ) : (
        <main
          className={`relative flex-1 min-h-0 overflow-y-auto ${PAGE_X} py-6 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-24 items-center`}
        >
          <section className="flex flex-col items-start gap-7">
            {done ? (
              <div className="animate-splash-rise">
                <AppLogo size="xl" />
              </div>
            ) : (
              <SplashLogoAssemble />
            )}

            {!done && (
              <h1
                aria-label="Hub Manager"
                className="m-0 flex flex-col text-6xl sm:text-8xl font-extrabold tracking-tighter leading-[0.95]"
              >
                {TITLE_WORDS.map(({ word, accent }) => (
                  <span key={word} aria-hidden="true" className={accent ? 'text-primary' : undefined}>
                    {word.split('').map((ch, i) => {
                      const delay = 0.55 + letterIndex++ * 0.05;
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
              <div className="flex flex-col gap-3 animate-splash-rise">
                <span className="font-mono text-xs font-bold tracking-[0.14em] text-primary">PRIMEIRA VEZ POR AQUI?</span>
                <h1 className="m-0 text-5xl sm:text-7xl font-extrabold tracking-tighter leading-[0.95]">
                  Vamos deixar o Hub
                  <br />
                  do <span className="text-primary">seu jeito</span>.
                </h1>
              </div>
            )}

            <p
              className={`m-0 max-w-lg text-lg sm:text-xl leading-relaxed text-muted-foreground ${done ? '' : 'animate-splash-rise'}`}
              style={done ? undefined : { animationDelay: '1.1s' }}
            >
              {done
                ? 'Você liga só os módulos que usa, escolhe o visual e confere se o ambiente está pronto para trabalhar.'
                : 'Seu dia de trabalho num lugar só: ambiente, Karaf, banco, deploy e qualidade.'}
            </p>

            {done && (
              <>
                <div className="flex flex-wrap gap-3 animate-splash-rise" style={{ animationDelay: '0.1s' }}>
                  <button type="button" autoFocus onClick={onStartOnboarding} className={`${PRIMARY_BUTTON} px-7`}>
                    Configurar o Hub <ArrowRight className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={onExplore} className={SECONDARY_BUTTON}>
                    Explorar sozinho
                  </button>
                </div>
                <ul className="m-0 p-0 list-none flex flex-col gap-2 animate-splash-rise" style={{ animationDelay: '0.2s' }}>
                  {FIRST_RUN_PROMISES.map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <Icon className="w-4 h-4 text-primary shrink-0" aria-hidden="true" /> {text}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {done ? <SplashStepsPanel /> : <SplashBootPanel completed={completed} />}
        </main>
      )}

      {painted && !done && (
        <footer className={`relative h-20 shrink-0 ${PAGE_X} flex items-center justify-end font-mono text-xs text-muted-foreground`}>
          <button
            type="button"
            onClick={skip}
            className="min-h-11 px-5 rounded-xl border border-border bg-card/60 hover:text-foreground cursor-pointer transition-colors flex items-center gap-2.5"
          >
            Pular abertura <kbd className={KBD}>Esc</kbd>
          </button>
        </footer>
      )}
    </Modal>
  );
};
