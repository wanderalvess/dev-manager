import React from 'react';
import { Search, X } from 'lucide-react';

interface RoutinesFilterBarProps {
  searchTerm: string;
  selectedModule: string;
  modules: string[];
  filteredCount: number;
  routinesCount: number;
  onSearchChange: (value: string) => void;
  onModuleChange: (value: string) => void;
}

export const RoutinesFilterBar: React.FC<RoutinesFilterBarProps> = ({
  searchTerm,
  selectedModule,
  modules,
  filteredCount,
  routinesCount,
  onSearchChange,
  onModuleChange
}) => (
  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60">
    <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
      <div className="relative flex-1 min-w-[240px]" data-tour="busca-rotina">
        <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3.5 top-2.5" />
        <input
          type="text"
          placeholder="Buscar rotina por número ou nome..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-card border border-border/80 rounded-xl pl-9 pr-9 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-mono shadow-2xs"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Limpar busca" aria-label="Limpar busca"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center space-x-2" data-tour="filtro-modulo">
        <span className="text-xs text-muted-foreground font-medium hidden sm:inline">Módulo:</span>
        <select
          value={selectedModule}
          onChange={(e) => onModuleChange(e.target.value)}
          className="bg-card border border-border/80 rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-mono cursor-pointer shadow-2xs"
        >
          {modules.map((m) => (
            <option key={m} value={m} className="bg-card text-foreground">
              {m}
            </option>
          ))}
        </select>
      </div>

      {(searchTerm || selectedModule !== 'TODOS') && (
        <button
          type="button"
          onClick={() => {
            onSearchChange('');
            onModuleChange('TODOS');
          }}
          className="px-2 py-1 rounded-lg text-2xs font-mono font-bold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors flex items-center gap-1 cursor-pointer"
          title="Limpar todos os filtros"
        >
          <X className="w-3 h-3" />
          <span>Limpar filtros</span>
        </button>
      )}
    </div>

    <div className="flex items-center gap-2 text-2xs font-mono text-muted-foreground shrink-0">
      <span>
        Exibindo <b className="text-foreground">{filteredCount}</b> de{' '}
        <b className="text-foreground">{routinesCount}</b> rotinas
      </span>
    </div>
  </div>
);
