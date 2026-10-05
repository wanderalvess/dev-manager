import { useState, useCallback } from 'react';
import { RoutineItem } from '../../../../shared/types';
import { toggleRoutineFavorite } from '../../utils/routinesPageUtils';

export function useRoutinesCatalog(checkKaraf: () => Promise<void>) {
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const loadRoutines = useCallback(async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI) {
        const [data] = await Promise.all([window.electronAPI.listRoutines(), checkKaraf()]);
        setRoutines(data || []);
      }
    } finally {
      setIsLoading(false);
    }
  }, [checkKaraf]);

  const handleToggleFavorite = async (id: string) => {
    if (window.electronAPI) {
      await window.electronAPI.toggleFavoriteRoutine(id);
      setRoutines((prev) => toggleRoutineFavorite(prev, id));
    }
  };

  return { routines, isLoading, loadRoutines, handleToggleFavorite };
}
