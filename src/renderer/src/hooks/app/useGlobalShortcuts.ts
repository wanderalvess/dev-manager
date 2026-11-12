import { useEffect } from 'react';
import { TAB_SHORTCUTS } from './useAppShellNavigation';

export function useGlobalShortcuts(
  navigate: (tab: string) => void,
  setQuickLauncherOpen: React.Dispatch<React.SetStateAction<boolean>>
) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQuickLauncherOpen((prev) => !prev);
        return;
      }
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const targetTab = TAB_SHORTCUTS[e.key.toLowerCase()];
        if (targetTab) {
          e.preventDefault();
          navigate(targetTab);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate, setQuickLauncherOpen]);
}
