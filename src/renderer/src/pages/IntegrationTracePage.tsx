import React from 'react';
import { AlertTriangle, Route, Settings } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { ReadinessVerdictBar } from '../components/integrationtrace/ReadinessVerdictBar';
import { ReadinessLayerCard } from '../components/integrationtrace/ReadinessLayerCard';
import { ReadinessEmptyState } from '../components/integrationtrace/ReadinessEmptyState';
import { useIntegrationReadiness } from '../hooks/integration/useIntegrationReadiness';
import { requestSettingsTab } from '../utils/settingsDeepLink';

interface IntegrationTracePageProps {
  onNavigateToSettings: () => void;
}

/**
 * Rastreio de Integração ponta a ponta (decisão 0003): WinThor → WSH → CH → PDV.
 * Fase 1: pré-voo das camadas. A linha do tempo do lote chega nas próximas fases.
 */
export const IntegrationTracePage: React.FC<IntegrationTracePageProps> = ({ onNavigateToSettings }) => {
  const { result, running, error, run } = useIntegrationReadiness();

  const openSettings = () => {
    requestSettingsTab('integration');
    onNavigateToSettings();
  };

  return (
    <div className="h-full w-full flex flex-col p-5 md:p-7 space-y-5 overflow-hidden">
      <PageHeader
        icon={Route}
        title="Rastreio de Integração"
        description="Confira WinThor, WSH, CH e PDV antes de testar uma integração de ponta a ponta."
        actions={
          <button
            type="button"
            onClick={openSettings}
            className="h-10 px-3 bg-muted hover:bg-muted/80 text-foreground border border-border font-medium text-sm rounded-[10px] transition-colors flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            <span>Configurar</span>
          </button>
        }
      />

      <ReadinessVerdictBar result={result} running={running} onRun={() => void run()} />

      {error && (
        <div role="alert" className="px-4 py-2.5 rounded-xl border bg-danger/10 border-danger/30 text-danger text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1">
        {result ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4" data-testid="readiness-layers">
            {result.layers.map((layer) => (
              <ReadinessLayerCard key={layer.layer} readiness={layer} />
            ))}
          </div>
        ) : (
          <ReadinessEmptyState onOpenSettings={openSettings} />
        )}
      </div>
    </div>
  );
};
