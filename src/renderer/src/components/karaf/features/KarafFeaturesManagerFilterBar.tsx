import React from 'react';
import { Search, RefreshCw, Plus, X } from 'lucide-react';
import type {
  KarafFeaturesManagerTab,
  KarafFeatureFilterMode
} from '../../../hooks/karaf/useKarafFeaturesManager';

interface KarafFeaturesManagerFilterBarProps {
  activeTab: KarafFeaturesManagerTab;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  featureFilterMode: KarafFeatureFilterMode;
  onFilterModeChange: (mode: KarafFeatureFilterMode) => void;
  featuresCount: number;
  actionInProgress: string | null;
  onRefreshAll: () => void;
  onToggleAddRepo: () => void;
}

const filterButtonClass = (active: boolean) =>
  `px-2.5 py-1 rounded text-2xs font-semibold transition-colors cursor-pointer ${
    active
      ? 'bg-card text-foreground border border-border shadow-2xs'
      : 'text-muted-foreground hover:text-foreground'
  }`;

export const KarafFeaturesManagerFilterBar: React.FC<KarafFeaturesManagerFilterBarProps> = ({
  activeTab,
  searchQuery,
  onSearchChange,
  featureFilterMode,
  onFilterModeChange,
  featuresCount,
  actionInProgress,
  onRefreshAll,
  onToggleAddRepo
}) => (
  <div className="p-3 bg-muted/10 border-b border-border/60 flex flex-wrap items-center justify-between gap-2.5">
    <div className="relative flex-1 min-w-[240px]">
      <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
      <input
        type="text"
        placeholder={
          activeTab === 'features'
            ? 'Buscar por nome, namespace ou versão...'
            : 'Buscar por nome ou coordenada maven:...'
        }
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full bg-background border border-border rounded-md pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:border-primary transition-colors font-mono"
      />
      {searchQuery && (
        <button
          onClick={() => onSearchChange('')}
          className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>

    {activeTab === 'features' && (
      <div className="flex items-center space-x-1 bg-muted/40 border border-border/80 rounded-md p-0.5 text-xs font-mono">
        <button
          onClick={() => onFilterModeChange('winthor')}
          className={filterButtonClass(featureFilterMode === 'winthor')}
        >
          WinThor / TOTVS
        </button>
        <button
          onClick={() => onFilterModeChange('installed')}
          className={filterButtonClass(featureFilterMode === 'installed')}
        >
          Instaladas
        </button>
        <button
          onClick={() => onFilterModeChange('all')}
          className={filterButtonClass(featureFilterMode === 'all')}
        >
          Todas ({featuresCount})
        </button>
      </div>
    )}

    {activeTab === 'repos' && (
      <div className="flex items-center space-x-2">
        <button
          onClick={onRefreshAll}
          disabled={actionInProgress !== null}
          className="px-2.5 py-1.5 rounded-md text-xs font-mono font-semibold flex items-center space-x-1.5 transition-colors bg-card hover:bg-muted border border-border text-foreground cursor-pointer disabled:opacity-50"
          title="Recarregar todos os repositórios (feature:repo-refresh)"
        >
          <RefreshCw className="w-3 h-3 text-muted-foreground" />
          <span>Atualizar Todos</span>
        </button>

        <button
          onClick={onToggleAddRepo}
          className="px-3 py-1.5 rounded-md text-xs font-mono font-semibold flex items-center space-x-1.5 transition-colors bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Novo Repositório</span>
        </button>
      </div>
    )}
  </div>
);
