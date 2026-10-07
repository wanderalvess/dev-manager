import React from 'react';
import { AppWindow, Plus, Play, Terminal, Trash2 } from 'lucide-react';
import { MappedProgram } from '../../../../shared/types';

interface MappedProgramsPanelProps {
  mappedPrograms: MappedProgram[];
  runningMappedId: string | null;
  isAddingProgram: boolean;
  onAdd: () => void;
  onRename: (id: string, name: string) => void;
  onRenameBlur: () => void;
  onLaunch: (id: string) => void;
  onRemove: (id: string) => void;
}

export const MappedProgramsPanel: React.FC<MappedProgramsPanelProps> = ({
  mappedPrograms,
  runningMappedId,
  isAddingProgram,
  onAdd,
  onRename,
  onRenameBlur,
  onLaunch,
  onRemove
}) => (
  <div className="cockpit-panel rounded-xl p-3.5 shadow-2xs border border-border/80 shrink-0 space-y-2.5">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <AppWindow className="w-4 h-4 text-primary shrink-0" />
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Programas Mapeados &amp; Atalhos Rápidos ({mappedPrograms.length})
          </h3>
          <p className="text-2xs text-muted-foreground font-mono">
            Atalhos diretos para executáveis (.exe, .bat, .cmd) independente da pasta padrão.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onAdd}
        disabled={isAddingProgram}
        className="px-2.5 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-[0.98] shadow-2xs"
        title="Selecionar um executável para mapear"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Adicionar Atalho</span>
      </button>
    </div>

    {mappedPrograms.length === 0 ? (
      <p className="text-xs text-muted-foreground py-2.5 text-center bg-card/30 rounded-lg border border-border/60 font-mono">
        Nenhum programa mapeado ainda. Clique em "Adicionar Atalho" e escolha um executável do seu computador.
      </p>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
        {mappedPrograms.map((program) => (
          <div
            key={program.id}
            className="rounded-xl p-2 bg-card/70 border border-border/80 hover:border-primary/50 flex items-center gap-2 transition-all shadow-2xs group"
          >
            <div className="p-1 rounded-md bg-muted/60 text-muted-foreground group-hover:text-primary transition-colors shrink-0">
              <Terminal className="w-3 h-3" />
            </div>
            <input
              type="text"
              value={program.name}
              onChange={(e) => onRename(program.id, e.target.value)}
              onBlur={onRenameBlur}
              title={program.fullPath}
              className="flex-1 min-w-0 bg-transparent text-xs font-bold font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary rounded px-1 -mx-1"
            />
            <button
              type="button"
              onClick={() => onLaunch(program.id)}
              disabled={runningMappedId === program.id}
              className={`p-1.5 rounded-lg transition-all shrink-0 cursor-pointer active:scale-95 ${
                runningMappedId === program.id
                  ? 'bg-primary text-primary-foreground animate-pulse'
                  : 'bg-muted/40 hover:bg-primary text-foreground hover:text-primary-foreground border border-border/70 hover:border-primary'
              }`}
              title="Executar este programa"
            >
              <Play className="w-3 h-3 fill-current" />
            </button>
            <button
              type="button"
              onClick={() => onRemove(program.id)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 cursor-pointer"
              title="Remover atalho"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
);
