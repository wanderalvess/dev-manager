import React from 'react';
import { Link, Search } from 'lucide-react';
import type { GitTaskItem } from '../../../../../shared/types';

interface GitTaskImportSectionProps {
  rawInput: string;
  isLoadingTasks: boolean;
  tasks: GitTaskItem[];
  selectedTaskId: string | undefined;
  onRawInputChange: (value: string) => void;
  onSearch: () => void;
  onSelectTask: (task: GitTaskItem) => void;
}

/** Importa código/título de uma URL ou identificador e lista tarefas encontradas na busca. */
export const GitTaskImportSection: React.FC<GitTaskImportSectionProps> = ({
  rawInput,
  isLoadingTasks,
  tasks,
  selectedTaskId,
  onRawInputChange,
  onSearch,
  onSelectTask
}) => (
  <div className="p-3 bg-muted/20 border border-border/60 rounded-lg space-y-2">
    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
      <Link className="w-3.5 h-3.5 text-primary" />
      Importar de URL ou Identificador:
    </label>
    <div className="flex gap-2">
      <input
        type="text"
        value={rawInput}
        onChange={(e) => onRawInputChange(e.target.value)}
        placeholder="URL do Azure/Jira ou 'SRE-1234 Ajustes no faturamento'"
        className="flex-1 bg-background border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:border-primary placeholder:text-muted-foreground/50"
      />
      <button
        type="button"
        onClick={onSearch}
        disabled={isLoadingTasks}
        className="px-3 py-1.5 bg-card hover:bg-muted border border-border text-foreground rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
        title="Buscar tarefas vinculadas no Jira / Azure DevOps"
      >
        <Search className={`w-3.5 h-3.5 ${isLoadingTasks ? 'animate-spin' : ''}`} />
        <span>{isLoadingTasks ? 'Buscando...' : 'Buscar'}</span>
      </button>
    </div>
    <p className="text-[10px] text-muted-foreground leading-normal">
      Extrai automaticamente o código e o título a partir de URLs do Azure DevOps e Jira.
    </p>

    {/* Lista de tarefas retornadas da busca, se houver */}
    {tasks.length > 0 && (
      <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
          Tarefas encontradas ({tasks.length}):
        </span>
        <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
          {tasks.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => onSelectTask(task)}
              className={`w-full text-left p-1.5 px-2 rounded-md text-xs flex items-center justify-between gap-2 transition-colors border cursor-pointer ${
                selectedTaskId === task.id
                  ? 'bg-muted border-border text-foreground font-semibold'
                  : 'bg-card border-border/50 hover:bg-muted/60 text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-muted border border-border shrink-0">
                  {task.id}
                </span>
                <span className="truncate">{task.title}</span>
              </div>
              {task.type && (
                <span className="text-[10px] text-muted-foreground font-mono shrink-0">{task.type}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    )}
  </div>
);
