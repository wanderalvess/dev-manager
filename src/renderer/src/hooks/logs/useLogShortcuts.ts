import { useEffect } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';

interface UseLogShortcutsParams {
  isActive?: boolean;
  searchInputRef: RefObject<HTMLInputElement>;
  setFilterText: Dispatch<SetStateAction<string>>;
  setLines: Dispatch<SetStateAction<string[]>>;
}

/** Atalhos locais (Ctrl+F, Esc, Ctrl+L), ativos apenas enquanto a aba Logs está visível. */
export function useLogShortcuts({ isActive, searchInputRef, setFilterText, setLines }: UseLogShortcutsParams) {
  useEffect(() => {
    if (isActive === false) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea') {
          e.preventDefault();
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setFilterText('');
        searchInputRef.current?.blur();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setLines([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, searchInputRef, setFilterText, setLines]);
}
