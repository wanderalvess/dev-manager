import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import type { DatabaseConnectionConfig, TableColumnInfo } from '../../../../shared/types';
import {
  computeAutocompleteState,
  extractReferencedTables,
  resolveColumnLoadKey,
  type AutocompleteState
} from '../../utils/sqlEditorUtils';

interface UseSqlEditorAutocompleteParams {
  sql: string;
  setSql: (sql: string | ((prev: string) => string)) => void;
  activeConnection: DatabaseConnectionConfig | null;
  onExecuteSql: (customSql?: string) => void;
  tables: string[];
  tableColumns: Record<string, TableColumnInfo[]>;
  isLoadingColumns: Record<string, boolean>;
  setIsLoadingColumns: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setTableColumns: React.Dispatch<React.SetStateAction<Record<string, TableColumnInfo[]>>>;
  sqlTextareaRef: React.RefObject<HTMLTextAreaElement>;
}

/** Estado, carregamento de colunas e atalhos de teclado (Ctrl+Enter, Tab, setas) do textarea SQL. */
export function useSqlEditorAutocomplete({
  sql,
  setSql,
  activeConnection,
  onExecuteSql,
  tables,
  tableColumns,
  isLoadingColumns,
  setIsLoadingColumns,
  setTableColumns,
  sqlTextareaRef
}: UseSqlEditorAutocompleteParams) {
  const [autocomplete, setAutocomplete] = useState<AutocompleteState | null>(null);

  const referencedTables = useMemo(() => extractReferencedTables(sql), [sql]);

  // Garante que as colunas das tabelas referenciadas no SQL estejam carregadas para o autocomplete (com debounce de 400ms)
  useEffect(() => {
    if (!activeConnection || !window.electronAPI?.getDbTableColumns || referencedTables.length === 0) return;

    const timer = setTimeout(() => {
      referencedTables.forEach(({ table }) => {
        const key = resolveColumnLoadKey(tables, table);
        if (!tableColumns[key] && !isLoadingColumns[key]) {
          setIsLoadingColumns((prev) => ({ ...prev, [key]: true }));
          window.electronAPI
            .getDbTableColumns(activeConnection, key)
            .then((cols) => setTableColumns((prev) => ({ ...prev, [key]: cols || [] })))
            .catch(() => {})
            .finally(() => setIsLoadingColumns((prev) => ({ ...prev, [key]: false })));
        }
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [referencedTables, activeConnection, tables, tableColumns, isLoadingColumns, setIsLoadingColumns, setTableColumns]);

  const computeAutocomplete = (text: string, caret: number) => {
    setAutocomplete(computeAutocompleteState(text, caret, referencedTables, tables, tableColumns));
  };

  const handleSqlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setSql(value);
    computeAutocomplete(value, e.target.selectionStart);
  };

  const applyAutocompleteSuggestion = (label: string) => {
    if (!autocomplete) return;
    const newSql = sql.slice(0, autocomplete.wordStart) + label + sql.slice(autocomplete.wordEnd);
    const caret = autocomplete.wordStart + label.length;
    setSql(newSql);
    setAutocomplete(null);
    requestAnimationFrame(() => {
      const el = sqlTextareaRef.current;
      if (el) {
        el.focus();
        el.selectionStart = el.selectionEnd = caret;
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (autocomplete) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAutocomplete((prev) =>
          prev ? { ...prev, activeIndex: (prev.activeIndex + 1) % prev.suggestions.length } : prev
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAutocomplete((prev) =>
          prev
            ? { ...prev, activeIndex: (prev.activeIndex - 1 + prev.suggestions.length) % prev.suggestions.length }
            : prev
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applyAutocompleteSuggestion(autocomplete.suggestions[autocomplete.activeIndex].label);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setAutocomplete(null);
        return;
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onExecuteSql();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newSql = sql.substring(0, start) + '  ' + sql.substring(end);
      setSql(newSql);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Atraso para o clique na sugestão (onMouseDown) ser processado antes de fechar a lista
  const dismissAutocompleteDelayed = () => {
    setTimeout(() => setAutocomplete(null), 150);
  };

  return {
    autocomplete,
    computeAutocomplete,
    handleSqlChange,
    handleKeyDown,
    applyAutocompleteSuggestion,
    dismissAutocompleteDelayed
  };
}
