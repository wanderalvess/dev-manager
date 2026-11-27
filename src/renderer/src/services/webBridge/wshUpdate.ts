import type { ElectronAPI } from '../../../../preload/index';

const DESKTOP_ONLY = 'A atualização do WSH só está disponível no aplicativo desktop (baixa o instalador e troca o jar no WSL da máquina).';

/** Adaptador web da atualização do WSH: o servidor Express não expõe essa operação, então todas respondem "indisponível". */
export function createWshUpdateApi() {
  return {
    inspectWshUpdate: async () => ({ success: false, error: DESKTOP_ONLY }),
    probeWshInstaller: async () => ({ success: false, error: DESKTOP_ONLY }),
    prepareWshUpdate: async () => ({ success: false, error: DESKTOP_ONLY }),
    applyWshUpdate: async () => ({ success: false, error: DESKTOP_ONLY }),
    rollbackWshUpdate: async () => ({ success: false, error: DESKTOP_ONLY }),
    onWshUpdateProgress: () => () => {}
  } satisfies Partial<ElectronAPI>;
}
