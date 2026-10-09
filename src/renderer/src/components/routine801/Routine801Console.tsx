import React from 'react';
import { Terminal, RotateCw, ChevronDown } from 'lucide-react';
import { getLogLineClass } from '../../utils/routine801ModalUtils';

interface Routine801ConsoleProps {
  isExecuting: boolean;
  executingTargetName: string | null;
  consoleLogs: string[];
  displayedLogs: string[];
  logFilter: 'ALL' | 'ERRORS';
  consoleEndRef: React.RefObject<HTMLDivElement>;
  onChangeFilter: (filter: 'ALL' | 'ERRORS') => void;
  onClear: () => void;
  onCollapse: () => void;
}

export const Routine801Console: React.FC<Routine801ConsoleProps> = ({
  isExecuting,
  executingTargetName,
  consoleLogs,
  displayedLogs,
  logFilter,
  consoleEndRef,
  onChangeFilter,
  onClear,
  onCollapse
}) => (
  <div className="border-t border-border bg-background flex flex-col max-h-52 shrink-0 animate-in slide-in-from-bottom-2 duration-150">
    {/* Header do Terminal */}
    <div className="flex items-center justify-between px-4 py-1.5 border-b border-border bg-muted/30 text-xs">
      <div className="flex items-center gap-2 text-foreground font-mono">
        <Terminal className="w-3.5 h-3.5 text-primary" />
        <span className="font-semibold text-2xs">Console Karaf — Execução da Rotina 801</span>
        {isExecuting && (
          <span className="flex items-center gap-1.5 text-primary font-mono text-2xs ml-2">
            <RotateCw className="w-3 h-3 animate-spin" />
            <span>Processando {executingTargetName}...</span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="inline-flex rounded border border-border p-0.5 text-2xs font-mono">
          <button
            onClick={() => onChangeFilter('ALL')}
            className={`px-1.5 py-0.2 rounded ${logFilter === 'ALL' ? 'bg-primary/20 text-primary font-medium' : 'text-muted-foreground'}`}
          >
            Todos ({consoleLogs.length})
          </button>
          <button
            onClick={() => onChangeFilter('ERRORS')}
            className={`px-1.5 py-0.2 rounded ${logFilter === 'ERRORS' ? 'bg-rose-500/20 text-rose-400 font-medium' : 'text-muted-foreground'}`}
          >
            Erros
          </button>
        </div>

        {consoleLogs.length > 0 && (
          <button
            onClick={onClear}
            className="text-muted-foreground hover:text-foreground text-2xs"
          >
            Limpar
          </button>
        )}

        <button
          onClick={onCollapse}
          className="text-muted-foreground hover:text-foreground text-2xs flex items-center gap-0.5"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          <span>Recolher</span>
        </button>
      </div>
    </div>

    {/* Linhas de Log */}
    <div className="p-3 overflow-y-auto font-mono text-2xs leading-relaxed text-foreground/90 bg-background select-text flex-1">
      {displayedLogs.length === 0 ? (
        <div className="text-muted-foreground italic text-center py-4">
          Nenhum log registrado para este filtro. Dispare uma instalação para acompanhar a telemetria do Karaf em tempo real.
        </div>
      ) : (
        displayedLogs.map((log, idx) => (
          <div key={idx} className={`whitespace-pre-wrap ${getLogLineClass(log)}`}>
            {log}
          </div>
        ))
      )}
      <div ref={consoleEndRef} />
    </div>
  </div>
);
