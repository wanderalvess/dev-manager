import React from 'react';
import { LogAnalysisSummary, LogExceptionType } from '../../../shared/types';

interface LogExceptionFilterBarProps {
  filterType: LogExceptionType | 'ALL';
  onChangeFilter: (next: LogExceptionType | 'ALL') => void;
  summary: LogAnalysisSummary;
  classNotFoundCount: number;
  linkCommCount: number;
}

export const LogExceptionFilterBar: React.FC<LogExceptionFilterBarProps> = ({
  filterType,
  onChangeFilter,
  summary,
  classNotFoundCount,
  linkCommCount
}) => {
  return (
    <div className="p-2.5 bg-muted/10 border-b border-border/60 flex flex-wrap gap-1 shrink-0 text-xs font-mono">
      <button
        type="button"
        onClick={() => onChangeFilter('ALL')}
        className={`px-2 py-1 rounded text-2xs font-semibold transition-colors cursor-pointer ${
          filterType === 'ALL'
            ? 'bg-card text-foreground border border-border shadow-2xs'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        TODOS ({summary.totalErrors})
      </button>

      {summary.oraErrorsCount > 0 && (
        <button
          type="button"
          onClick={() => onChangeFilter('ORA')}
          className={`px-2 py-1 rounded text-2xs font-semibold transition-colors cursor-pointer ${
            filterType === 'ORA' ? 'bg-danger/20 text-danger shadow-2xs' : 'text-danger hover:text-danger'
          }`}
        >
          ORACLE ({summary.oraErrorsCount})
        </button>
      )}

      {summary.oomCount > 0 && (
        <button
          type="button"
          onClick={() => onChangeFilter('OOM')}
          className={`px-2 py-1 rounded text-2xs font-semibold transition-colors cursor-pointer ${
            filterType === 'OOM' ? 'bg-danger/20 text-danger shadow-2xs' : 'text-danger hover:text-danger'
          }`}
        >
          MEMÓRIA OOM ({summary.oomCount})
        </button>
      )}

      {summary.npeCount > 0 && (
        <button
          type="button"
          onClick={() => onChangeFilter('NPE')}
          className={`px-2 py-1 rounded text-2xs font-semibold transition-colors cursor-pointer ${
            filterType === 'NPE' ? 'bg-warning/20 text-warning shadow-2xs' : 'text-warning hover:text-warning'
          }`}
        >
          NULLPOINTER ({summary.npeCount})
        </button>
      )}

      {summary.bundleErrorsCount > 0 && (
        <button
          type="button"
          onClick={() => onChangeFilter('BUNDLE')}
          className={`px-2 py-1 rounded text-2xs font-semibold transition-colors cursor-pointer ${
            filterType === 'BUNDLE'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-2xs'
              : 'text-indigo-400 hover:text-indigo-300'
          }`}
        >
          OSGi BUNDLE ({summary.bundleErrorsCount})
        </button>
      )}

      {classNotFoundCount > 0 && (
        <button
          type="button"
          onClick={() => onChangeFilter('CLASS_NOT_FOUND')}
          className={`px-2 py-1 rounded text-2xs font-semibold transition-colors cursor-pointer ${
            filterType === 'CLASS_NOT_FOUND'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-2xs'
              : 'text-purple-400 hover:text-purple-300'
          }`}
        >
          CLASSE AUSENTE ({classNotFoundCount})
        </button>
      )}

      {linkCommCount > 0 && (
        <button
          type="button"
          onClick={() => onChangeFilter('LINK_COMM')}
          className={`px-2 py-1 rounded text-2xs font-semibold transition-colors cursor-pointer ${
            filterType === 'LINK_COMM'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-2xs'
              : 'text-cyan-400 hover:text-cyan-300'
          }`}
        >
          REDE / LINK ({linkCommCount})
        </button>
      )}
    </div>
  );
};
