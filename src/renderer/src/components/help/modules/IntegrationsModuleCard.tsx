import React from 'react';
import { ArrowRight, Plug } from 'lucide-react';

interface IntegrationsModuleCardProps {
  onNavigate?: (tab: string) => void;
}

export const IntegrationsModuleCard: React.FC<IntegrationsModuleCardProps> = ({ onNavigate }) => {
  return (
    <div className="p-4 rounded-xl bg-card border border-border shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-muted text-muted-foreground">
              <Plug className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Integrações</h3>
              <span className="text-xs text-muted-foreground">Fim do menu lateral • Ctrl+K</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
          Um lugar só para ver tudo o que o Hub Manager conecta e em que estado cada coisa está:
        </p>

        <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground mb-4">
          <li>
            <strong className="text-foreground">Estado de cada integração:</strong> assistentes de IA (MCP), provedores de
            LLM, Confluence, Jira, Azure DevOps, GitLab/GitHub, WinThor CCW, fontes de teste, OpenTelemetry e webhooks.
          </li>
          <li>
            <strong className="text-foreground">Filtros:</strong> veja só as ativas ou só as que ainda não foram
            configuradas.
          </li>
          <li>
            <strong className="text-foreground">Atalho direto:</strong> cada cartão abre a aba certa das Configurações ou a
            página do módulo, sem você procurar onde fica.
          </li>
        </ul>
      </div>

      {onNavigate && (
        <button
          type="button"
          onClick={() => onNavigate('integrations')}
          className="flex items-center justify-between w-full px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted text-xs font-medium text-foreground transition-colors group"
        >
          <span>Abrir Integrações</span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}
    </div>
  );
};
