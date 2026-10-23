import type { ElectronAPI } from '../../../../preload/index';
import { EMPTY_REMOTE_STATUS } from '../../../../shared/remoteControl';

/** O controle remoto só existe no app desktop (depende da janela e do firewall do PC): no modo Web fica indisponível. */
export function createRemoteControlApi() {
  const unsupported = async () => EMPTY_REMOTE_STATUS;
  return {
    getRemoteControlStatus: unsupported,
    startRemoteControl: unsupported,
    stopRemoteControl: unsupported,
    regenerateRemoteControlKey: unsupported
  } satisfies Partial<ElectronAPI>;
}
