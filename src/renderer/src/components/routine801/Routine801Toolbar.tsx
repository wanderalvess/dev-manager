import React from 'react';
import { X, Search, Download, RotateCw } from 'lucide-react';
import type { Routine801Tab } from '../../utils/routine801ModalUtils';

interface Routine801ToolbarProps {
  activeTab: Routine801Tab;
  updatesCount: number;
  installsCount: number;
  searchQuery: string;
  typeFilter: string;
  statusFilter: string;
  versionFilter: string;
  versionFamilies: string[];
  filteredCount: number;
  searchInputRef: React.RefObject<HTMLInputElement>;
  onChangeTab: (tab: Routine801Tab) => void;
  onChangeSearch: (value: string) => void;
  onChangeType: (value: string) => void;
  onChangeStatus: (value: string) => void;
  onChangeVersion: (value: string) => void;
  onSelectAllFiltered: () => void;
}

export const Routine801Toolbar: React.FC<Routine801ToolbarProps> = ({
  activeTab,
  updatesCount,
  installsCount,
  searchQuery,
  typeFilter,
  statusFilter,
  versionFilter,
  versionFamilies,
  filteredCount,
  searchInputRef,
  onChangeTab,
  onChangeSearch,
  onChangeType,
  onChangeStatus,
  onChangeVersion,
  onSelectAllFiltered
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-2.5 border-b border-border bg-muted/10 shrink-0">
    {/* Segmented Controls para Abas */}
    <div className="inline-flex p-0.5 rounded-md bg-muted/50 border border-border">
      <button
        onClick={() => onChangeTab('updates')}
        className={`flex items-center gap-2 px-3 py-1 text-xs font-medium rounded transition-all ${
          activeTab === 'updates'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <RotateCw className="w-3.5 h-3.5 text-primary" />
        <span>Atualizações</span>
        <span className="px-1.5 py-0.2 rounded font-mono text-2xs tabular-nums bg-muted text-muted-foreground">
          {updatesCount}
        </span>
      </button>

      <button
        onClick={() => onChangeTab('installs')}
        className={`flex items-center gap-2 px-3 py-1 text-xs font-medium rounded transition-all ${
          activeTab === 'installs'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Download className="w-3.5 h-3.5 text-primary" />
        <span>Instalações</span>
        <span className="px-1.5 py-0.2 rounded font-mono text-2xs tabular-nums bg-muted text-muted-foreground">
          {installsCount}
        </span>
      </button>
    </div>

    {/* Filtros de Busca, Tipo e Status */}
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative min-w-[240px]">
        <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onChangeSearch(e.target.value)}
          placeholder="Buscar por rotina, nome ou módulo..."
          className="w-full pl-8 pr-7 py-1 text-xs bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {searchQuery ? (
          <button
            onClick={() => onChangeSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3" />
          </button>
        ) : (
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1 py-0.2 text-2xs font-mono text-muted-foreground bg-muted/60 border border-border rounded pointer-events-none">
            /
          </kbd>
        )}
      </div>

      <select
        value={typeFilter}
        onChange={(e) => onChangeType(e.target.value)}
        className="px-2.5 py-1 text-xs bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="ALL">Todos os Tipos</option>
        <option value="ROTINA">Apenas Rotinas</option>
        <option value="SERVICO">Apenas Serviços</option>
      </select>

      {/* Dropdown de Versão / Linha de Release */}
      <select
        value={versionFilter}
        onChange={(e) => onChangeVersion(e.target.value)}
        className="px-2.5 py-1 text-xs bg-background border border-input rounded-md text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
        title="Filtrar por linha ou família de versão (ex: 1.39, 1.38, 0.39)"
      >
        <option value="ALL">Todas as Versões</option>
        {versionFamilies.map((fam) => (
          <option key={fam} value={fam}>
            Versão {fam}.x
          </option>
        ))}
      </select>

      {/* Ação rápida para selecionar todos da versão filtrada */}
      {versionFilter !== 'ALL' && filteredCount > 0 && (
        <button
          type="button"
          onClick={onSelectAllFiltered}
          className="px-2 py-0.5 text-[11px] font-mono rounded border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          title={`Selecionar todos os ${filteredCount} artefato(s) da versão ${versionFilter}.x`}
        >
          + Selecionar {filteredCount} da v{versionFilter}.x
        </button>
      )}

      {/* Segmented Controls de Canal (P / H) */}
      <div className="inline-flex p-0.5 rounded-md bg-muted/50 border border-border text-[11px] font-mono">
        <button
          onClick={() => onChangeStatus('ALL')}
          className={`px-2 py-0.5 rounded transition-all ${
            statusFilter === 'ALL'
              ? 'bg-card text-foreground font-medium shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => onChangeStatus('P')}
          className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
            statusFilter === 'P'
              ? 'bg-emerald-500/15 text-emerald-400 font-medium border border-emerald-500/30'
              : 'text-muted-foreground hover:text-emerald-400'
          }`}
          title="Filtrar por Produção [P]"
        >
          <span className="font-bold">P</span> Produção
        </button>
        <button
          onClick={() => onChangeStatus('H')}
          className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
            statusFilter === 'H'
              ? 'bg-amber-500/15 text-amber-400 font-medium border border-amber-500/30'
              : 'text-muted-foreground hover:text-amber-400'
          }`}
          title="Filtrar por Homologação [H]"
        >
          <span className="font-bold">H</span> Homolog.
        </button>
      </div>
    </div>
  </div>
);
