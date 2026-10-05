import React from 'react';
import { LogFontSize } from './LogLine';

interface LogsFooterProps {
  visibleCount: number;
  totalCount: number;
  filterText: string;
  invertFilter: boolean;
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
  fontSize,
  initialLinesCount,
  onFontSizeChange,
  onInitialLinesChange
}) => (
  <div className="bg-[#080D18] border-t border-slate-800/80 px-3.5 py-1 flex items-center justify-between text-[11px] text-slate-400 font-mono shrink-0 select-none">
    <div className="flex items-center space-x-3">
      <span>
        Linhas: <strong className="text-slate-200">{visibleCount}</strong> / {totalCount}
      </span>
      {filterText && (
        <span className="text-amber-400 truncate max-w-xs">
          Filtro: &quot;{filterText}&quot; {invertFilter ? '(invertido)' : ''}
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
              fontSize === size ? 'bg-slate-700 text-white font-bold' : 'hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Carga Inicial de Linhas */}
      <div className="flex items-center space-x-1 border-l border-slate-800 pl-3">
        <span>Buffer inicial:</span>
        <select
          value={initialLinesCount}
          onChange={(e) => onInitialLinesChange(Number(e.target.value))}
          className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-300 text-2xs focus:outline-none"
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
