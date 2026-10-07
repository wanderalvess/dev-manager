import React from 'react';
import { ScrollText, X, Plus, FolderOpen, Settings, Trash2 } from 'lucide-react';
import { RealtimeLogSource } from '../../../../../shared/types';
import { Modal } from '../../ui/Modal';

interface ManageLogSourcesModalProps {
  sources: RealtimeLogSource[];
  editingSource: Partial<RealtimeLogSource> | null;
  setEditingSource: React.Dispatch<React.SetStateAction<Partial<RealtimeLogSource> | null>>;
  persistSources: (newSources: RealtimeLogSource[], newActiveId?: string) => Promise<void>;
  onBrowse: () => void;
  onSave: () => void;
  onClose: () => void;
}

export const ManageLogSourcesModal: React.FC<ManageLogSourcesModalProps> = ({
  sources,
  editingSource,
  setEditingSource,
  persistSources,
  onBrowse,
  onSave,
  onClose
}) => (
  <Modal
    open
    onClose={onClose}
    bare
    panelClassName="bg-card border border-border/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
    closeOnBackdrop={false}
    closeOnEscape={false}
    ariaLabel="Gerenciar Fontes de Log"
  >
    <div className="px-5 py-4 border-b border-border/70 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <ScrollText className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-sm text-foreground">Gerenciar Fontes de Log</h3>
      </div>
      <button
        onClick={() => {
          onClose();
          setEditingSource(null);
        }}
        className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>

    <div className="p-5 overflow-y-auto space-y-4 flex-1">
      {/* Formulário de Adicionar / Editar */}
      <div className="bg-muted/40 border border-border/60 rounded-xl p-4 space-y-3">
        <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5 text-primary" />
          {editingSource?.id ? 'Editar Fonte de Log' : 'Cadastrar Nova Fonte de Log'}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Nome de Exibição</label>
            <input
              type="text"
              value={editingSource?.name || ''}
              onChange={(e) => setEditingSource((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: API Backend, Serviço de Integração..."
              className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-hidden focus:border-primary"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Codificação (Encoding)</label>
            <select
              value={editingSource?.encoding || 'utf-8'}
              onChange={(e) => setEditingSource((prev) => ({ ...prev, encoding: e.target.value as any }))}
              className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-hidden focus:border-primary"
            >
              <option value="utf-8">UTF-8 (Padrão)</option>
              <option value="latin1">Latin1 / ISO-8859-1 (Delphi legada)</option>
              <option value="windows-1252">Windows-1252 (ANSI)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Caminho do Arquivo de Log</label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={editingSource?.filePath || ''}
              onChange={(e) => setEditingSource((prev) => ({ ...prev, filePath: e.target.value }))}
              placeholder="Ex: C:\meu-servico\logs\saida.log"
              className="flex-1 px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-mono focus:outline-hidden focus:border-primary"
            />
            <button
              type="button"
              onClick={onBrowse}
              className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg text-xs font-semibold flex items-center space-x-1 shrink-0 transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Procurar...</span>
            </button>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          {editingSource && (
            <button
              onClick={() => setEditingSource(null)}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={onSave}
            disabled={!editingSource?.name || !editingSource?.filePath}
            className="px-4 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg text-xs disabled:opacity-50 transition-colors"
          >
            Salvar Fonte
          </button>
        </div>
      </div>

      {/* Lista de Fontes Cadastradas */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Fontes Configuradas</h4>
        <div className="space-y-2">
          {sources.map((src) => (
            <div
              key={src.id}
              className="bg-card border border-border/80 rounded-xl p-3 flex items-center justify-between hover:border-border transition-colors gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-xs text-foreground">{src.name}</span>
                  <span className="text-2xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                    {src.encoding || 'utf-8'}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground font-mono truncate mt-0.5" title={src.filePath}>
                  {src.filePath}
                </p>
              </div>

              <div className="flex items-center space-x-1.5 shrink-0">
                <button
                  onClick={() => setEditingSource(src)}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
                  title="Editar"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
                {sources.length > 1 && (
                  <button
                    onClick={() => {
                      const updated = sources.filter((s) => s.id !== src.id);
                      persistSources(updated, updated[0].id);
                    }}
                    className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-500/10"
                    title="Remover"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {sources.length > 0 && (
        <div className="pt-2 flex justify-between items-center text-xs text-muted-foreground">
          <button
            onClick={() => {
              if (confirm('Remover todas as fontes de log configuradas?')) {
                persistSources([], '');
              }
            }}
            className="hover:text-foreground text-[11px] underline"
          >
            Remover Todas as Fontes
          </button>
        </div>
      )}
    </div>

    <div className="px-5 py-3 border-t border-border/70 flex justify-end bg-card">
      <button
        onClick={onClose}
        className="px-4 py-1.5 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-lg text-xs transition-colors"
      >
        Fechar
      </button>
    </div>
  </Modal>
);
