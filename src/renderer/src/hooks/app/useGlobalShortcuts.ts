import { useEffect } from 'react';
import { isQuickLauncherToggle, resolveAltShortcutTab } from '../../utils/appShellNavigation';

// Atalhos globais (Alt+0..9, Alt+Q e Ctrl+K). Tabela em utils/appShellNavigation.ts.
export function useGlobalShortcuts(
  setActiveTab: (tab: string) => void,
  setIsQuickLauncherOpen: React.Dispatch<React.SetStateAction<boolean>>
): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isQuickLauncherToggle(e)) {
        e.preventDefault();
        setIsQuickLauncherOpen((prev) => !prev);
        return;
      }
      const tab = resolveAltShortcutTab(e);
      if (tab) setActiveTab(tab);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTab, setIsQuickLauncherOpen]);
}
