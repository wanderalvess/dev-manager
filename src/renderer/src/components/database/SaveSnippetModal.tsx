import React from 'react';
import { BookmarkPlus } from 'lucide-react';

export interface SaveSnippetModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSnippetId: string | null;
  snippetTitle: string;
  setSnippetTitle: (val: string) => void;
  snippetCategory: string;
  setSnippetCategory: (val: string) => void;
  snippetDesc: string;
  setSnippetDesc: (val: string) => void;
  snippetSql: string;
  setSnippetSql: (val: string) => void;
  onSave: (e: React.FormEvent) => void;
}

export const SaveSnippetModal: React.FC<SaveSnippetModalProps> = ({
  isOpen,
  onClose,
  editingSnippetId,
  snippetTitle,
  setSnippetTitle,
  snippetCategory,
  setSnippetCategory,
  snippetDesc,
  setSnippetDesc,
  snippetSql,
  setSnippetSql,
  onSave
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in flex flex-col font-sans">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
          <div className="flex items-center space-x-2">
            <BookmarkPlus className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-foreground">
              {editingSnippetId ? 'Editar Consulta Salva' : 'Salvar Nova Consulta'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
        <form onSubmit={onSave} className="p-4 space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-foreground mb-1">Título da Consulta *</label>
            <input
              type="text"
              required
              placeholder="Ex: Consulta de Clientes Ativos"
              value={snippetTitle}
              onChange={(e) => setSnippetTitle(e.target.value)}
              className="w-full bg-background border border-border rounded-md p-2 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-sans"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-foreground mb-1">Categoria / Pasta</label>
              <input
                type="text"
                placeholder="Ex: Vendas, Auditoria, Relatórios"
                value={snippetCategory}
                onChange={(e) => setSnippetCategory(e.target.value)}
                className="w-full bg-background border border-border rounded-md p-2 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-sans"
              />
            </div>
            <div>
              <label className="block font-bold text-foreground mb-1">Descrição (opcional)</label>
              <input
                type="text"
                placeholder="Ex: Filtra por filial e status"
                value={snippetDesc}
                onChange={(e) => setSnippetDesc(e.target.value)}
                className="w-full bg-background border border-border rounded-md p-2 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-sans"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-foreground">Comando SQL *</label>
              <span className="text-2xs text-muted-foreground">Você pode ajustar a query livremente</span>
            </div>
            <textarea
              required
              rows={5}
              value={snippetSql}
              onChange={(e) => setSnippetSql(e.target.value)}
              placeholder="SELECT * FROM ..."
              className="w-full bg-[#0B0F17] text-emerald-300 font-mono text-xs p-2.5 rounded-md border border-border/80 focus:outline-hidden focus:ring-1 focus:ring-primary resize-y"
              spellCheck={false}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-border/70 text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>{editingSnippetId ? 'Atualizar Consulta' : 'Salvar Consulta'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
