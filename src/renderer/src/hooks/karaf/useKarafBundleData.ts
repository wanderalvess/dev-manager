import { useState, useEffect, useCallback } from 'react';
import { KarafBundleInfo } from '../../../../shared/types';
import { KarafContainerStatus } from '../../utils/karafBundleUtils';
import { requestConfirm } from '../../components/ui/confirmService';

/**
 * Lista de bundles, status do container Karaf, polling de inicialização
 * e ações de ciclo de vida (subir/parar).
 */
export function useKarafBundleData(isOpen: boolean) {
  const [bundles, setBundles] = useState<KarafBundleInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [karafStatus, setKarafStatus] = useState<KarafContainerStatus>('OFFLINE');
  const [isEmbeddedRunning, setIsEmbeddedRunning] = useState(false);
  const [isStartingKaraf, setIsStartingKaraf] = useState(false);
  const [isStoppingKaraf, setIsStoppingKaraf] = useState(false);

  const fetchBundles = useCallback(async (isSilent = false) => {
    if (!window.electronAPI) return;
    if (!isSilent) setIsLoading(true);
    setErrorBanner(null);
    try {
      const list = await window.electronAPI.listKarafBundles();
      setBundles(list || []);
      setKarafStatus('ONLINE');
      setIsStartingKaraf(false);
    } catch (err: any) {
      let isEmbedded = false;
      try {
        isEmbedded = (await window.electronAPI.isEmbeddedKarafRunning?.().catch(() => false)) ?? false;
      } catch {
        // ignore
      }
      setIsEmbeddedRunning(isEmbedded);

      if (isEmbedded) {
        setKarafStatus('STARTING');
      } else {
        setKarafStatus((prev) => (prev === 'STARTING' ? 'STARTING' : 'OFFLINE'));
        setErrorBanner(`Apache Karaf offline ou inacessível via SSH (:8101). ${err?.message || ''}`);
      }
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, []);

  // Polling automático enquanto o Karaf estiver inicializando
  useEffect(() => {
    if (!isOpen || !isStartingKaraf) return;
    let attempts = 0;
    const maxAttempts = 25; // 25 tentativas x 3s = 75 segundos
    const timer = setInterval(async () => {
      attempts++;
      try {
        if (!window.electronAPI?.listKarafBundles) return;
        const list = await window.electronAPI.listKarafBundles();
        if (Array.isArray(list)) {
          setBundles(list);
          setKarafStatus('ONLINE');
          setIsStartingKaraf(false);
          setErrorBanner(null);
          clearInterval(timer);
        }
      } catch {
        if (attempts >= maxAttempts) {
          setIsStartingKaraf(false);
          setKarafStatus('OFFLINE');
          setErrorBanner('Tempo limite esgotado aguardando inicialização do Karaf. Verifique os logs.');
          clearInterval(timer);
        }
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [isOpen, isStartingKaraf]);

  useEffect(() => {
    if (isOpen) {
      fetchBundles();
    }
  }, [isOpen, fetchBundles]);

  const handleLaunchKarafDebug = async () => {
    if (!window.electronAPI?.launchServerDebug) return;
    setIsStartingKaraf(true);
    setKarafStatus('STARTING');
    setErrorBanner(null);
    try {
      const ok = await window.electronAPI.launchServerDebug();
      if (!ok) {
        setIsStartingKaraf(false);
        setKarafStatus('OFFLINE');
        setErrorBanner('Falha ao acionar inicialização do Karaf. Verifique se o caminho do Karaf está configurado nas Configurações.');
      }
    } catch (err: any) {
      setIsStartingKaraf(false);
      setKarafStatus('OFFLINE');
      setErrorBanner(`Erro ao iniciar Karaf: ${err?.message || err}`);
    }
  };

  const handleStartEmbeddedKaraf = async () => {
    if (!window.electronAPI?.startEmbeddedKaraf) return;
    setIsStartingKaraf(true);
    setKarafStatus('STARTING');
    setErrorBanner(null);
    try {
      const ok = await window.electronAPI.startEmbeddedKaraf();
      if (ok) {
        setIsEmbeddedRunning(true);
      } else {
        setIsStartingKaraf(false);
        setKarafStatus('OFFLINE');
        setErrorBanner('Falha ao iniciar console embutido do Karaf.');
      }
    } catch (err: any) {
      setIsStartingKaraf(false);
      setKarafStatus('OFFLINE');
      setErrorBanner(`Erro ao iniciar console embutido: ${err?.message || err}`);
    }
  };

  const handleStopKaraf = async () => {
    const confirmed = await requestConfirm({
      title: 'Encerrar o Karaf?',
      message: 'Deseja realmente encerrar a execução do container Apache Karaf?',
      confirmLabel: 'Encerrar',
      tone: 'warning'
    });
    if (!confirmed) return;
    setIsStoppingKaraf(true);
    try {
      if (isEmbeddedRunning && window.electronAPI?.stopEmbeddedKaraf) {
        await window.electronAPI.stopEmbeddedKaraf();
      }
      if (window.electronAPI?.killPort) {
        await window.electronAPI.killPort(5005).catch(() => {});
        await window.electronAPI.killPort(8101).catch(() => {});
      }
      setBundles([]);
      setKarafStatus('OFFLINE');
      setIsEmbeddedRunning(false);
    } catch (err: any) {
      setErrorBanner(`Erro ao parar Karaf: ${err?.message || err}`);
    } finally {
      setIsStoppingKaraf(false);
    }
  };

  return {
    bundles,
    isLoading,
    errorBanner,
    setErrorBanner,
    karafStatus,
    isStartingKaraf,
    isStoppingKaraf,
    fetchBundles,
    handleLaunchKarafDebug,
    handleStartEmbeddedKaraf,
    handleStopKaraf
  };
}
