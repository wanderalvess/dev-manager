import { useCallback, useEffect, useState } from 'react';
import { useStartEmbeddedKaraf } from '../karaf/useStartEmbeddedKaraf';

export function useKarafStatus() {
  const [isKarafOnline, setIsKarafOnline] = useState<boolean | null>(null);

  const checkKaraf = useCallback(async () => {
    try {
      if (window.electronAPI?.isKarafRunning) {
        setIsKarafOnline(await window.electronAPI.isKarafRunning());
      }
    } catch {
      setIsKarafOnline(false);
    }
  }, []);

  // Monitora o status de escuta do Karaf OSGi em segundo plano
  useEffect(() => {
    void checkKaraf();
    const interval = setInterval(checkKaraf, 5000);
    return () => clearInterval(interval);
  }, [checkKaraf]);

  const { isStartingKaraf, handleStartEmbeddedKaraf } = useStartEmbeddedKaraf(checkKaraf);

  return { isKarafOnline, isStartingKaraf, handleStartEmbeddedKaraf };
}
