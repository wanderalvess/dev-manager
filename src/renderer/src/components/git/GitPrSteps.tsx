import React from 'react';
import { Check } from 'lucide-react';
import type { PrStep, PrStepState } from '../../utils/gitPublishViewUtils';

const STEP_STYLES: Record<PrStepState, { box: string; badge: string; hint: string }> = {
  done: {
    box: 'border-success/40 bg-success/10',
    badge: 'bg-success text-primary-foreground',
    hint: 'text-muted-foreground'
  },
  current: {
    box: 'border-warning/60 bg-warning/10',
    badge: 'bg-warning text-foreground',
    hint: 'text-foreground'
  },
  pending: {
    box: 'border-border bg-muted/30',
    badge: 'bg-card border border-border text-muted-foreground',
    hint: 'text-muted-foreground'
  },
  blocked: {
    box: 'border-danger/40 bg-danger/10',
    badge: 'bg-danger text-primary-foreground',
    hint: 'text-danger'
  }
};

/** Os três passos até o PR: o usuário vê de relance o que falta (publicar) em vez de descobrir pelo erro do provedor. */
export const GitPrSteps: React.FC<{ steps: PrStep[] }> = ({ steps }) => (
  <ol className="flex flex-wrap gap-2.5" aria-label="Etapas do Pull Request">
    {steps.map((step, index) => {
      const style = STEP_STYLES[step.state];
      return (
        <li
          key={step.id}
          aria-current={step.state === 'current' ? 'step' : undefined}
          className={`flex-1 basis-44 min-w-0 flex items-center gap-2.5 rounded-lg border px-3 py-2 ${style.box}`}
        >
          <span
            className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-2xs font-extrabold ${style.badge}`}
            aria-hidden="true"
          >
            {step.state === 'done' ? <Check className="w-3.5 h-3.5" /> : index + 1}
          </span>
          <span className="min-w-0">
            <strong className="block text-xs text-foreground">{step.label}</strong>
            <span className={`block text-2xs truncate ${style.hint}`} title={step.hint}>
              {step.hint}
            </span>
          </span>
        </li>
      );
    })}
  </ol>
);
