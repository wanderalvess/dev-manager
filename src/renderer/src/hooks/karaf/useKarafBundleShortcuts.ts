import { useEffect } from 'react';

/** Atalhos: '/' foca a busca e 'Escape' fecha o modal (se nenhum sub-modal estiver aberto). */
export function useKarafBundleShortcuts(
  isOpen: boolean,
  onClose: () => void,
  searchRef: React.RefObject<HTMLInputElement>,
  hasOpenSubmodal: boolean
) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }

      if (e.key === 'Escape' && !hasOpenSubmodal) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, searchRef, hasOpenSubmodal]);
}
