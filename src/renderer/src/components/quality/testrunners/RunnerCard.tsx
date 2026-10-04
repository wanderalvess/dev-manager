import React from 'react';
import { Play, Trash2, Edit2, Terminal, RefreshCw, FolderOpen, Layers } from 'lucide-react';
import type { TestRunnerConfig } from '../../../../../shared/types';
import { getCommandPreview } from '../../../utils/testRunnersUtils';
import { TYPE_ICONS, TYPE_BADGES } from './testRunnersVisuals';

interface RunnerCardProps {
  runner: TestRunnerConfig;
  runningRunnerId: string | null;
  onExecute: (runner: TestRunnerConfig) => void;
  onEdit: (runner: TestRunnerConfig) => void;
  onDelete: (id: string, name: string) => void;
}

export const RunnerCard: React.FC<RunnerCardProps> = ({
  runner,
  runningRunnerId,
  onExecute,
  onEdit,
  onDelete
}) => {
  const isRunning = runningRunnerId === runner.id;
  const badge = TYPE_BADGES[runner.type] || TYPE_BADGES.custom;

  return (
    <div
      className={`p-3 rounded-xl border transition-all ${
        isRunning
          ? 'border-primary/80 bg-primary/5 shadow-xs ring-1 ring-primary/20'
          : 'border-border/70 bg-card hover:border-border hover:bg-card/90'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-muted/60 border border-border/60 shrink-0 mt-0.5">
            {TYPE_ICONS[runner.type]}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-bold text-foreground truncate max-w-[160px]" title={runner.name}>
                {runner.name}
              </h4>
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-mono uppercase tracking-wider font-semibold border ${badge.badgeClass}`}
              >
                {badge.label}
              </span>
            </div>
            {runner.description && (
              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5" title={runner.description}>
                {runner.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(runner)}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/80 transition cursor-pointer"
            title="Editar runner"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(runner.id, runner.name)}
            className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
            title="Excluir runner"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Detalhes do comando e diretório */}
      <div className="mt-2.5 pt-2 border-t border-border/40 text-[11px] space-y-1 font-mono text-muted-foreground">
        <div className="flex items-center gap-1.5 truncate">
          <FolderOpen className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="truncate opacity-80" title={runner.workingDir}>
            {runner.workingDir}
          </span>
        </div>
        <div className="flex items-center gap-1.5 truncate">
          <Terminal className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="text-foreground/90 font-medium truncate">{getCommandPreview(runner)}</span>
        </div>
      </div>

      {/* Itens vinculados da matriz */}
      {runner.linkedValidationItemIds && runner.linkedValidationItemIds.length > 0 && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
          <Layers className="w-3 h-3 text-primary" />
          <span>{runner.linkedValidationItemIds.length} cenário(s) da Matriz</span>
        </div>
      )}

      {/* Ação de execução */}
      <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={runningRunnerId !== null}
          onClick={() => onExecute(runner)}
          className={`w-full py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs active:scale-98 ${
            isRunning
              ? 'bg-primary/15 text-primary border border-primary/30 cursor-not-allowed'
              : 'bg-primary hover:bg-primary/90 text-primary-foreground'
          }`}
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Executando...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Executar</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
