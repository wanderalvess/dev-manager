import type { IntegrationReadinessResult } from '../../../../shared/integrationTypes';
import type { ElectronAPI } from '../../../../preload/index';
import type { BridgeDeps } from './core';

/** Adaptador web (REST) dos canais: Rastreio de Integração ponta a ponta. */
export function createIntegrationApi({ apiFetch }: BridgeDeps) {
  return {
    integrationCheckReadiness: (): Promise<IntegrationReadinessResult> =>
      apiFetch<IntegrationReadinessResult>('/api/integration/readiness', { method: 'POST', body: JSON.stringify({}) })
  } satisfies Partial<ElectronAPI>;
}
