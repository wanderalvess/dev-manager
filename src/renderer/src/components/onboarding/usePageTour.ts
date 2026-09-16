import { useCallback, useEffect, useState } from 'react';
import { TOUR_STORAGE_KEY as GLOBAL_TOUR_STORAGE_KEY } from './tourSteps';
import { onTourFinished } from './tourCoordinator';

function isDone(storageKey: string): boolean {
  try {
    return !!window.localStorage.getItem(storageKey);
  } catch {
    return false;
  }
}

/**
 * Abre sozinho no primeiro acesso da página, mas só depois que o tour global do Header já
 * tiver sido visto/pulado — evita dois tours abertos ao mesmo tempo no primeiro uso do app.
 */
export function usePageTour(storageKey: string) {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (isDone(storageKey)) return false;
    return isDone(GLOBAL_TOUR_STORAGE_KEY);
  });

  // Se o tour global ainda não tinha sido visto ao montar, abre este assim que ele terminar.
  useEffect(() => {
    if (isOpen || isDone(storageKey)) return;
    return onTourFinished(() => {
      if (!isDone(storageKey) && isDone(GLOBAL_TOUR_STORAGE_KEY)) {
        setIsOpen(true);
      }
    });
  }, [isOpen, storageKey]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, open, close };
}
