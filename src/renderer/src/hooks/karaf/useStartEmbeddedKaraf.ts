import { useCallback, useState } from 'react';
import { showToast } from '../../components/ToastHost';

const POLL_INTERVAL_MS = 1000;
const MAX_WAIT_MS = 30000;

async function waitUntilRunning(): Promise<void> {
  if (!window.electronAPI?.isKarafRunning) return;
  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    if (await window.electronAPI.isKarafRunning().catch(() => false)) return;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

/**
 * Sobe o console embutido do Karaf e espera a porta SSH responder (em vez de um atraso fixo).
 * `onSettled` roda ao final, com sucesso ou não, para a tela reler o status.
 */
export function useStartEmbeddedKaraf(onSettled: () => Promise<void> | void) {
  const [isStartingKaraf, setIsStartingKaraf] = useState(false);

  const handleStartEmbeddedKaraf = useCallback(async () => {
    if (isStartingKaraf || !window.electronAPI?.startEmbeddedKaraf) return;
    setIsStartingKaraf(true);
    try {
      const started = await window.electronAPI.startEmbeddedKaraf();
      if (started) {
        await waitUntilRunning();
      } else {
        showToast('Falha ao iniciar o console embutido do Karaf. Confira o caminho do Karaf nas Configurações.', 'error');
      }
    } catch (err) {
      showToast(`Erro ao iniciar o Karaf: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      await onSettled();
      setIsStartingKaraf(false);
    }
  }, [isStartingKaraf, onSettled]);

  return { isStartingKaraf, handleStartEmbeddedKaraf };
}
