import { useCallback, useEffect, useState } from 'react';
import { TOUR_STORAGE_KEY as GLOBAL_TOUR_STORAGE_KEY } from './tourSteps';
import { onTourFinished } from './tourCoordinator';

export const PAGE_TOURS_PREF_KEY = 'devManager:pageToursEnabled';

function isDone(storageKey: string): boolean {
  try {
    return !!window.localStorage.getItem(storageKey);
  } catch {
    return false;
  }
}

export function isPageToursEnabled(): boolean {
  try {
    return window.localStorage.getItem(PAGE_TOURS_PREF_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Abre sozinho no primeiro acesso da página, mas apenas se:
 * 1. O usuário ainda não concluiu este tour de página;
 * 2. O tour global inicial do Header já tiver sido concluído/pulado;
 * 3. O usuário optou explicitamente por ver os tutoriais de cada tela (devManager:pageToursEnabled === 'true').
 */
export function usePageTour(storageKey: string) {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (isDone(storageKey)) return false;
    if (!isPageToursEnabled()) return false;
    return isDone(GLOBAL_TOUR_STORAGE_KEY);
  });

  // Se o tour global ainda não tinha sido visto ao montar, abre este assim que ele terminar e se permitido.
  useEffect(() => {
    if (isOpen || isDone(storageKey)) return;
    return onTourFinished(() => {
      if (!isDone(storageKey) && isDone(GLOBAL_TOUR_STORAGE_KEY) && isPageToursEnabled()) {
        setIsOpen(true);
      }
    });
  }, [isOpen, storageKey]);

  // Abertura manual pelo botão ✨ sempre é permitida
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, open, close };
}
