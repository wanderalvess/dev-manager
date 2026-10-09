import React from 'react';
import { LogLevelFilter, LogLevelCounts } from '../../utils/logsFilterUtils';

interface LogsSeverityFilterProps {
  levelFilter: LogLevelFilter;
  totalLines: number;
  levelCounts: LogLevelCounts;
  onChange: (level: LogLevelFilter) => void;
}

export const LogsSeverityFilter: React.FC<LogsSeverityFilterProps> = ({
  levelFilter,
  totalLines,
  levelCounts,
  onChange
}) => (
  <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/60 text-2xs font-medium" data-tour="filtro-severidade">
    <button
      onClick={() => onChange('ALL')}
      className={`px-2 py-0.5 rounded-md transition-colors ${
        levelFilter === 'ALL' ? 'bg-card text-foreground font-bold shadow-2xs' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      Todos ({totalLines})
    </button>
    <button
      onClick={() => onChange('ERROR')}
      className={`px-2 py-0.5 rounded-md transition-colors flex items-center gap-1 ${
        levelFilter === 'ERROR'
          ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
          : 'text-rose-400/80 hover:text-rose-300'
      }`}
    >
      ERROR {levelCounts.errorCount > 0 && <span className="font-mono">({levelCounts.errorCount})</span>}
    </button>
    <button
      onClick={() => onChange('WARN')}
      className={`px-2 py-0.5 rounded-md transition-colors flex items-center gap-1 ${
        levelFilter === 'WARN'
          ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
          : 'text-amber-400/80 hover:text-amber-300'
      }`}
    >
      WARN {levelCounts.warnCount > 0 && <span className="font-mono">({levelCounts.warnCount})</span>}
    </button>
    <button
      onClick={() => onChange('INFO')}
      className={`px-2 py-0.5 rounded-md transition-colors ${
        levelFilter === 'INFO'
          ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40'
          : 'text-sky-400/80 hover:text-sky-300'
      }`}
    >
      INFO
    </button>
  </div>
);
