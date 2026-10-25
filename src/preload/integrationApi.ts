import { ipcRenderer } from 'electron';
import type { IntegrationReadinessResult } from '../shared/integrationTypes';

/** Canais integration:* do preload (Rastreio de Integração ponta a ponta), isolados para não crescer o index.ts. */
export const integrationApi = {
  integrationCheckReadiness: (): Promise<IntegrationReadinessResult> => ipcRenderer.invoke('integration:check-readiness')
};
