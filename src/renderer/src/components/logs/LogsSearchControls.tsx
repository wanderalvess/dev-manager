import React from 'react';
import { Search, X, ChevronUp, ChevronDown, Filter, Locate } from 'lucide-react';
import { LogSearchMode, LogContextLines } from '../../utils/logsSearchUtils';

interface LogsSearchControlsProps {
  searchInputRef: React.RefObject<HTMLInputElement>;
  filterText: string;
  isRegex: boolean;
  isCaseSensitive: boolean;
  invertFilter: boolean;
  searchMode: LogSearchMode;
  contextLines: LogContextLines;
  currentMatchPosition: number;
  totalMatches: number;
  onFilterTextChange: (value: string) => void;
  onToggleCaseSensitive: () => void;
  onToggleRegex: () => void;
  onToggleInvert: () => void;
  onSearchModeChange: (mode: LogSearchMode) => void;
  onContextLinesChange: (lines: LogContextLines) => void;
  onNavigateMatch: (direction: 'next' | 'prev') => void;
  onClearSearch: () => void;
}

const CONTEXT_OPTIONS: LogContextLines[] = [0, 1, 3, 5];

export const LogsSearchControls: React.FC<LogsSearchControlsProps> = ({
  searchInputRef,
  filterText,
  isRegex,
  isCaseSensitive,
  invertFilter,
  searchMode,
  contextLines,
  currentMatchPosition,
  totalMatches,
  onFilterTextChange,
  onToggleCaseSensitive,
  onToggleRegex,
  onToggleInvert,
  onSearchModeChange,
  onContextLinesChange,
  onNavigateMatch,
  onClearSearch
}) => (
  <div className="flex items-center space-x-1.5 flex-1 min-w-[320px] max-w-2xl flex-wrap gap-y-1">
    {/* Campo de Busca + Contador e Navegadores embutidos */}
    <div className="relative flex-1 min-w-[200px] flex items-center">
      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <input
        ref={searchInputRef}
        data-tour="campo-busca-logs"
        type="text"
        value={filterText}
        onChange={(e) => onFilterTextChange(e.target.value)}
        placeholder={searchMode === 'find' ? 'Localizar no log (Ctrl+F)...' : 'Filtrar linhas (Ctrl+F)...'}
        className="w-full pl-8 pr-28 h-9 bg-card border border-input rounded-[10px] text-[13px] font-mono focus:outline-hidden focus:ring-2 focus:ring-ring transition-colors"
      />

      {/* Controles internos do input: Contador + Navegacao + Limpar */}
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center space-x-1 text-2xs font-mono">
        {filterText && (
          <>
            {searchMode === 'find' ? (
              totalMatches > 0 ? (
                <span className="text-amber-400 font-bold px-1 py-0.2 rounded bg-amber-400/10 border border-amber-400/30 tabular-nums">
                  {currentMatchPosition}/{totalMatches}
                </span>
              ) : (
                <span className="text-rose-400 font-semibold px-1 py-0.2 rounded bg-rose-400/10 border border-rose-400/30">
                  0/0
                </span>
              )
            ) : (
              <span className="text-muted-foreground font-semibold px-1 py-0.2 rounded bg-muted/60 tabular-nums">
                {totalMatches} {totalMatches === 1 ? 'lin' : 'lins'}
              </span>
            )}

            {searchMode === 'find' && totalMatches > 0 && (
              <div className="flex items-center space-x-0.5">
                <button
                  type="button"
                  onClick={() => onNavigateMatch('prev')}
                  className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Ocorrência anterior (Shift+Enter)"
                  aria-label="Ocorrência anterior"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateMatch('next')}
                  className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Próxima ocorrência (Enter)"
                  aria-label="Próxima ocorrência"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClearSearch}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Limpar busca (Esc)"
              aria-label="Limpar busca"
            >
              <X className="w-3 h-3" />
            </button>
          </>
        )}
      </div>
    </div>

    {/* Seletor de Modo: Localizar vs Filtrar */}
    <div className="flex items-center bg-muted p-0.5 rounded-[10px] border border-border text-[13px]">
      <button
        type="button"
        onClick={() => onSearchModeChange('find')}
        className={`px-2 py-0.5 rounded flex items-center space-x-1 font-semibold transition-colors cursor-pointer ${
          searchMode === 'find'
            ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        title="Modo Localizar: rola até a ocorrência no log completo mantendo o contexto ao redor"
      >
        <Locate className="w-3 h-3" />
        <span>Localizar</span>
      </button>

      <button
        type="button"
        onClick={() => onSearchModeChange('filter')}
        className={`px-2 py-0.5 rounded flex items-center space-x-1 font-semibold transition-colors cursor-pointer ${
          searchMode === 'filter'
            ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        title="Modo Filtrar: isola somente as linhas correspondentes"
      >
        <Filter className="w-3 h-3" />
        <span>Filtrar</span>
      </button>
    </div>

    {/* Seletor de Contexto (exibido apenas no modo Filtrar) */}
    {searchMode === 'filter' && (
      <div className="flex items-center bg-muted p-0.5 rounded-[10px] border border-border text-[13px]">
        <span className="text-muted-foreground px-1 select-none" title="Linhas de contexto ao redor do match">
          Contexto:
        </span>
        {CONTEXT_OPTIONS.map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onContextLinesChange(num)}
            className={`px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer ${
              contextLines === num
                ? 'bg-primary/20 text-primary border border-primary/40'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title={`Exibir ${num === 0 ? 'somente a linha' : `±${num} linhas de contexto ao redor`}`}
          >
            {num === 0 ? '0' : `±${num}`}
          </button>
        ))}
      </div>
    )}

    {/* Modificadores de Expressão: Inverter, Case sensitive, Regex */}
    <div className="flex items-center bg-muted p-0.5 rounded-[10px] border border-border text-[13px]">
      <button
        type="button"
        onClick={onToggleCaseSensitive}
        className={`px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer ${
          isCaseSensitive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
        }`}
        title="Diferenciar Maiúsculas / Minúsculas (Aa)"
      >
        Aa
      </button>
      <button
        type="button"
        onClick={onToggleRegex}
        className={`px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer ${
          isRegex ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
        }`}
        title="Expressão Regular (.*)"
      >
        .*
      </button>
      {searchMode === 'filter' && (
        <button
          type="button"
          onClick={onToggleInvert}
          className={`px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer ${
            invertFilter ? 'bg-warning text-background' : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Inverter Filtro (! - Excluir correspondências)"
        >
          !
        </button>
      )}
    </div>
  </div>
);
