import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { GitProjectInfo, RoutineItem } from '../../../../shared/types';
import { buildQuickLauncherItems } from '../../utils/quickLauncherItems';
import type { QuickLauncherItem } from '../../utils/quickLauncherActions';

interface UseQuickLauncherParams {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  projects: GitProjectInfo[];
  onRefreshAll: () => void;
}

export function useQuickLauncher({
  isOpen,
  onClose,
  onNavigate,
  projects,
  onRefreshAll
}: UseQuickLauncherParams) {
  const [search, setSearch] = useState<string>('');
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Carregar rotinas Delphi
  useEffect(() => {
    if (isOpen && window.electronAPI) {
      window.electronAPI.listRoutines().then((data) => {
        setRoutines(data || []);
      });
      setSearch('');
      setSelectedIndex(0);
      // Aguarda o modal montar antes de focar o campo de busca.
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const launchRoutine = useCallback(async (fullPath: string) => {
    if (window.electronAPI) {
      await window.electronAPI.launchRoutine(fullPath);
    }
  }, []);

  // Lista agregada e filtrada de itens
  const filteredItems = useMemo<QuickLauncherItem[]>(
    () =>
      buildQuickLauncherItems({
        search,
        routines,
        projects,
        onNavigate,
        onRefreshAll,
        onClose,
        launchRoutine
      }),
    [search, routines, projects, onNavigate, onRefreshAll, onClose, launchRoutine]
  );

  // Resetar índice quando os resultados mudarem
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems.length]);

  // Rolar item selecionado para a visão
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].onSelect();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return {
    search,
    setSearch,
    selectedIndex,
    setSelectedIndex,
    filteredItems,
    inputRef,
    listRef,
    handleKeyDown
  };
}
