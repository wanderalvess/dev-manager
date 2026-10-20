import type {
  DelphiBuildRequest,
  DelphiBuildResult,
  DelphiInstallation,
  DelphiPipelineRequest,
  DelphiPipelineResult,
  DelphiProject
} from '../../../../shared/types';
import type { ElectronAPI } from '../../../../preload/index';
import type { BridgeDeps } from './core';

/** Adaptador web (REST/WebSocket) dos canais: Build Delphi e pipeline de publicação. */
export function createDelphiApi({ apiFetch, wsManager }: BridgeDeps) {
  const post = <T>(url: string, body: unknown) => apiFetch<T>(url, { method: 'POST', body: JSON.stringify(body) });
  return {
    delphiDetectInstallations: (): Promise<DelphiInstallation[]> => apiFetch('/api/delphi/installations'),

    delphiFindProjects: (root?: string): Promise<DelphiProject[]> =>
      apiFetch(`/api/delphi/projects${root ? `?root=${encodeURIComponent(root)}` : ''}`),

    delphiBuild: (request: DelphiBuildRequest): Promise<DelphiBuildResult> => post('/api/delphi/build', request),

    delphiRunPipeline: (request: DelphiPipelineRequest): Promise<DelphiPipelineResult> =>
      post('/api/delphi/pipeline', request),

    delphiCancelBuild: (): Promise<{ success: boolean }> => post('/api/delphi/cancel', {}),

    onDelphiLogChunk: (callback: (chunk: string) => void) => wsManager.subscribe('delphi:log-chunk', callback)
  } satisfies Partial<ElectronAPI>;
}
