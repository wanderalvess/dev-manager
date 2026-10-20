import { ipcRenderer } from 'electron';
import type {
  DelphiInstallation,
  DelphiProject,
  DelphiBuildRequest,
  DelphiBuildResult,
  DelphiPipelineRequest,
  DelphiPipelineResult
} from '../shared/types';

/** Canais delphi:* do preload (build MSBuild e pipeline de publicação), isolados para não crescer o index.ts. */
export const delphiApi = {
  delphiDetectInstallations: (): Promise<DelphiInstallation[]> => ipcRenderer.invoke('delphi:detect'),
  delphiFindProjects: (root?: string): Promise<DelphiProject[]> => ipcRenderer.invoke('delphi:find-projects', root),
  delphiBuild: (request: DelphiBuildRequest): Promise<DelphiBuildResult> => ipcRenderer.invoke('delphi:build', request),
  delphiRunPipeline: (request: DelphiPipelineRequest): Promise<DelphiPipelineResult> =>
    ipcRenderer.invoke('delphi:pipeline', request),
  delphiCancelBuild: (): Promise<{ success: boolean }> => ipcRenderer.invoke('delphi:cancel'),
  onDelphiLogChunk: (callback: (chunk: string) => void) => {
    const subscription = (_: any, chunk: string) => callback(chunk);
    ipcRenderer.on('delphi:log-chunk', subscription);
    return () => {
      ipcRenderer.removeListener('delphi:log-chunk', subscription);
    };
  }
};
