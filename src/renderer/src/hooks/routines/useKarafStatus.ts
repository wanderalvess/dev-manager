import { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';
import { KarafWtaStatusResult } from '../../../../shared/types';
import { DEFAULT_WTA_URL } from '../../utils/routinesPageUtils';
import { useStartEmbeddedKaraf } from '../karaf/useStartEmbeddedKaraf';

export interface UseKarafStatusResult {
  karafStatus: KarafWtaStatusResult | null;
  setKarafStatus: Dispatch<SetStateAction<KarafWtaStatusResult | null>>;
  isCheckingKaraf: boolean;
  isStartingKaraf: boolean;
  checkKaraf: () => Promise<void>;
  handleStartEmbeddedKaraf: () => Promise<void>;
}

export function useKarafStatus(): UseKarafStatusResult {
  const [karafStatus, setKarafStatus] = useState<KarafWtaStatusResult | null>(null);
  const [isCheckingKaraf, setIsCheckingKaraf] = useState<boolean>(false);

  const checkKaraf = useCallback(async () => {
    if (!window.electronAPI?.checkRoutineKarafStatus) return;
    setIsCheckingKaraf(true);
    try {
      const status = await window.electronAPI.checkRoutineKarafStatus();
      setKarafStatus(status);
    } catch {
      setKarafStatus({
        online: false,
        wtaUrl: DEFAULT_WTA_URL,
        message: 'Apache Karaf / WTA não está respondendo.'
      });
    } finally {
      setIsCheckingKaraf(false);
    }
  }, []);

  const { isStartingKaraf, handleStartEmbeddedKaraf } = useStartEmbeddedKaraf(checkKaraf);

  // Polling periódico suave para verificar status do Karaf/WTA
  useEffect(() => {
    const interval = setInterval(() => {
      checkKaraf();
    }, 12000);
    return () => clearInterval(interval);
  }, [checkKaraf]);

  return { karafStatus, setKarafStatus, isCheckingKaraf, isStartingKaraf, checkKaraf, handleStartEmbeddedKaraf };
}
