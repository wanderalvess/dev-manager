import React from 'react';
import { AppSettings } from '../../../../../shared/types';
import { useIntegrationConfig } from '../../../hooks/settings/useIntegrationConfig';
import { IntegrationLayersEditor } from '../integration/IntegrationLayersEditor';
import { IntegrationFlowsEditor } from '../integration/IntegrationFlowsEditor';
import { IntegrationEssentialsCard } from '../integration/IntegrationEssentialsCard';
import { IntegrationOptionalSection } from '../integration/IntegrationOptionalSection';
import { hubDefaultsFrom } from '../../../../../shared/integrationInheritance';
import { countConfiguredLayers } from '../../../utils/integrationSettingsUtils';

interface IntegrationTabProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

/**
 * Aba "Integração ponta a ponta" (decisão 0003). Em cima, o essencial: a conexão Oracle que o Monitor do WSH lê.
 * Recolhidos, os opcionais: as camadas (só o pré-voo usa) e os fluxos com o PDVSync (só o Rastrear lote usa).
 */
export const IntegrationTab: React.FC<IntegrationTabProps> = ({ settings, setSettings }) => {
  const config = useIntegrationConfig(settings, setSettings);
  const winthor = config.layers.find((layer) => layer.layer === 'winthor');
  return (
    <div className="space-y-3 flex flex-col flex-1" id="field-integration">
      <IntegrationEssentialsCard
        connections={settings.databaseConnections || []}
        connectionId={winthor?.dbConnectionId}
        onChange={(dbConnectionId) => config.updateLayer('winthor', { dbConnectionId })}
      />

      <IntegrationOptionalSection
        title="Pré-voo das camadas"
        purpose="Confere se WinThor, WSH, CH e PDV estão de pé antes de um teste: serviço, processo, porta, health, login e log. A camada WinThor já usa a URL, o login e o log do Karaf das outras telas."
        summary={`${countConfiguredLayers(config.layers)} de ${config.layers.length} configuradas`}
      >
        <IntegrationLayersEditor
          layers={config.layers}
          connections={settings.databaseConnections || []}
          services={settings.trackedServices || []}
          processes={settings.trackedProcesses || []}
          ports={settings.monitoredPorts || []}
          logSources={settings.realtimeLogSources || []}
          defaults={hubDefaultsFrom(settings)}
          onPatchLayer={config.updateLayer}
          onPatchLayerAuth={config.updateLayerAuth}
          onPatchLayerPdvSync={config.updateLayerPdvSync}
          onBrowseLog={(layer) => void config.browseLayerLog(layer)}
        />
      </IntegrationOptionalSection>

      <IntegrationOptionalSection
        title="Rastrear lote pelo PDVSync"
        purpose="Segue um lote pelo número, consultando o PDVSync e o banco do PDV. Precisa dos fluxos abaixo e do login do PDVSync na camada CH. O Monitor do WSH não precisa de nada disso."
        summary={`${config.flows.length} fluxo(s)`}
      >
        <IntegrationFlowsEditor
          flows={config.flows}
          onAdd={config.addFlow}
          onPatch={config.updateFlow}
          onRemove={(index) => void config.removeFlow(index)}
        />
      </IntegrationOptionalSection>
    </div>
  );
};
