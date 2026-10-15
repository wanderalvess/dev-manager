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
          ? 'bg-danger/20 text-danger font-bold border border-danger/40'
          : 'text-danger hover:text-danger/80'
      }`}
    >
      ERROR {levelCounts.errorCount > 0 && <span className="font-mono">({levelCounts.errorCount})</span>}
    </button>
    <button
      onClick={() => onChange('WARN')}
      className={`px-2 py-0.5 rounded-md transition-colors flex items-center gap-1 ${
        levelFilter === 'WARN'
          ? 'bg-warning/20 text-warning font-bold border border-warning/40'
          : 'text-warning hover:text-warning/80'
      }`}
    >
      WARN {levelCounts.warnCount > 0 && <span className="font-mono">({levelCounts.warnCount})</span>}
    </button>
    <button
      onClick={() => onChange('INFO')}
      className={`px-2 py-0.5 rounded-md transition-colors ${
        levelFilter === 'INFO'
          ? 'bg-info/20 text-info font-bold border border-info/40'
          : 'text-info hover:text-info/80'
      }`}
    >
      INFO
    </button>
  </div>
);
