import React from 'react';
import { Check } from 'lucide-react';
import { ONBOARDING_STEPS, SPLASH_BOOT_ITEMS, bootItemState } from '../onboardingContent';

// Cartão da direita da abertura: o que está carregando ou as etapas do onboarding (a tela de início fica em SplashStartPanel).

const PANEL =
  'relative w-full max-w-xl justify-self-center lg:justify-self-end rounded-3xl border border-border bg-card/90 backdrop-blur p-6 sm:p-8 flex flex-col gap-6 shadow-xl shadow-foreground/5 overflow-hidden';
const EYEBROW = 'font-mono text-xs font-bold tracking-[0.14em] text-muted-foreground';

const Spinner: React.FC = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" className="w-5 h-5 shrink-0 animate-spin">
    <circle cx="12" cy="12" r="10" className="stroke-border" />
    <path d="M12 2a10 10 0 0 1 10 10" className="stroke-primary" />
  </svg>
);

export const SplashBootPanel: React.FC<{ completed: number }> = ({ completed }) => {
  const total = SPLASH_BOOT_ITEMS.length;
  const progress = Math.round((completed / total) * 100);
  return (
    <section aria-label="Progresso da abertura" className={`${PANEL} animate-splash-rise`} style={{ animationDelay: '0.5s' }}>
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className={EYEBROW}>INICIANDO O HUB</span>
          <span className="font-mono text-xs text-muted-foreground">
            {completed} de {total} áreas prontas
          </span>
        </div>
        <span className="font-mono text-5xl font-bold tabular-nums leading-none tracking-tight" aria-live="polite">
          {progress}
          <span className="text-2xl text-muted-foreground">%</span>
        </span>
      </div>

      {/* Um segmento por área: enche quando ela fica pronta e pulsa enquanto carrega */}
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }} aria-hidden="true">
        {SPLASH_BOOT_ITEMS.map((name, i) => {
          const state = bootItemState(i, completed);
          return (
            <span
              key={name}
              className={`h-1.5 rounded-full transition-colors duration-300 ${
                state === 'done' ? 'bg-primary' : state === 'loading' ? 'bg-primary/40 animate-pulse' : 'bg-border'
              }`}
            />
          );
        })}
      </div>

      <ul className="m-0 p-0 list-none flex flex-col gap-0.5">
        {SPLASH_BOOT_ITEMS.map((name, i) => {
          const state = bootItemState(i, completed);
          return (
            <li
              key={name}
              className={`min-h-12 px-3 rounded-xl flex items-center gap-4 transition-colors duration-300 ${state === 'loading' ? 'bg-primary/10' : ''}`}
            >
              <span
                className={`w-6 font-mono text-xs tabular-nums ${state === 'queued' ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className={`flex-1 font-semibold transition-colors ${state === 'queued' ? 'text-muted-foreground/70' : ''}`}>
                {name}
              </span>
              {state === 'done' && (
                <span className="flex items-center gap-1.5 font-mono text-xs text-success">
                  <Check className="w-3.5 h-3.5" strokeWidth={3} /> pronto
                </span>
              )}
              {state === 'loading' && <Spinner />}
              {state === 'queued' && <span className="font-mono text-xs text-muted-foreground/60">na fila</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export const SplashStepsPanel: React.FC = () => (
  <section aria-label="O que vem na configuração" className={`${PANEL} animate-splash-rise`}>
    <div className="flex items-center justify-between gap-4">
      <span className={EYEBROW}>CONFIGURAÇÃO EM {ONBOARDING_STEPS.length} ETAPAS</span>
      <span className="flex items-center gap-2 font-mono text-xs text-success">
        <span className="w-2 h-2 rounded-full bg-success animate-live-dot" aria-hidden="true" /> tudo carregado
      </span>
    </div>
    {/* Linha do tempo: o fio liga as etapas, a primeira já vem acesa */}
    <ol className="relative m-0 p-0 list-none flex flex-col">
      <span aria-hidden="true" className="absolute left-[1.15rem] top-5 bottom-5 w-px bg-border" />
      {ONBOARDING_STEPS.map((s, i) => (
        <li
          key={s.id}
          className="relative min-h-13 px-1 flex items-center gap-4 animate-splash-rise"
          style={{ animationDelay: `${0.15 + i * 0.06}s` }}
        >
          <span
            className={`relative w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
              i === 0
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30'
                : 'border border-border bg-card text-muted-foreground'
            }`}
          >
            {String(i + 1).padStart(2, '0')}
          </span>
          <span className="flex flex-col">
            <span className="font-bold">{s.label}</span>
            <span className="text-sm text-muted-foreground">{s.hint}</span>
          </span>
        </li>
      ))}
    </ol>
  </section>
);
