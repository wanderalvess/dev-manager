import React, { useMemo, useState } from 'react';
import { EscapeToClose } from '../../ui/EscapeToClose';
import { BookmarkPlus, Plus, X, Search } from 'lucide-react';
import type { SqlSnippet } from '../../../../../shared/types';
import { filterSqlSnippets } from '../../../utils/sqlEditorUtils';
import { SqlSnippetsSections } from './SqlSnippetsSections';

interface SqlSnippetsMenuProps {
  customSnippets: SqlSnippet[];
  onOpenCreateSnippet: (initialSql?: string) => void;
  onSelectSnippet: (snippet: SqlSnippet) => void;
  onExecuteSnippetDirectly: (snippet: SqlSnippet, e?: React.MouseEvent) => void;
  onEditSnippet: (snippet: SqlSnippet, e?: React.MouseEvent) => void;
  onDeleteSnippet: (id: string, e?: React.MouseEvent) => void;
}

export const SqlSnippetsMenu: React.FC<SqlSnippetsMenuProps> = ({
  customSnippets,
  onOpenCreateSnippet,
  onSelectSnippet,
  onExecuteSnippetDirectly,
  onEditSnippet,
  onDeleteSnippet
}) => {
  const [showSnippetsMenu, setShowSnippetsMenu] = useState<boolean>(false);
  const [savedQuerySearch, setSavedQuerySearch] = useState<string>('');

  const filteredCustomSnippets = useMemo(
    () => filterSqlSnippets(customSnippets, savedQuerySearch),
    [customSnippets, savedQuerySearch]
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setSavedQuerySearch('');
          setShowSnippetsMenu((prev) => !prev);
        }}
        className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition shadow-2xs cursor-pointer ${
          showSnippetsMenu
            ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40'
            : 'bg-card hover:bg-muted border border-border/70 text-foreground'
        }`}
        title="Minhas consultas SQL salvas e modelos"
      >
        <BookmarkPlus className="w-3.5 h-3.5 text-amber-500" />
        <span>Consultas Salvas</span>
        {customSnippets.length > 0 && (
          <span className="px-1.5 py-0.2 rounded-full text-2xs font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400">
            {customSnippets.length}
          </span>
        )}
      </button>

      {showSnippetsMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowSnippetsMenu(false)} />
          <EscapeToClose onEscape={() => setShowSnippetsMenu(false)} />
          <div className="absolute right-0 mt-1 w-96 bg-card border border-border rounded-xl shadow-2xl z-50 p-2.5 space-y-2 text-xs animate-fade-in font-sans">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div className="flex items-center space-x-1.5">
                <BookmarkPlus className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-xs text-foreground">Consultas Salvas</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowSnippetsMenu(false);
                    onOpenCreateSnippet();
                  }}
                  className="flex items-center space-x-1 px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-black rounded text-2xs font-bold transition cursor-pointer"
                  title="Salvar consulta atual do editor"
                >
                  <Plus className="w-3 h-3" />
                  <span>Nova</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSnippetsMenu(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Campo de Busca em Consultas Salvas */}
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={savedQuerySearch}
                onChange={(e) => setSavedQuerySearch(e.target.value)}
                placeholder="Buscar por nome, categoria ou comando..."
                className="w-full pl-7 pr-6 py-1 bg-background border border-border rounded text-2xs text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-1 focus:ring-primary font-sans"
                autoFocus
              />
              {savedQuerySearch && (
                <button
                  type="button"
                  onClick={() => setSavedQuerySearch('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <SqlSnippetsSections
              filteredCustomSnippets={filteredCustomSnippets}
              savedQuerySearch={savedQuerySearch}
              onCloseMenu={() => setShowSnippetsMenu(false)}
              onOpenCreateSnippet={onOpenCreateSnippet}
              onSelectSnippet={onSelectSnippet}
              onExecuteSnippetDirectly={onExecuteSnippetDirectly}
              onEditSnippet={onEditSnippet}
              onDeleteSnippet={onDeleteSnippet}
            />
          </div>
        </>
      )}
    </div>
  );
};
