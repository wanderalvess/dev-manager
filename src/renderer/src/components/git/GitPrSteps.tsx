import React from 'react';
import { Check } from 'lucide-react';
import type { PrStep, PrStepState } from '../../utils/gitPublishViewUtils';

const STEP_STYLES: Record<PrStepState, { badge: string; label: string; hint: string }> = {
  done: { badge: 'bg-success/15 text-success', label: 'text-foreground', hint: 'text-muted-foreground' },
  current: { badge: 'bg-primary/15 text-primary ring-1 ring-primary/40', label: 'text-foreground', hint: 'text-primary' },
  pending: { badge: 'border border-border text-muted-foreground', label: 'text-muted-foreground', hint: 'text-muted-foreground' },
  blocked: { badge: 'bg-danger/15 text-danger', label: 'text-foreground', hint: 'text-danger' }
};

/** Os três passos até o PR: o usuário vê de relance o que falta (publicar) em vez de descobrir pelo erro do provedor. */
export const GitPrSteps: React.FC<{ steps: PrStep[] }> = ({ steps }) => (
  <ol className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2" aria-label="Etapas do Pull Request">
    {steps.map((step, index) => {
      const style = STEP_STYLES[step.state];
      return (
        <li
          key={step.id}
          aria-current={step.state === 'current' ? 'step' : undefined}
          className="flex items-start gap-2 min-w-0"
        >
          <span
            className={`w-5 h-5 mt-px rounded-full shrink-0 flex items-center justify-center text-2xs font-semibold tabular-nums ${style.badge}`}
            aria-hidden="true"
          >
            {step.state === 'done' ? <Check className="w-3 h-3" /> : index + 1}
          </span>
          <span className="min-w-0">
            <span className={`block text-[13px] font-medium ${style.label}`}>{step.label}</span>
            <span className={`block text-xs truncate ${style.hint}`} title={step.hint}>
              {step.hint}
            </span>
          </span>
        </li>
      );
    })}
  </ol>
);
