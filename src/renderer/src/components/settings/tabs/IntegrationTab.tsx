import React from 'react';
import { AppSettings } from '../../../../../shared/types';
import { useIntegrationConfig } from '../../../hooks/settings/useIntegrationConfig';
import { IntegrationLayersEditor } from '../integration/IntegrationLayersEditor';
import { IntegrationFlowsEditor } from '../integration/IntegrationFlowsEditor';

interface IntegrationTabProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

/** Aba "Integração ponta a ponta": catálogo das camadas e dos fluxos usados pelo Rastreio de Integração (decisão 0003). */
export const IntegrationTab: React.FC<IntegrationTabProps> = ({ settings, setSettings }) => {
  const config = useIntegrationConfig(settings, setSettings);
  return (
    <div className="space-y-4 flex flex-col flex-1" id="field-integration">
      <IntegrationLayersEditor
        layers={config.layers}
        connections={settings.databaseConnections || []}
        services={settings.trackedServices || []}
        onPatchLayer={config.updateLayer}
        onPatchLayerAuth={config.updateLayerAuth}
        onBrowseLog={(layer) => void config.browseLayerLog(layer)}
      />
      <IntegrationFlowsEditor
        flows={config.flows}
        onAdd={config.addFlow}
        onPatch={config.updateFlow}
        onRemove={(index) => void config.removeFlow(index)}
      />
    </div>
  );
};
