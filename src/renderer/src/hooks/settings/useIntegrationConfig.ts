import type { AppSettings } from '../../../../shared/types';
import type {
  IntegrationFlowDefinition,
  IntegrationLayerAuth,
  IntegrationLayerConfig,
  IntegrationLayerId,
  IntegrationPdvSyncEndpoints
} from '../../../../shared/integrationTypes';
import { createFlowDraft, ensureAllLayers, patchLayer, removeFlowAt, updateFlowAt } from '../../utils/integrationSettingsUtils';
import { requestConfirm } from '../../components/ui/confirmService';
import type { SetSettings } from './settingsHookTypes';

/** Aba "Integração ponta a ponta": camadas (WinThor, WSH, CH, PDV) e fluxos do WSH, editados no rascunho das Configurações. */
export function useIntegrationConfig(settings: AppSettings, setSettings: SetSettings) {
  const layers = ensureAllLayers(settings.integrationLayers);
  const flows: IntegrationFlowDefinition[] = settings.integrationFlows || [];

  const updateLayer = (layer: IntegrationLayerId, patch: Partial<IntegrationLayerConfig>) =>
    setSettings((prev) => ({ ...prev, integrationLayers: patchLayer(prev.integrationLayers, layer, patch) }));

  const updateLayerAuth = (layer: IntegrationLayerId, patch: Partial<IntegrationLayerAuth>) =>
    setSettings((prev) => {
      const current = ensureAllLayers(prev.integrationLayers).find((entry) => entry.layer === layer);
      const auth: IntegrationLayerAuth = { ...(current?.auth ?? { type: 'none' }), ...patch };
      return { ...prev, integrationLayers: patchLayer(prev.integrationLayers, layer, { auth }) };
    });

  const updateLayerPdvSync = (layer: IntegrationLayerId, patch: Partial<IntegrationPdvSyncEndpoints>) =>
    setSettings((prev) => {
      const current = ensureAllLayers(prev.integrationLayers).find((entry) => entry.layer === layer);
      return { ...prev, integrationLayers: patchLayer(prev.integrationLayers, layer, { pdvsync: { ...(current?.pdvsync ?? {}), ...patch } }) };
    });

  const browseLayerLog = async (layer: IntegrationLayerId) => {
    const select = window.electronAPI?.selectFile;
    if (!select) return;
    const selected = await select({
      filters: [
        { name: 'Arquivos de Log (*.log, *.out, *.txt)', extensions: ['log', 'out', 'txt'] },
        { name: 'Todos os arquivos (*.*)', extensions: ['*'] }
      ]
    });
    if (selected) updateLayer(layer, { logFilePath: selected });
  };

  const addFlow = () =>
    setSettings((prev) => ({ ...prev, integrationFlows: [...(prev.integrationFlows || []), createFlowDraft(Date.now())] }));

  const updateFlow = (index: number, patch: Partial<IntegrationFlowDefinition>) =>
    setSettings((prev) => ({ ...prev, integrationFlows: updateFlowAt(prev.integrationFlows, index, patch) }));

  const removeFlow = async (index: number) => {
    const flow = flows[index];
    const confirmed = await requestConfirm({
      title: 'Remover fluxo?',
      message: `Remover o fluxo "${flow?.name || 'sem nome'}"? Só vale depois de clicar em "Salvar alterações".`,
      confirmLabel: 'Remover',
      tone: 'danger'
    });
    if (confirmed) setSettings((prev) => ({ ...prev, integrationFlows: removeFlowAt(prev.integrationFlows, index) }));
  };

  return { layers, flows, updateLayer, updateLayerAuth, updateLayerPdvSync, browseLayerLog, addFlow, updateFlow, removeFlow };
}
