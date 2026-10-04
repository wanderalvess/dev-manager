import React from 'react';
import { Search, X } from 'lucide-react';

interface LogsSearchControlsProps {
  searchInputRef: React.RefObject<HTMLInputElement>;
  filterText: string;
  isRegex: boolean;
  isCaseSensitive: boolean;
  invertFilter: boolean;
  onFilterTextChange: (value: string) => void;
  onToggleCaseSensitive: () => void;
  onToggleRegex: () => void;
  onToggleInvert: () => void;
}

export const LogsSearchControls: React.FC<LogsSearchControlsProps> = ({
  searchInputRef,
  filterText,
  isRegex,
  isCaseSensitive,
  invertFilter,
  onFilterTextChange,
  onToggleCaseSensitive,
  onToggleRegex,
  onToggleInvert
}) => (
  <div className="flex items-center space-x-1.5 flex-1 min-w-[260px] max-w-sm">
    <div className="relative flex-1">
      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={searchInputRef}
        data-tour="campo-busca-logs"
        type="text"
        value={filterText}
        onChange={(e) => onFilterTextChange(e.target.value)}
        placeholder="Buscar (Ctrl+F)..."
        className="w-full pl-8 pr-7 py-1 bg-background border border-border/80 rounded-lg text-xs font-mono focus:outline-none focus:border-primary transition-colors"
      />
      {filterText && (
        <button
          onClick={() => onFilterTextChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          title="Limpar busca"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>

    <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/60 text-[10px] font-mono">
      <button
        onClick={onToggleCaseSensitive}
        className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
          isCaseSensitive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
        }`}
        title="Diferenciar Maiúsculas / Minúsculas"
      >
        Aa
      </button>
      <button
        onClick={onToggleRegex}
        className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
          isRegex ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
        }`}
        title="Expressão Regular (Regex)"
      >
        .*
      </button>
      <button
        onClick={onToggleInvert}
        className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
          invertFilter ? 'bg-amber-500 text-black' : 'text-muted-foreground hover:text-foreground'
        }`}
        title="Inverter Filtro (Excluir correspondências)"
      >
        !
      </button>
    </div>
  </div>
);
