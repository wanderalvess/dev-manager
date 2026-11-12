import { useCallback } from 'react';

export function useSplashEntry(onEnter: () => void, navigate: (tab: string) => void) {
  const enter = useCallback(() => onEnter(), [onEnter]);
  const openTab = useCallback((tab: string) => {
    onEnter();
    navigate(tab);
  }, [onEnter, navigate]);
  return { enter, openTab };
}
