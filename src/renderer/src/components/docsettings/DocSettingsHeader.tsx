import React from 'react';
import { X, Sliders } from 'lucide-react';

interface DocSettingsHeaderProps {
  onClose: () => void;
}

export const DocSettingsHeader: React.FC<DocSettingsHeaderProps> = ({ onClose }) => (
  <div className="p-4 px-5 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
    <div className="flex items-center space-x-3">
      <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0 shadow-2xs">
        <Sliders className="w-5 h-5" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-foreground tracking-tight">
            Configurações de Documentação & IA
          </h3>
          <span className="text-[10px] bg-primary/15 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-mono font-bold">
            Cockpit RAG
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Fontes locais, repositórios Git, integrações Atlassian e Copilot de Linguagem (LLM).
        </p>
      </div>
    </div>
    <button
      onClick={onClose}
      className="p-1.5 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition cursor-pointer"
      title="Fechar (Esc)"
    >
      <X className="w-4 h-4" />
    </button>
  </div>
);
