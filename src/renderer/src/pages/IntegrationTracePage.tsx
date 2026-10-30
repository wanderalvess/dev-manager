import React, { useState } from 'react';
import { Route, Settings } from 'lucide-react';
import { BatchTraceView } from '../components/integrationtrace/BatchTraceView';
import { IntegrationTraceTabs, type IntegrationTraceTab } from '../components/integrationtrace/IntegrationTraceTabs';
import { ReadinessView } from '../components/integrationtrace/ReadinessView';
import { WshMonitorView } from '../components/integrationtrace/wsh/WshMonitorView';
import { OnlineProcessesView } from '../components/integrationtrace/online/OnlineProcessesView';
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
    <div className="h-full w-full flex flex-col px-5 pt-4 pb-4 md:px-6 gap-3 overflow-hidden">
      {/* Cabeçalho em uma linha (título, abas e Configurar): a altura vai para a lista e o detalhe */}
      <div className="flex flex-wrap items-stretch gap-x-5 border-b border-border shrink-0">
        <h1 className="flex items-center gap-2.5 py-2 text-lg font-extrabold tracking-tight text-foreground whitespace-nowrap">
          <Route className="w-5 h-5 text-primary" aria-hidden="true" />
          Rastreio de Integração
        </h1>
        <IntegrationTraceTabs active={tab} onChange={setTab} />
        <button
          type="button"
          onClick={openSettings}
          className="ml-auto my-1.5 h-9 px-3 bg-muted hover:bg-muted/80 text-foreground border border-border font-medium text-sm rounded-[10px] transition-colors flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          <span>Configurar</span>
        </button>
      </div>

      {/* As abas ficam montadas: o resultado de cada uma sobrevive à troca de aba */}
      <div className="flex-1 min-h-0">
        {/* O monitor não rola a página em tela larga: lista e detalhe rolam cada um no seu quadro */}
        <div hidden={tab !== 'wsh'} className="h-full overflow-y-auto lg:overflow-hidden">
          <WshMonitorView settingsVersion={settingsVersion} onOpenSettings={openSettings} />
        </div>
        <div hidden={tab !== 'online'} className="h-full overflow-y-auto pr-1 -mr-1">
          <OnlineProcessesView />
        </div>
        <div hidden={tab !== 'readiness'} className="h-full overflow-y-auto pr-1 -mr-1">
          <ReadinessView onOpenSettings={openSettings} />
        </div>
        <div hidden={tab !== 'batch'} className="h-full overflow-y-auto pr-1 -mr-1">
          <BatchTraceView settingsVersion={settingsVersion} onOpenSettings={openSettings} />
        </div>
      </div>
    </div>
  );
};
