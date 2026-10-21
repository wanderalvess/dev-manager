import React from 'react';
import { LogFontSize } from './LogLine';
import { LogSearchMode, LogContextLines } from '../../utils/logsSearchUtils';

interface LogsFooterProps {
  visibleCount: number;
  totalCount: number;
  filterText: string;
  invertFilter: boolean;
  searchMode?: LogSearchMode;
  matchCount?: number;
  contextLines?: LogContextLines;
  fontSize: LogFontSize;
  initialLinesCount: number;
  onFontSizeChange: (size: LogFontSize) => void;
  onInitialLinesChange: (count: number) => void;
}

const FONT_OPTIONS: { size: LogFontSize; label: string }[] = [
  { size: 'xs', label: 'P' },
  { size: 'sm', label: 'M' },
  { size: 'base', label: 'G' }
];

export const LogsFooter: React.FC<LogsFooterProps> = ({
  visibleCount,
  totalCount,
  filterText,
  invertFilter,
  searchMode = 'find',
  matchCount = 0,
  contextLines = 0,
  fontSize,
  initialLinesCount,
  onFontSizeChange,
  onInitialLinesChange
}) => (
  <div className="bg-card border-t border-border/80 px-3.5 py-1 flex items-center justify-between text-2xs text-muted-foreground font-mono shrink-0 select-none">
    <div className="flex items-center space-x-3">
      <span>
        Linhas exibidas: <strong className="text-foreground">{visibleCount}</strong> / {totalCount}
      </span>
      {filterText && (
        <span className="text-warning truncate max-w-sm">
          {searchMode === 'find'
            ? `Localizar: "${filterText}" (${matchCount} ocorrência${matchCount === 1 ? '' : 's'})`
            : `Filtro: "${filterText}" ${invertFilter ? '(invertido)' : ''} ${
                contextLines > 0 ? `(±${contextLines} linhas de contexto)` : ''
              }`}
        </span>
      )}
    </div>

    <div className="flex items-center space-x-3">
      {/* Tamanho da Fonte */}
      <div className="flex items-center space-x-1">
        <span>Fonte:</span>
        {FONT_OPTIONS.map(({ size, label }) => (
          <button
            key={size}
            onClick={() => onFontSizeChange(size)}
            className={`px-1.5 py-0.5 rounded text-2xs ${
              fontSize === size ? 'bg-muted text-white font-bold' : 'hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Carga Inicial de Linhas */}
      <div className="flex items-center space-x-1 border-l border-border pl-3">
        <span>Buffer inicial:</span>
        <select
          value={initialLinesCount}
          onChange={(e) => onInitialLinesChange(Number(e.target.value))}
          className="bg-card border border-border rounded px-1.5 py-0.5 text-muted-foreground text-2xs focus:outline-hidden"
        >
          <option value={100}>100 linhas</option>
          <option value={300}>300 linhas</option>
          <option value={500}>500 linhas</option>
          <option value={1000}>1000 linhas</option>
          <option value={2000}>2000 linhas</option>
        </select>
      </div>
    </div>
  </div>
);
