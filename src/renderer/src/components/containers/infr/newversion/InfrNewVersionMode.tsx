import React from 'react';
import { Check } from 'lucide-react';
import type { InfrNewVersionState } from '../../../../hooks/containers/useInfrNewVersion';
import { InfrStepTitle } from './InfrNewVersionOrigin';
import { radioProps } from './radioProps';

const MODES: { clone: boolean; label: string; hint: string }[] = [
  { clone: false, label: 'Atualizar para uma versão', hint: 'Sobe as features pelo catálogo da 801 e monta a imagem da versão. Leva uns 30 minutos.' },
  { clone: true, label: 'Só clonar, sem mudar nada', hint: 'Mesma versão e mesma imagem da origem, sem build. Leva poucos minutos.' }
];

/** Passo 2: o que fazer com a origem, atualizar para outra versão ou clonar como ela está. */
export const InfrNewVersionMode: React.FC<{ s: InfrNewVersionState }> = ({ s }) => (
  <section aria-labelledby="nv-passo-modo" className="space-y-2.5">
    <InfrStepTitle n={2} id="nv-passo-modo">
      O que fazer com ele
    </InfrStepTitle>
    <div role="radiogroup" aria-labelledby="nv-passo-modo" className="grid gap-3 grid-cols-1 sm:grid-cols-2">
      {MODES.map((m, i) => {
        const on = m.clone === s.clone;
        return (
          <button
            key={m.label}
            type="button"
            {...radioProps({ index: i, count: MODES.length, checked: on, anyChecked: true, pickAt: (n) => s.update('clone', MODES[n].clone ? '1' : '') })}
            onClick={() => !on && s.update('clone', m.clone ? '1' : '')}
            className={`relative text-left rounded-xl bg-card px-4 py-3.5 cursor-pointer transition focus:outline-hidden focus-visible:ring-2 focus-visible:ring-warning/60 ${on ? 'border-2 border-foreground' : 'border border-border/80 hover:border-foreground/40'}`}
          >
            <span className="block text-sm font-semibold text-foreground pr-6">{m.label}</span>
            <span className="mt-1 block text-xs text-muted-foreground leading-relaxed">{m.hint}</span>
            {on && (
              <span aria-hidden="true" className="absolute top-3 right-3 w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center">
                <Check className="w-3 h-3" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  </section>
);
