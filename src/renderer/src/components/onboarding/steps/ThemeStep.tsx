import React from 'react';
import { Check } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { ONBOARDING_THEMES } from '../onboardingContent';
import { Eyebrow, StepLead, StepTitle } from './stepUi';
import { selectableRow } from './stepStyles';

const modeButton = (active: boolean): string =>
  `flex-1 min-h-10 rounded-lg text-sm cursor-pointer transition-colors ${active ? 'bg-muted text-foreground font-bold' : 'text-muted-foreground font-semibold hover:text-foreground'}`;

/** Prévia do cockpit nas cores do tema ativo: o tema é aplicado ao vivo, então ela usa as variáveis do app. */
const ThemePreview: React.FC = () => (
  <figure aria-label="Prévia do tema" className="m-0 flex-1 min-w-0 min-h-80 rounded-2xl border border-border bg-background overflow-hidden flex">
    <div className="w-36 shrink-0 bg-card p-4 flex flex-col gap-2.5">
      <span className="w-7 h-7 rounded-lg bg-primary" />
      <span className="h-2 mt-3 w-4/5 rounded bg-primary" />
      {['w-2/3', 'w-3/4', 'w-1/2', 'w-2/3'].map((w, i) => (
        <span key={i} className={`h-2 ${w} rounded bg-muted`} />
      ))}
    </div>
    <div className="flex-1 min-w-0 p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-lg font-extrabold">Ambiente Dev</span>
        <span className="h-8 px-3.5 rounded-lg bg-primary text-primary-foreground text-sm font-extrabold flex items-center">Rodar esteira</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[true, false, false].map((accent, i) => (
          <div key={i} className="h-20 rounded-xl bg-card p-3.5 flex flex-col justify-between">
            <span className="h-2 w-1/2 rounded bg-muted-foreground/40" />
            <span className={`h-4 w-2/5 rounded ${accent ? 'bg-primary' : 'bg-foreground/80'}`} />
          </div>
        ))}
      </div>
      <div className="flex-1 rounded-xl bg-card p-4 flex flex-col gap-3">
        <span className="h-2 w-1/3 rounded bg-muted-foreground/40" />
        {['w-11/12', 'w-4/5', 'w-5/6', 'w-3/5'].map((w, i) => (
          <span key={i} className={`h-2 ${w} rounded bg-muted`} />
        ))}
      </div>
    </div>
  </figure>
);

/** Etapa 3: modo e variante do tema, aplicados ao vivo, com a prévia ao lado. */
export const ThemeStep: React.FC = () => {
  const { mode, setMode, variant, setVariant } = useTheme();
  return (
    <>
      <Eyebrow n={3}>TEMA</Eyebrow>
      <StepTitle>Deixe o cockpit com a sua cara.</StepTitle>
      <StepLead>Clique num tema para ver ao vivo. Dá para trocar depois pelo cabeçalho.</StepLead>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-80 shrink-0 flex flex-col gap-4">
          <div role="radiogroup" aria-label="Modo" className="flex p-1 rounded-xl border border-border bg-card">
            <button type="button" role="radio" aria-checked={mode === 'dark'} onClick={() => setMode('dark')} className={modeButton(mode === 'dark')}>
              Escuro
            </button>
            <button type="button" role="radio" aria-checked={mode === 'light'} onClick={() => setMode('light')} className={modeButton(mode === 'light')}>
              Claro
            </button>
          </div>
          <div role="radiogroup" aria-label="Tema" className="flex flex-col gap-1.5">
            {ONBOARDING_THEMES.map((t) => {
              const on = t.id === variant;
              return (
                <button key={t.id} type="button" role="radio" aria-checked={on} onClick={() => setVariant(t.id)} className={selectableRow(on)}>
                  <span className="w-9 h-9 shrink-0 rounded-lg border border-border flex items-center justify-center" style={{ background: t.bg }}>
                    <span className="w-3.5 h-3.5 rounded-full" style={{ background: t.accent }} />
                  </span>
                  <span className="flex-1 font-bold">{t.label}</span>
                  {on && <Check className="w-4 h-4 text-primary" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </div>
        <ThemePreview />
      </div>
    </>
  );
};
