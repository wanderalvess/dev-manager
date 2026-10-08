import React from 'react';
import { Sparkles, Plus, Bot, Settings, Trash2 } from 'lucide-react';
import type { LlmProviderConfig } from '../../../../shared/types';
import { isLlmProviderActive } from '../../utils/llmProviderUtils';

interface DocSettingsLlmProviderListProps {
  llmProviders: LlmProviderConfig[];
  activeLlmProviderId?: string;
  isEditing: boolean;
  onStartNew: () => void;
  onEdit: (provider: LlmProviderConfig) => void;
  onDelete: (id: string) => Promise<void>;
  onSetActive: (id: string) => Promise<void>;
}

export const DocSettingsLlmProviderList: React.FC<DocSettingsLlmProviderListProps> = ({
  llmProviders,
  activeLlmProviderId,
  isEditing,
  onStartNew,
  onEdit,
  onDelete,
  onSetActive
}) => (
  <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-3 shadow-2xs">
    <div className="flex items-center justify-between gap-3">
      <div>
        <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Provedores de IA / LLM (BYOK)</span>
        </h4>
        <p className="text-[11px] text-muted-foreground">
          Conecte seu modelo de linguagem para sintetizar respostas com base na documentação indexada (RAG).
        </p>
      </div>
      {!isEditing && (
        <button
          type="button"
          onClick={onStartNew}
          className="px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Configurar Provedor</span>
        </button>
      )}
    </div>

    {llmProviders.length === 0 && !isEditing ? (
      <div className="text-center py-6 border border-dashed border-border rounded-xl bg-muted/20">
        <Bot className="w-8 h-8 mx-auto text-muted-foreground/50 mb-1.5" />
        <p className="text-xs font-semibold text-foreground">Nenhum provedor de IA cadastrado</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Adicione seu provedor preferido (OpenAI, Gemini, Claude, Ollama ou customizado).
        </p>
      </div>
    ) : (
      <div className="space-y-2">
        {llmProviders.map((p) => {
          const isActive = isLlmProviderActive(p, activeLlmProviderId);
          return (
            <div
              key={p.id}
              className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                isActive ? 'bg-primary/5 border-primary/40 shadow-2xs' : 'bg-muted/30 border-border/80 hover:border-border'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onSetActive(p.id)}
                  className={`px-2.5 py-1 rounded-lg text-2xs font-mono font-bold border transition flex items-center gap-1 cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-2xs'
                      : 'bg-muted text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted/80'
                  }`}
                  title={isActive ? 'Provedor ativo para o RAG' : 'Clique para ativar este provedor'}
                >
                  {isActive ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Ativo</span>
                    </>
                  ) : (
                    <span>Ativar</span>
                  )}
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground truncate">{p.name}</span>
                    <span className="text-2xs font-mono px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground font-semibold">
                      {p.model}
                    </span>
                  </div>
                  <div className="text-2xs text-muted-foreground font-mono truncate">
                    {p.baseUrl || (p.provider === 'gemini' ? 'Google API' : 'Padrão')}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onEdit(p)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                  title="Editar configuração"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(p.id)}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition cursor-pointer"
                  title="Remover provedor"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);
