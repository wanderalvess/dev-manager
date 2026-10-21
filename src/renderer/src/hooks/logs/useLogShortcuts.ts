import { useEffect } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';

interface UseLogShortcutsParams {
  isActive?: boolean;
  searchInputRef: RefObject<HTMLInputElement>;
  setFilterText: (text: string) => void;
  setLines: Dispatch<SetStateAction<string[]>>;
  onNextMatch?: () => void;
  onPrevMatch?: () => void;
  onClearSearch?: () => void;
}

/** Atalhos locais (Ctrl+F, Esc, Ctrl+L, Enter, Shift+Enter, F3), ativos apenas enquanto a aba Logs está visível. */
export function useLogShortcuts({
  isActive,
  searchInputRef,
  setFilterText,
  setLines,
  onNextMatch,
  onPrevMatch,
  onClearSearch
}: UseLogShortcutsParams) {
  useEffect(() => {
    if (isActive === false) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isSearchFocused = document.activeElement === searchInputRef.current;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea') {
          e.preventDefault();
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }
      } else if (e.key === 'F3') {
        e.preventDefault();
        if (e.shiftKey) {
          onPrevMatch?.();
        } else {
          onNextMatch?.();
        }
      } else if (isSearchFocused && e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          onPrevMatch?.();
        } else {
          onNextMatch?.();
        }
      } else if (e.key === 'Escape' && isSearchFocused) {
        if (onClearSearch) {
          onClearSearch();
        } else {
          setFilterText('');
        }
        searchInputRef.current?.blur();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setLines([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, searchInputRef, setFilterText, setLines, onNextMatch, onPrevMatch, onClearSearch]);
}
