import React from 'react';
import { Settings, Sparkles } from 'lucide-react';
import type { LlmProviderConfig } from '../../../../shared/types';
import { resolveActiveLlmProvider } from '../../utils/llmProviderUtils';

interface DocSettingsLlmTabProps {
  llmProviders: LlmProviderConfig[];
  activeLlmProviderId?: string;
  /** Leva para Configurações → IA & LLM, onde os provedores são editados. */
  onOpenAiSettings?: () => void;
}

/** Resumo somente leitura do provedor de IA ativo; a edição fica só em Configurações → IA & LLM. */
export const DocSettingsLlmTab: React.FC<DocSettingsLlmTabProps> = ({
  llmProviders,
  activeLlmProviderId,
  onOpenAiSettings
}) => {
  const active = resolveActiveLlmProvider(llmProviders, activeLlmProviderId);

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl border border-border bg-muted/30 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          {active && active.enabled ? (
            <>
              <p className="font-bold text-foreground">
                {active.name} <span className="font-mono text-muted-foreground">({active.model})</span>
              </p>
              <p className="text-muted-foreground">
                Provedor ativo do Assistente IA. {llmProviders.length} provedor(es) cadastrado(s).
              </p>
            </>
          ) : (
            <>
              <p className="font-bold text-foreground">Nenhum provedor de IA ativo</p>
              <p className="text-muted-foreground">Cadastre um provedor para usar &quot;Perguntar à IA&quot;.</p>
            </>
          )}
        </div>
      </div>

      {onOpenAiSettings && (
        <button
          type="button"
          onClick={onOpenAiSettings}
          className="px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Abrir Configurações → IA &amp; LLM</span>
        </button>
      )}
    </div>
  );
};
