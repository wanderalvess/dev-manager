import React from 'react';
import { Check } from 'lucide-react';
import { AppLogo } from '../../AppLogo';
import { ONBOARDING_STEPS } from '../onboardingContent';

interface OnboardingSidebarProps {
  stepIndex: number;
  onGoTo: (i: number) => void;
  onFinishLater: () => void;
}

/** Coluna do onboarding: as etapas (concluídas com ✓), o progresso e a saída "Terminar depois". */
export const OnboardingSidebar: React.FC<OnboardingSidebarProps> = ({ stepIndex, onGoTo, onFinishLater }) => {
  const pct = Math.round((stepIndex / (ONBOARDING_STEPS.length - 1)) * 100);
  return (
    <aside className="hidden md:flex w-72 shrink-0 flex-col gap-9 border-r border-border bg-card px-6 py-8">
      <div className="flex items-center gap-3">
        <AppLogo size="md" />
        <div className="flex flex-col">
          <span className="font-extrabold">Hub Manager</span>
          <span className="font-mono text-xs text-muted-foreground">configuração inicial</span>
        </div>
      </div>

      <nav aria-label="Etapas do onboarding">
        <ol className="m-0 p-0 list-none flex flex-col gap-1">
          {ONBOARDING_STEPS.map((s, i) => {
            const active = i === stepIndex;
            const done = i < stepIndex;
            let bullet = 'border border-border text-muted-foreground';
            if (active) bullet = 'bg-primary text-primary-foreground';
            else if (done) bullet = 'border border-primary text-primary';
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onGoTo(i)}
                  aria-current={active ? 'step' : undefined}
                  className={`w-full min-h-14 px-3 rounded-xl flex items-center gap-3.5 text-left cursor-pointer transition-colors ${
                    active ? 'bg-muted text-foreground' : done ? 'text-foreground hover:bg-muted/60' : 'text-muted-foreground hover:bg-muted/60'
                  }`}
                >
                  <span className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center font-mono text-xs font-bold ${bullet}`}>
                    {done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : i + 1}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-bold">{s.label}</span>
                    <span className="text-xs text-muted-foreground">{s.hint}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="mt-auto flex flex-col gap-2.5">
        <div className="flex justify-between font-mono text-xs text-muted-foreground">
          <span>progresso</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-border overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
        {stepIndex < ONBOARDING_STEPS.length - 1 && (
          <button
            type="button"
            onClick={onFinishLater}
            className="mt-2 min-h-11 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Terminar depois
          </button>
        )}
      </div>
    </aside>
  );
};
