import React from 'react';
import { Search } from 'lucide-react';
import type { QaStepExecutionResult } from '../../../../../shared/types';

type ResultFilter = 'all' | 'failed' | 'passed';

interface QaRunnerResultFiltersProps {
  stepResults: QaStepExecutionResult[];
  resultFilter: ResultFilter;
  onChangeFilter: (filter: ResultFilter) => void;
  resultSearch: string;
  onChangeSearch: (value: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export const QaRunnerResultFilters: React.FC<QaRunnerResultFiltersProps> = ({
  stepResults,
  resultFilter,
  onChangeFilter,
  resultSearch,
  onChangeSearch,
  onExpandAll,
  onCollapseAll
}) => {
  return (
    <div className="px-4 py-2 border-b border-border bg-card/60 flex items-center justify-between gap-3 shrink-0">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChangeFilter('all')}
          className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
            resultFilter === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Todos ({stepResults.length})
        </button>
        <button
          type="button"
          onClick={() => onChangeFilter('failed')}
          className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
            resultFilter === 'failed'
              ? 'bg-rose-600 text-white'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Com Divergências ({stepResults.filter((s) => !s.success).length})
        </button>
        <button
          type="button"
          onClick={() => onChangeFilter('passed')}
          className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
            resultFilter === 'passed'
              ? 'bg-emerald-600 text-white'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Aprovados ({stepResults.filter((s) => s.success).length})
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={resultSearch}
            onChange={(e) => onChangeSearch(e.target.value)}
            placeholder="Filtrar por tabela ou coluna..."
            className="bg-background border border-border rounded-md pl-8 pr-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-48 font-mono"
          />
        </div>

        <button
          type="button"
          onClick={onExpandAll}
          className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          Expandir
        </button>
        <span className="text-border">|</span>
        <button
          type="button"
          onClick={onCollapseAll}
          className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          Recolher
        </button>
      </div>
    </div>
  );
};
