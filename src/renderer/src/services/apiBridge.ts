import { createBridgeDeps } from './webBridge/core';
import { createSystemApi } from './webBridge/system';
import { createEnvironmentApi } from './webBridge/environment';
import { createKarafApi } from './webBridge/karaf';
import { createKarafBundlesApi } from './webBridge/karafBundles';
import { createRoutine801Api } from './webBridge/routine801';
import { createDeployApi } from './webBridge/deploy';
import { createGitApi } from './webBridge/git';
import { createRoutinesApi } from './webBridge/routines';
import { createDocsApi } from './webBridge/docs';
import { createSettingsApi } from './webBridge/settings';
import { createDatabaseApi } from './webBridge/database';
import { createContainersApi } from './webBridge/containers';
import { createWslApi } from './webBridge/wsl';
import { createLogsApi } from './webBridge/logs';
import { createApmApi } from './webBridge/apm';
import { createQualityApi } from './webBridge/quality';

export function initApiBridge() {
  if (typeof window === 'undefined') return;

  // Se já existe electronAPI injetado pelo Electron Desktop, não sobrescreve
  if (window.electronAPI) {
    console.log('[API Bridge] Executando em ambiente Electron Desktop nativo.');
    return;
  }

  console.log('[API Bridge] Inicializando Web Adapter (Modo Docker / Navegador)...');

  const deps = createBridgeDeps();

  window.electronAPI = {
    ...createSystemApi(deps),
    ...createEnvironmentApi(deps),
    ...createKarafApi(deps),
    ...createKarafBundlesApi(deps),
    ...createRoutine801Api(deps),
    ...createDeployApi(deps),
    ...createGitApi(deps),
    ...createRoutinesApi(deps),
    ...createDocsApi(deps),
    ...createSettingsApi(deps),
    ...createDatabaseApi(deps),
    ...createContainersApi(deps),
    ...createWslApi(deps),
    ...createLogsApi(deps),
    ...createApmApi(deps),
    ...createQualityApi(deps)
  };
}

/**
 * Instância exportada para conveniência de importação direta, apontando para a interface
 * `window.electronAPI`. Resolvida a cada acesso: no modo Web o bridge só é instalado por
 * `initApiBridge()`, que roda depois de este módulo ser avaliado (import em main.tsx) — capturar
 * o valor na carga deixaria `api` indefinido para sempre fora do Electron.
 */
export const api = new Proxy({} as typeof window.electronAPI, {
  get: (_target, prop) => (typeof window !== 'undefined' ? (window as any).electronAPI?.[prop] : undefined)
});

export const apiBridge = api;

