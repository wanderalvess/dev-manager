import React from 'react';
import { Play, FileCode, Edit2, Trash2 } from 'lucide-react';
import type { SqlSnippet } from '../../../../../shared/types';
import { DEFAULT_SQL_SNIPPETS } from '../../../utils/sqlEditorSnippets';

interface SqlSnippetsSectionsProps {
  filteredCustomSnippets: SqlSnippet[];
  savedQuerySearch: string;
  onCloseMenu: () => void;
  onOpenCreateSnippet: (initialSql?: string) => void;
  onSelectSnippet: (snippet: SqlSnippet) => void;
  onExecuteSnippetDirectly: (snippet: SqlSnippet, e?: React.MouseEvent) => void;
  onEditSnippet: (snippet: SqlSnippet, e?: React.MouseEvent) => void;
  onDeleteSnippet: (id: string, e?: React.MouseEvent) => void;
}

export const SqlSnippetsSections: React.FC<SqlSnippetsSectionsProps> = ({
  filteredCustomSnippets,
  savedQuerySearch,
  onCloseMenu,
  onOpenCreateSnippet,
  onSelectSnippet,
  onExecuteSnippetDirectly,
  onEditSnippet,
  onDeleteSnippet
}) => (
  <div className="max-h-80 overflow-y-auto space-y-2 pr-0.5">
    {/* Seção: Minhas Consultas Salvas */}
    <div>
      <div className="text-2xs font-bold text-amber-500 uppercase tracking-wider px-1 mb-1">
        Minhas Consultas ({filteredCustomSnippets.length})
      </div>

      {filteredCustomSnippets.length === 0 ? (
        <div className="p-3 text-center bg-muted/20 border border-dashed border-border rounded-lg text-muted-foreground text-[11px] space-y-1.5">
          <p>
            {savedQuerySearch
              ? 'Nenhuma consulta salva encontrada para a busca.'
              : 'Nenhuma consulta personalizada salva ainda.'}
          </p>
          {!savedQuerySearch && (
            <button
              type="button"
              onClick={() => {
                onCloseMenu();
                onOpenCreateSnippet();
              }}
              className="text-primary hover:underline font-bold text-[11px] block mx-auto cursor-pointer"
            >
              + Salvar consulta atual do editor
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {filteredCustomSnippets.map((s) => (
            <div
              key={s.id}
              className="p-2 rounded-lg bg-card/60 hover:bg-muted/60 border border-border/60 hover:border-amber-500/40 transition flex flex-col space-y-1.5 group"
            >
              <div className="flex items-start justify-between gap-1.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-1.5 flex-wrap">
                    <span className="font-bold text-xs text-foreground group-hover:text-primary transition truncate">
                      {s.title}
                    </span>
                    <span className="text-2xs px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold shrink-0">
                      {s.category || 'Geral'}
                    </span>
                  </div>
                  {s.description && (
                    <span className="text-2xs text-muted-foreground line-clamp-1 mt-0.5 block">
                      {s.description}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => onExecuteSnippetDirectly(s, e)}
                    className="p-1 rounded bg-emerald-600/15 hover:bg-emerald-600 text-emerald-500 hover:text-white transition cursor-pointer"
                    title="Executar imediatamente"
                  >
                    <Play className="w-3 h-3 fill-current" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectSnippet(s)}
                    className="p-1 rounded bg-primary/15 hover:bg-primary text-primary hover:text-primary-foreground transition cursor-pointer"
                    title="Carregar no editor"
                  >
                    <FileCode className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      onCloseMenu();
                      onEditSnippet(s, e);
                    }}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                    title="Editar consulta salva"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => onDeleteSnippet(s.id, e)}
                    className="p-1 rounded text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                    title="Excluir consulta"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <pre className="text-2xs font-mono text-emerald-400/80 bg-[#0B0F17] p-1.5 rounded truncate max-h-12 overflow-hidden border border-border/40 select-none">
                {s.sql}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Seção: Modelos de Diagnóstico do Sistema */}
    <div className="pt-2 border-t border-border/50">
      <div className="text-2xs font-bold text-muted-foreground uppercase tracking-wider px-1 mb-1">
        Modelos de Diagnóstico
      </div>
      <div className="space-y-1">
        {DEFAULT_SQL_SNIPPETS.map((s) => (
          <div
            key={s.id}
            onClick={() => onSelectSnippet(s)}
            className="w-full text-left p-2 rounded-lg hover:bg-muted/70 text-foreground transition flex items-center justify-between group border border-transparent hover:border-border cursor-pointer"
          >
            <div className="min-w-0 flex-1 mr-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] group-hover:text-primary truncate">{s.title}</span>
                <span className="text-2xs px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-mono shrink-0">
                  {s.category.split('-')[0].trim()}
                </span>
              </div>
              {s.description && (
                <span className="text-2xs text-muted-foreground line-clamp-1 mt-0.5 block">
                  {s.description}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => onExecuteSnippetDirectly(s, e)}
              className="p-1 rounded hover:bg-emerald-600/20 text-emerald-500 transition shrink-0 opacity-0 group-hover:opacity-100 cursor-pointer"
              title="Executar imediatamente"
            >
              <Play className="w-3 h-3 fill-current" />
            </button>
          </div>
        ))}
      </div>
    </div>
  </div>
);
