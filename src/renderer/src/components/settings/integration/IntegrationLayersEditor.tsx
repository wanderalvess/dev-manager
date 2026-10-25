import React from 'react';
import { Layers } from 'lucide-react';
import type { DatabaseConnectionConfig, TrackedServiceConfig } from '../../../../../shared/types';
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
  onPatchLayer,
  onPatchLayerAuth,
  onPatchLayerPdvSync,
  onBrowseLog
}) => {
  const configured = countConfiguredLayers(layers);
  return (
    <div className="cockpit-panel rounded-xl p-5 space-y-4 shadow-xl border border-border" id="field-integrationLayers">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          <h3 className="text-[13px] font-semibold text-foreground flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" /> Camadas da integração
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Como o Hub alcança e observa cada camada na sua máquina. O pré-voo usa só o que estiver preenchido.
          </p>
        </div>
        <span className="text-2xs text-muted-foreground font-mono">{configured} de {layers.length} configuradas</span>
      </div>

      <div className="space-y-3">
        {layers.map((layer) => (
          <IntegrationLayerCard
            key={layer.layer}
            layer={layer}
            connections={connections}
            services={services}
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
