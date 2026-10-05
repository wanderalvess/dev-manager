import { useEffect } from 'react';
import type { DockerDataState } from './useDockerData';
import type { DockerComposeState } from './useDockerCompose';

/** Sincroniza o compose salvo nas configurações e recarrega dados quando as configurações mudam. */
export function useContainersSettingsSync(
  settingsVersion: number | undefined,
  data: DockerDataState,
  compose: Pick<DockerComposeState, 'setComposeFilePath' | 'setComposeProfile'>,
  loadEnvironments: () => Promise<void>
) {
  const { loadDockerData } = data;
  const { setComposeFilePath, setComposeProfile } = compose;

  useEffect(() => {
    window.electronAPI?.getSettings?.().then((settings) => {
      if (settings.dockerComposeConfig?.filePath) setComposeFilePath(settings.dockerComposeConfig.filePath);
      if (settings.dockerComposeConfig?.profile) setComposeProfile(settings.dockerComposeConfig.profile);
    });
    if (settingsVersion && settingsVersion > 0) {
      loadEnvironments();
      loadDockerData();
    }
  }, [settingsVersion, loadEnvironments, loadDockerData, setComposeFilePath, setComposeProfile]);
}
