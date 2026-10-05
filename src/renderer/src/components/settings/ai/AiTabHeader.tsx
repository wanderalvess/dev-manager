import React from 'react';
import { Bot, AlertTriangle, Plus } from 'lucide-react';
import { LlmProviderConfig } from '../../../../../shared/types';

interface AiTabHeaderProps {
  activeProvider: LlmProviderConfig | undefined;
  onNewProvider: () => void;
}

export const AiTabHeader: React.FC<AiTabHeaderProps> = ({ activeProvider, onNewProvider }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
    <div className="space-y-1">
      <div className="flex items-center gap-2.5">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          Provedores de IA & Motores LLM (BYOK)
        </h3>
        {activeProvider ? (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 font-mono text-[10px] font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            ONLINE · {activeProvider.name} ({activeProvider.model})
          </span>
        ) : (
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-500 font-mono text-[10px] font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3" />
            NENHUM MOTOR ATIVO
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground max-w-2xl">
        Configure suas próprias credenciais (<em>Bring Your Own Key</em>) para OpenAI, Gemini, Claude, Ollama ou OpenRouter.
        As chaves são salvas apenas localmente e usadas para o Copilot de Documentação e ferramentas MCP.
      </p>
    </div>
    <button
      type="button"
      onClick={onNewProvider}
      className="px-3.5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
    >
      <Plus className="w-4 h-4" />
      Novo Motor de IA
    </button>
  </div>
);
