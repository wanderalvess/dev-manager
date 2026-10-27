import React from 'react';
import { Layers } from 'lucide-react';
import type { DatabaseConnectionConfig, MonitoredPortConfig, RealtimeLogSource, TrackedProcessConfig, TrackedServiceConfig } from '../../../../../shared/types';
import { inheritedValues, type HubDefaults } from '../../../../../shared/integrationInheritance';
import type {
  IntegrationLayerAuth,
  IntegrationLayerConfig,
  IntegrationLayerId,
  IntegrationPdvSyncEndpoints
} from '../../../../../shared/integrationTypes';
import { countConfiguredLayers } from '../../../utils/integrationSettingsUtils';
import { IntegrationLayerCard } from './IntegrationLayerCard';

interface IntegrationLayersEditorProps {
  layers: IntegrationLayerConfig[];
  connections: DatabaseConnectionConfig[];
  services: TrackedServiceConfig[];
  processes: TrackedProcessConfig[];
  ports: MonitoredPortConfig[];
  logSources: RealtimeLogSource[];
  /** URL, login e pasta do Karaf já salvos em outras telas, herdados pela camada WinThor. */
  defaults: HubDefaults;
  onPatchLayer: (layer: IntegrationLayerId, patch: Partial<IntegrationLayerConfig>) => void;
  onPatchLayerAuth: (layer: IntegrationLayerId, patch: Partial<IntegrationLayerAuth>) => void;
  onPatchLayerPdvSync: (layer: IntegrationLayerId, patch: Partial<IntegrationPdvSyncEndpoints>) => void;
  onBrowseLog: (layer: IntegrationLayerId) => void;
}

/** As quatro camadas da cadeia WinThor → WSH → CH → PDV, sempre na ordem em que a integração passa por elas. */
export const IntegrationLayersEditor: React.FC<IntegrationLayersEditorProps> = ({
  layers,
  connections,
  services,
  processes,
  ports,
  logSources,
  defaults,
  onPatchLayer,
  onPatchLayerAuth,
  onPatchLayerPdvSync,
  onBrowseLog
}) => {
  const configured = countConfiguredLayers(layers);
  return (
    <div className="space-y-3" id="field-integrationLayers">
      <p className="text-xs text-muted-foreground flex items-center gap-2">
        <Layers className="w-4 h-4 text-primary shrink-0" />
        Como o Hub alcança e observa cada camada nesta máquina. Campo vazio é pulado; na camada WinThor, campo vazio usa o que já está
        nas outras telas. {configured} de {layers.length} configuradas.
      </p>

      <div className="space-y-3">
        {layers.map((layer) => (
          <IntegrationLayerCard
            key={layer.layer}
            layer={layer}
            connections={connections}
            services={services}
            processes={processes}
            ports={ports}
            logSources={logSources}
            inherited={inheritedValues(layer, defaults)}
            onPatch={(patch) => onPatchLayer(layer.layer, patch)}
            onPatchAuth={(patch) => onPatchLayerAuth(layer.layer, patch)}
            onPatchPdvSync={(patch) => onPatchLayerPdvSync(layer.layer, patch)}
            onBrowseLog={() => onBrowseLog(layer.layer)}
          />
        ))}
      </div>
    </div>
  );
};
