import { useCallback } from 'react';
import { resolveEnterTab } from '../../utils/appShellNavigation';

/**
 * Saídas da tela de início para o cockpit. Entrar leva à aba escolhida em Configurações (Aparência → Tela ao entrar) e, sem
 * ela, deixa o app na aba em que abriu, que é a última usada. Os cartões da tela de início levam direto a um módulo.
 */
export function useSplashEntry(closeSplash: () => void, navigate: (tab: string) => void) {
  const enter = useCallback(() => {
    closeSplash();
    window.electronAPI
      ?.getSettings?.()
      .then((s) => {
        const tab = resolveEnterTab(s.startTab, s.disabledModules);
        if (tab) navigate(tab);
      })
      .catch(() => undefined);
  }, [closeSplash, navigate]);

  const openTab = useCallback(
    (tab: string) => {
      closeSplash();
      navigate(tab);
    },
    [closeSplash, navigate]
  );

  return { enter, openTab };
}
