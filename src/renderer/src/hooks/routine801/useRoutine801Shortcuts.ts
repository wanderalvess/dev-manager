import { useEffect, type RefObject } from 'react';

interface UseRoutine801ShortcutsParams {
  isOpen: boolean;
  isDirectInstallOpen: boolean;
  hasInspectedFeature: boolean;
  isConfigOpen: boolean;
  isConsoleExpanded: boolean;
  searchInputRef: RefObject<HTMLInputElement>;
  closeDirectInstall: () => void;
  closeInspector: () => void;
  closeConfig: () => void;
  closeConsole: () => void;
  onClose: () => void;
}

// Esc fecha a camada mais interna aberta; "/" foca a busca
export const useRoutine801Shortcuts = ({
  isOpen,
  isDirectInstallOpen,
  hasInspectedFeature,
  isConfigOpen,
  isConsoleExpanded,
  searchInputRef,
  closeDirectInstall,
  closeInspector,
  closeConfig,
  closeConsole,
  onClose
}: UseRoutine801ShortcutsParams) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDirectInstallOpen) {
          closeDirectInstall();
        } else if (hasInspectedFeature) {
          closeInspector();
        } else if (isConfigOpen) {
          closeConfig();
        } else if (isConsoleExpanded) {
          closeConsole();
        } else {
          onClose();
        }
      } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isDirectInstallOpen, hasInspectedFeature, isConfigOpen, isConsoleExpanded, onClose]);
};
