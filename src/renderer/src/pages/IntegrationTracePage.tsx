import React, { useState } from 'react';
import { Route, Settings } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { BatchTraceView } from '../components/integrationtrace/BatchTraceView';
import { IntegrationTraceTabs, type IntegrationTraceTab } from '../components/integrationtrace/IntegrationTraceTabs';
import { ReadinessView } from '../components/integrationtrace/ReadinessView';
import { WshMonitorView } from '../components/integrationtrace/wsh/WshMonitorView';
import { requestSettingsTab } from '../utils/settingsDeepLink';

interface IntegrationTracePageProps {
  onNavigateToSettings: () => void;
  settingsVersion?: number;
}

/**
 * Rastreio de Integração ponta a ponta (decisão 0003): WinThor → WSH → CH → PDV.
 * Pré-voo das camadas e rastreio parcial de um lote por SQL, logs e APM.
 */
export const IntegrationTracePage: React.FC<IntegrationTracePageProps> = ({ onNavigateToSettings, settingsVersion }) => {
  // O monitor do WSH abre primeiro: é por ele que se descobre por que um dado não chegou ao PDV
  const [tab, setTab] = useState<IntegrationTraceTab>('wsh');

  const openSettings = () => {
    requestSettingsTab('integration');
    onNavigateToSettings();
  };

  return (
    <div className="h-full w-full flex flex-col p-5 md:p-7 space-y-5 overflow-hidden">
      <PageHeader
        icon={Route}
        title="Rastreio de Integração"
        description="Veja o que o WSH gravou, confira as camadas e descubra em que ponta a integração parou."
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

      <IntegrationTraceTabs active={tab} onChange={setTab} />

      {/* As abas ficam montadas: o resultado de cada uma sobrevive à troca de aba */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1">
        <div hidden={tab !== 'wsh'}>
          <WshMonitorView settingsVersion={settingsVersion} onOpenSettings={openSettings} />
        </div>
        <div hidden={tab !== 'readiness'}>
          <ReadinessView onOpenSettings={openSettings} />
        </div>
        <div hidden={tab !== 'batch'}>
          <BatchTraceView settingsVersion={settingsVersion} onOpenSettings={openSettings} />
        </div>
      </div>
    </div>
  );
};
