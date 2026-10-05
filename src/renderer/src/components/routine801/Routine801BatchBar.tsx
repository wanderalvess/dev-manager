import React from 'react';
import { Server, Download, RotateCw } from 'lucide-react';
import type { Routine801Tab } from '../../utils/routine801ModalUtils';

interface Routine801BatchBarProps {
  selectedCount: number;
  activeTab: Routine801Tab;
  isExecuting: boolean;
  batchVersionOverride: string;
  onChangeVersionOverride: (value: string) => void;
  onClearSelection: () => void;
  onRegisterRepos: () => void;
  onInstall: () => void;
}

export const Routine801BatchBar: React.FC<Routine801BatchBarProps> = ({
  selectedCount,
  activeTab,
  isExecuting,
  batchVersionOverride,
  onChangeVersionOverride,
  onClearSelection,
  onRegisterRepos,
  onInstall
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-2.5 bg-primary/10 border-t border-primary/30 text-xs shrink-0 animate-in slide-in-from-bottom-2 duration-150">
    <div className="flex items-center gap-3 flex-wrap">
      <span className="font-semibold text-foreground">
        {selectedCount} artefato(s) selecionado(s)
      </span>
      <button
        onClick={onClearSelection}
        className="text-muted-foreground hover:text-foreground underline text-xs"
      >
        Limpar seleção
      </button>

      {/* Opção para forçar versão específica na seleção em lote */}
      <div className="flex items-center gap-1.5 border-l border-border/80 pl-3">
        <span className="text-muted-foreground text-[11px] whitespace-nowrap">Versão Alvo:</span>
        <input
          type="text"
          value={batchVersionOverride}
          onChange={(e) => onChangeVersionOverride(e.target.value)}
          placeholder="Original ou ex: 1.38.0.0"
          className="px-2 py-0.5 text-xs bg-background border border-input rounded text-foreground font-mono placeholder:text-muted-foreground/60 w-36 focus:outline-none focus:ring-1 focus:ring-primary"
          title="Se informado, sobrescreve a versão de todos os itens selecionados ao executar"
        />
      </div>
    </div>

    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={onRegisterRepos}
        disabled={isExecuting}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-card hover:bg-muted text-foreground transition-colors disabled:opacity-50"
        title="Apenas adiciona os repositórios Maven no Karaf (feature:repo-add) sem instalar"
      >
        <Server className="w-3.5 h-3.5 text-primary" />
        <span>Registrar Repositórios ({selectedCount})</span>
      </button>

      <button
        onClick={onInstall}
        disabled={isExecuting}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm transition-colors ${
          activeTab === 'updates'
            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
            : 'bg-primary hover:opacity-90 text-primary-foreground'
        } disabled:opacity-50`}
      >
        {activeTab === 'updates' ? <RotateCw className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
        <span>
          {activeTab === 'updates'
            ? `Atualizar ${selectedCount} no Karaf`
            : `Instalar ${selectedCount} no Karaf`}
        </span>
      </button>
    </div>
  </div>
);
