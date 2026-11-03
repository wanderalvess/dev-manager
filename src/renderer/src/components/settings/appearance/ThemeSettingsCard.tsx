import React from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { ONBOARDING_THEMES } from '../../onboarding/onboardingContent';
import { SECTION_TITLE_CLASS } from '../../ui/PageHeader';
import { AppliesNowTag } from '../AppliesNowTag';

/** O mesmo seletor do botão de tema no cabeçalho e da etapa Tema do onboarding; grava na hora. */
export const ThemeSettingsCard: React.FC = () => {
  const { mode, setMode, variant, setVariant } = useTheme();
  return (
    <section id="field-theme" aria-labelledby="settings-theme" className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="settings-theme" className={SECTION_TITLE_CLASS}>
            Tema
          </h3>
          <p className="text-xs text-muted-foreground">O mesmo do botão de tema no cabeçalho e da etapa Tema da configuração inicial.</p>
        </div>
        <div className="flex items-center gap-3">
          <AppliesNowTag />
          <div role="radiogroup" aria-label="Claro ou escuro" className="inline-flex rounded-lg border border-border bg-background p-1 gap-1">
            {(['dark', 'light'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={`h-8 px-3 rounded-md text-sm font-medium cursor-pointer ${
                  mode === m ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'dark' ? 'Escuro' : 'Claro'}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div role="radiogroup" aria-label="Variante do tema" className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5">
        {ONBOARDING_THEMES.map((t) => {
          const on = variant === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setVariant(t.id)}
              className={`rounded-xl border p-2.5 text-left text-sm font-medium flex flex-col gap-2 cursor-pointer transition-colors ${
                on ? 'border-primary bg-muted text-foreground' : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              <span aria-hidden="true" className="h-10 rounded-lg flex items-end gap-1.5 p-2" style={{ background: t.bg, boxShadow: `inset 0 0 0 1px ${t.card}` }}>
                <span className="h-2 w-2/5 rounded" style={{ background: t.accent }} />
                <span className="h-2 w-1/4 rounded" style={{ background: t.card }} />
              </span>
              {t.label}
            </button>
          );
        })}
      </div>
    </section>
  );
};
