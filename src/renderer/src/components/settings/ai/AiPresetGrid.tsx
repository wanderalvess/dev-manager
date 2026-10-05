import React from 'react';
import { Cpu } from 'lucide-react';
import { LlmProviderConfig, DEFAULT_LLM_PROVIDER_TEMPLATES } from '../../../../../shared/types';

interface AiPresetGridProps {
  onApplyTemplate: (template: Omit<LlmProviderConfig, 'id'>) => void;
}

export const AiPresetGrid: React.FC<AiPresetGridProps> = ({ onApplyTemplate }) => (
  <div className="p-3.5 bg-muted/30 rounded-2xl border border-border/80 space-y-2.5">
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Cpu className="w-3.5 h-3.5 text-primary" />
        Presets de Conexão Rápida
      </span>
      <span className="text-[10px] text-muted-foreground">
        Clique em um preset para carregar o template no formulário
      </span>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
      {DEFAULT_LLM_PROVIDER_TEMPLATES.map((tmpl) => {
        const isLocal = tmpl.provider === 'ollama';
        return (
          <button
            key={tmpl.name}
            type="button"
            onClick={() => onApplyTemplate(tmpl)}
            className="p-2.5 rounded-xl bg-card hover:bg-muted/80 border border-border hover:border-primary/50 text-left transition-all flex flex-col justify-between group shadow-2xs cursor-pointer"
            title={`Configurar ${tmpl.name} (${tmpl.model})`}
          >
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                {tmpl.name}
              </span>
            </div>
            <div className="flex items-center justify-between gap-1 text-[10px] font-mono text-muted-foreground">
              <span className="truncate">{tmpl.model}</span>
              {isLocal && (
                <span className="px-1 py-0.2 rounded bg-cyan-500/10 text-cyan-500 text-[9px] font-bold border border-cyan-500/20">
                  LOCAL
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  </div>
);
