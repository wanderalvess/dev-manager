import React from 'react';
import type { InfrNewVersionState } from '../../../../hooks/containers/useInfrNewVersion';

const MODES: { clone: boolean; label: string; hint: string }[] = [
  { clone: false, label: 'Atualizar para uma versão', hint: 'Sobe as features pelo catálogo da 801 e monta a imagem da versão (build de uns 30 minutos).' },
  { clone: true, label: 'Só clonar, sem mudar nada', hint: 'Cópia do ambiente na mesma versão, com a imagem que já existe: sem build e sem mexer nas features.' }
];

/** Escolha entre atualizar para outra versão e clonar o ambiente como ele está. */
export const InfrNewVersionMode: React.FC<{ s: InfrNewVersionState }> = ({ s }) => {
  const current = MODES.find((m) => m.clone === s.clone) ?? MODES[0];
  return (
    <div className="space-y-1.5">
      <div role="radiogroup" aria-label="O que fazer com a origem" className="inline-flex rounded-xl border border-border/80 bg-muted/30 p-1 gap-1">
        {MODES.map((m) => {
          const active = m.clone === s.clone;
          return (
            <button
              key={m.label}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => !active && s.update('clone', m.clone ? '1' : '')}
              className={`px-3.5 h-8 rounded-lg text-xs font-semibold cursor-pointer transition ${active ? 'bg-card text-foreground shadow-xs ring-1 ring-warning/50' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {m.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">{current.hint}</p>
    </div>
  );
};
