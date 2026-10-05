import { useEffect, useState } from 'react';

export function useKarafStatus() {
  const [isKarafOnline, setIsKarafOnline] = useState<boolean | null>(null);
  const [isStartingKaraf, setIsStartingKaraf] = useState<boolean>(false);

  // Monitora o status de escuta do Karaf OSGi em segundo plano
  useEffect(() => {
    let mounted = true;
    const checkKaraf = async () => {
      try {
        if (window.electronAPI?.isKarafRunning) {
          const running = await window.electronAPI.isKarafRunning();
          if (mounted) setIsKarafOnline(running);
        }
      } catch {
        if (mounted) setIsKarafOnline(false);
      }
    };
    checkKaraf();
    const interval = setInterval(checkKaraf, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleStartEmbeddedKaraf = async () => {
    if (isStartingKaraf) return;
    setIsStartingKaraf(true);
    try {
      if (window.electronAPI?.startEmbeddedKaraf) {
        await window.electronAPI.startEmbeddedKaraf();
        setTimeout(async () => {
          if (window.electronAPI?.isKarafRunning) {
            const running = await window.electronAPI.isKarafRunning();
            setIsKarafOnline(running);
          }
          setIsStartingKaraf(false);
        }, 3000);
      }
    } catch {
      setIsStartingKaraf(false);
    }
  };

  return { isKarafOnline, isStartingKaraf, handleStartEmbeddedKaraf };
}
