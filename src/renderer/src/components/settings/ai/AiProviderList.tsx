import React from 'react';
import { Activity } from 'lucide-react';
import { AppSettings, LlmProviderConfig, LlmTestResult } from '../../../../../shared/types';
import { AiProviderCard } from './AiProviderCard';

interface AiProviderListProps {
  settings: AppSettings;
  isTestingLlmId: string | null;
  llmTestResults: Record<string, LlmTestResult>;
  onSetActive: (id: string) => void;
  onTest: (provider: LlmProviderConfig) => Promise<void>;
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (provider: Partial<LlmProviderConfig>) => void;
  onDelete: (id: string) => void;
}

export const AiProviderList: React.FC<AiProviderListProps> = ({
  settings,
  isTestingLlmId,
  llmTestResults,
  onSetActive,
  onTest,
  onToggle,
  onEdit,
  onDelete
}) => {
  const providers = settings.llmProviders || [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-primary" />
          Motores Configurados ({providers.length})
        </span>
        <span className="text-[11px] text-muted-foreground">
          O motor selecionado é consultado pelo Copilot de Documentação e MCP.
        </span>
      </div>

      {providers.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-lg">
          Nenhum motor configurado. Selecione um preset acima ou clique em{' '}
          <strong className="text-foreground">Novo Motor de IA</strong>.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {providers.map((provider) => (
            <AiProviderCard
              key={provider.id}
              provider={provider}
              isActive={settings.activeLlmProviderId === provider.id}
              isTesting={isTestingLlmId === provider.id}
              testResult={llmTestResults[provider.id]}
              onSetActive={onSetActive}
              onTest={onTest}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};
