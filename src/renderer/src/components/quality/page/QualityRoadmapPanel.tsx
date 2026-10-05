import React from 'react';
import { Compass } from 'lucide-react';
import { ROADMAP_PLANNED_ITEMS } from '../../../utils/qualityPageUtils';

export const QualityRoadmapPanel: React.FC = () => (
  <div className="space-y-4">
    <div className="p-4 rounded-md bg-muted/40 border border-border flex items-start gap-3">
      <Compass className="w-5 h-5 text-primary shrink-0 mt-0.5" />
      <div>
        <h4 className="text-xs sm:text-sm font-semibold text-foreground">
          Evolução do Módulo de Qualidade para QA e Product Owners
        </h4>
        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
          Lista fixa do que já está disponível no módulo e do que ainda não foi implementado.
          Ainda não há cadastro de demandas nesta tela.
        </p>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {ROADMAP_PLANNED_ITEMS.map((item) => (
        <div
          key={item.id}
          className="p-4 rounded-md bg-card border border-border space-y-3 flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-mono font-semibold px-2 py-0.5 rounded bg-muted border border-border text-foreground">
                {item.tag}
              </span>
              <span
                className={`text-2xs font-mono font-semibold px-2 py-0.5 rounded ${
                  item.status === 'ready'
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : item.status === 'in_progress'
                      ? 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {item.status === 'ready' ? 'Disponível' : item.status === 'in_progress' ? 'Em Construção' : 'Ainda não implementado'}
              </span>
            </div>

            <h4 className="text-xs font-semibold text-foreground">{item.title}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Foco: <strong className="text-foreground">{item.targetRole}</strong></span>
          </div>
        </div>
      ))}
    </div>
  </div>
);
