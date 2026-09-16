import { useCallback, useState } from 'react';

/** Abre sozinho no primeiro acesso da página (storageKey ainda não gravado) e expõe um jeito de reabrir manualmente. */
export function usePageTour(storageKey: string) {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      return !window.localStorage.getItem(storageKey);
    } catch {
      return false;
    }
  });

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, open, close };
}
