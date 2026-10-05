import React, { useState } from 'react';
import type { DatabaseConnectionConfig, SqlSnippet } from '../../../../shared/types';

interface UseDatabaseSnippetsParams {
  customSnippets: SqlSnippet[];
  setCustomSnippets: React.Dispatch<React.SetStateAction<SqlSnippet[]>>;
  sql: string;
  setSql: React.Dispatch<React.SetStateAction<string>>;
  activeConnection: DatabaseConnectionConfig | null;
  executeSql: (customSql?: string) => void;
}

const DEFAULT_CATEGORY = 'Minhas Consultas';

/** Estado inicial das consultas salvas (localStorage); o hook de conexões pode sobrescrever via settings. */
export function readStoredSnippets(): SqlSnippet[] {
  try {
    const saved = localStorage.getItem('devManager:customSnippets');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

/** Consultas salvas pelo desenvolvedor: modal de edição, persistência e atalhos de execução. */
export function useDatabaseSnippets({
  customSnippets,
  setCustomSnippets,
  sql,
  setSql,
  activeConnection,
  executeSql
}: UseDatabaseSnippetsParams) {
  const [isSaveSnippetModalOpen, setIsSaveSnippetModalOpen] = useState<boolean>(false);
  const [editingSnippetId, setEditingSnippetId] = useState<string | null>(null);
  const [snippetTitle, setSnippetTitle] = useState<string>('');
  const [snippetCategory, setSnippetCategory] = useState<string>(DEFAULT_CATEGORY);
  const [snippetDesc, setSnippetDesc] = useState<string>('');
  const [snippetSql, setSnippetSql] = useState<string>('');

  const saveSnippets = async (newSnippets: SqlSnippet[]) => {
    setCustomSnippets(newSnippets);
    try {
      localStorage.setItem('devManager:customSnippets', JSON.stringify(newSnippets));
    } catch {
      // Ignore storage errors
    }
    if (window.electronAPI?.saveSettings) {
      await window.electronAPI.saveSettings({ savedSqlSnippets: newSnippets });
    }
  };

  const handleOpenCreateSnippet = (initialSql?: string) => {
    setEditingSnippetId(null);
    setSnippetTitle('');
    setSnippetCategory(DEFAULT_CATEGORY);
    setSnippetDesc('');
    setSnippetSql((initialSql ?? sql).trim());
    setIsSaveSnippetModalOpen(true);
  };

  const handleOpenEditSnippet = (snip: SqlSnippet, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingSnippetId(snip.id);
    setSnippetTitle(snip.title);
    setSnippetCategory(snip.category || DEFAULT_CATEGORY);
    setSnippetDesc(snip.description || '');
    setSnippetSql(snip.sql);
    setIsSaveSnippetModalOpen(true);
  };

  const handleSaveCustomSnippet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!snippetTitle.trim() || !snippetSql.trim()) return;

    if (editingSnippetId) {
      const updated = customSnippets.map((s) =>
        s.id === editingSnippetId
          ? {
              ...s,
              title: snippetTitle.trim(),
              category: snippetCategory.trim() || DEFAULT_CATEGORY,
              description: snippetDesc.trim() || undefined,
              sql: snippetSql.trim()
            }
          : s
      );
      await saveSnippets(updated);
    } else {
      const newSnip: SqlSnippet = {
        id: `custom_${Date.now()}`,
        title: snippetTitle.trim(),
        category: snippetCategory.trim() || DEFAULT_CATEGORY,
        description: snippetDesc.trim() || undefined,
        sql: snippetSql.trim(),
        dbType: activeConnection?.type || 'all'
      };
      await saveSnippets([newSnip, ...customSnippets]);
    }

    setIsSaveSnippetModalOpen(false);
    setEditingSnippetId(null);
    setSnippetTitle('');
    setSnippetDesc('');
    setSnippetSql('');
  };

  const handleDeleteCustomSnippet = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm('Deseja excluir esta consulta salva?')) {
      const updated = customSnippets.filter((s) => s.id !== id);
      await saveSnippets(updated);
    }
  };

  const handleSelectSnippet = (snip: SqlSnippet) => {
    setSql(snip.sql);
  };

  const handleExecuteSnippetDirectly = (snip: SqlSnippet, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const clean = snip.sql.trim().replace(/;+\s*$/, '');
    setSql(clean);
    executeSql(clean);
  };

  return {
    isSaveSnippetModalOpen,
    setIsSaveSnippetModalOpen,
    editingSnippetId,
    snippetTitle,
    setSnippetTitle,
    snippetCategory,
    setSnippetCategory,
    snippetDesc,
    setSnippetDesc,
    snippetSql,
    setSnippetSql,
    handleOpenCreateSnippet,
    handleOpenEditSnippet,
    handleSaveCustomSnippet,
    handleDeleteCustomSnippet,
    handleSelectSnippet,
    handleExecuteSnippetDirectly
  };
}
