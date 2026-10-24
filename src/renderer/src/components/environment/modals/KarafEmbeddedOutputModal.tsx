import React from 'react';
import { History, RefreshCw, X } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { LogPre } from '../../ui/LogPre';

interface KarafEmbeddedOutputModalProps {
  output: string;
  filtered: string;
  search: string;
  isLoading: boolean;
  onSearchChange: (value: string) => void;
  onClear: () => void;
  onClose: () => void;
}

/** Modal da saída persistida do Karaf embedded (log bruto, não o histórico de deploys), com filtro por linha. */
export const KarafEmbeddedOutputModal: React.FC<KarafEmbeddedOutputModalProps> = ({
  output,
  filtered,
  search,
  isLoading,
  onSearchChange,
  onClear,
  onClose
}) => (
  <Modal
    open
    onClose={onClose}
    bare
    panelClassName="bg-card border border-border rounded-xl shadow-lg w-full max-w-2xl overflow-hidden animate-fade-in flex flex-col max-h-[80vh]"
    closeOnBackdrop={false}
    ariaLabel="Histórico do Karaf Embedded"
  >
    <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
      <div className="flex items-center space-x-2">
        <History className="w-4 h-4 text-info" />
        <h3 className="text-sm font-bold text-foreground">Histórico do Karaf Embedded</h3>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onClear}
          className="px-2.5 py-1 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg text-2xs font-bold transition"
        >
          Limpar
        </button>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
    {output && (
      <div className="px-4 pt-3 shrink-0">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filtrar linhas do histórico..."
          className="w-full bg-background border border-input rounded-[10px] px-3 py-2.5 text-sm text-foreground focus:outline-hidden"
        />
      </div>
    )}
    <div className="p-4 overflow-y-auto flex-1">
      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-xs gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /> Carregando histórico...
        </div>
      ) : output ? (
        filtered ? (
          <LogPre text={filtered} wrap className="text-foreground" />
        ) : (
          <p className="text-xs text-muted-foreground text-center py-8">
            Nenhuma linha corresponde ao filtro "{search}".
          </p>
        )
      ) : (
        <p className="text-xs text-muted-foreground text-center py-8">
          Nenhum log persistido ainda. Inicie o console Karaf embedded para começar a acumular histórico.
        </p>
      )}
    </div>
  </Modal>
);
