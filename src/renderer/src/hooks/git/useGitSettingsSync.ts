import { useEffect, useState } from 'react';

/** Branch alvo de PR: segue o padrão das configurações, sem sobrescrever uma escolha manual. */
export function useGitSettingsSync(settingsVersion: number | undefined, onRefreshProjects: () => void | Promise<void>) {
  const [targetBranch, setTargetBranch] = useState<string>('develop');
  const [preferredTarget, setPreferredTarget] = useState<string>('');

  // Sincroniza configurações globais (ex: branch alvo padrão configurado nas configurações)
  useEffect(() => {
    if (window.electronAPI?.getSettings) {
      window.electronAPI.getSettings().then((st) => {
        setPreferredTarget(st.targetPrBranch || '');
        if (st.targetPrBranch) {
          setTargetBranch((curr) => (curr === 'develop' || !curr ? st.targetPrBranch : curr));
        }
      }).catch(() => {});
    }
    if (settingsVersion && settingsVersion > 0) {
      onRefreshProjects();
    }
  }, [settingsVersion, onRefreshProjects]);

  return { targetBranch, setTargetBranch, preferredTarget };
}
