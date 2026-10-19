import { useEffect } from 'react';
import { showToast } from '../ToastHost';

/**
 * Avisa (uma vez por versão) quando sai release nova no GitHub, em qualquer aba do app.
 * Também dispara a checagem ao montar: a do boot no processo main costuma acontecer antes
 * de a janela assinar o canal update:status, e o resultado se perderia.
 */
export const UpdateNotifier: React.FC = () => {
  useEffect(() => {
    let notifiedVersion: string | null = null;
    const unsubscribe = window.electronAPI?.onUpdateStatus?.((status) => {
      if (status.status === 'available' && status.version !== notifiedVersion) {
        notifiedVersion = status.version;
        showToast(`Nova versão v${status.version} disponível — atualize em Ajuda › Sobre.`, 'info');
      } else if (status.status === 'downloaded') {
        showToast(`Atualização v${status.version} baixada. Vá em Ajuda › Sobre para instalar e reiniciar.`, 'success');
      }
    });
    window.electronAPI?.checkForUpdate?.();
    return () => unsubscribe?.();
  }, []);
  return null;
};
