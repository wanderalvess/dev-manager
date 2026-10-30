import React from 'react';
import { ArrowRight, Check } from 'lucide-react';
import type { ChangelogHighlight } from '../../../utils/changelogUtils';
import { ONBOARDING_STEPS, SPLASH_BOOT_ITEMS, bootItemState } from '../onboardingContent';

// Cartão da direita da abertura: o que está carregando, as etapas do onboarding ou as novidades da versão.

const PANEL = 'w-full max-w-xl justify-self-center lg:justify-self-end rounded-3xl border border-border bg-card p-6 sm:p-8 flex flex-col gap-5';
const EYEBROW = 'font-mono text-xs font-bold tracking-[0.14em] text-muted-foreground';

const Spinner: React.FC = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" className="w-5 h-5 shrink-0 animate-spin">
    <circle cx="12" cy="12" r="10" className="stroke-border" />
    <path d="M12 2a10 10 0 0 1 10 10" className="stroke-primary" />
  </svg>
);

export const SplashBootPanel: React.FC<{ completed: number }> = ({ completed }) => {
  const progress = Math.round((completed / SPLASH_BOOT_ITEMS.length) * 100);
  return (
    <section aria-label="Progresso da abertura" className={PANEL}>
      <div className="flex items-baseline justify-between">
        <span className={EYEBROW}>INICIANDO O COCKPIT</span>
        <span className="font-mono text-2xl font-bold" aria-live="polite">
          {progress}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} />
      </div>
      <ul className="m-0 p-0 list-none flex flex-col gap-1">
        {SPLASH_BOOT_ITEMS.map((name, i) => {
          const state = bootItemState(i, completed);
          return (
            <li key={name} className={`min-h-12 px-4 rounded-xl flex items-center gap-4 ${state === 'loading' ? 'bg-muted' : ''}`}>
              {state === 'done' && (
                <span className="w-5 h-5 shrink-0 rounded-full bg-success/15 text-success flex items-center justify-center">
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                </span>
              )}
              {state === 'loading' && <Spinner />}
              {state === 'queued' && <span aria-hidden="true" className="w-5 h-5 shrink-0 rounded-full border-2 border-dashed border-border" />}
              <span className={`flex-1 font-semibold ${state === 'queued' ? 'text-muted-foreground' : ''}`}>{name}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {state === 'done' ? 'pronto' : state === 'loading' ? 'carregando' : 'na fila'}
              </span>
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
        <Check className="w-3.5 h-3.5" strokeWidth={3} /> cockpit carregado
      </span>
    </div>
    <ol className="m-0 p-0 list-none flex flex-col gap-0.5">
      {ONBOARDING_STEPS.map((s, i) => (
        <li key={s.id} className="min-h-12 px-3 flex items-center gap-4">
          <span className="w-8 h-8 shrink-0 rounded-full border border-border flex items-center justify-center font-mono text-xs font-bold">
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

export const SplashNewsPanel: React.FC<{ version: string; items: ChangelogHighlight[]; onWhatsNew: () => void }> = ({
  version,
  items,
  onWhatsNew
}) => (
  <section aria-label="Novidades desta versão" className={`${PANEL} animate-splash-rise`}>
    <span className={EYEBROW}>NOVIDADES · v{version}</span>
    {items.map((item) => (
      <article key={item.title} className="rounded-2xl bg-muted/60 p-5 flex flex-col gap-2">
        {item.section && (
          <span className={`font-mono text-xs font-bold uppercase ${item.section === 'Corrigido' ? 'text-info' : 'text-success'}`}>
            {item.section}
          </span>
        )}
        <h2 className="m-0 text-lg font-bold">{item.title}</h2>
        {item.summary && <p className="m-0 text-sm leading-relaxed text-muted-foreground">{item.summary}</p>}
      </article>
    ))}
    <button
      type="button"
      onClick={onWhatsNew}
      className="self-start min-h-11 flex items-center gap-2 font-bold text-primary cursor-pointer hover:underline"
    >
      Ver todas as novidades <ArrowRight className="w-4 h-4" />
    </button>
  </section>
);
