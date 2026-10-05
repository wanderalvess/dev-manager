import React from 'react';
import { RotateCw, Play, RotateCcw, Square, Trash2, CheckSquare } from 'lucide-react';

interface KarafBundleBatchBarProps {
  selectedCount: number;
  isBatchActionLoading: boolean;
  onBatchAction: (action: 'start' | 'stop' | 'restart' | 'refresh' | 'uninstall') => void;
  onClearSelection: () => void;
}

export const KarafBundleBatchBar: React.FC<KarafBundleBatchBarProps> = ({
  selectedCount,
  isBatchActionLoading,
  onBatchAction,
  onClearSelection
}) => (
  <div className="sticky bottom-3 mx-4 z-20 bg-card/95 backdrop-blur-md border border-border shadow-xl rounded-lg p-2.5 px-4 flex flex-wrap items-center justify-between gap-3 text-xs mt-2">
    <div className="flex items-center gap-2 font-bold text-foreground pr-3">
      <CheckSquare className="w-4 h-4 text-primary" />
      <span>{selectedCount} bundle(s) selecionado(s)</span>
    </div>

    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={() => onBatchAction('restart')}
        disabled={isBatchActionLoading}
        className="px-3 py-1.5 rounded-xl font-bold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-700 dark:text-amber-400 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
        title="Reiniciar todos os bundles selecionados"
      >
        <RotateCcw className={`w-3.5 h-3.5 ${isBatchActionLoading ? 'animate-spin' : ''}`} />
        <span>Reiniciar</span>
      </button>

      <button
        type="button"
        onClick={() => onBatchAction('start')}
        disabled={isBatchActionLoading}
        className="px-3 py-1.5 rounded-xl font-bold bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
        title="Iniciar todos os bundles selecionados"
      >
        <Play className="w-3.5 h-3.5 fill-current" />
        <span>Iniciar</span>
      </button>

      <button
        type="button"
        onClick={() => onBatchAction('stop')}
        disabled={isBatchActionLoading}
        className="px-3 py-1.5 rounded-xl font-bold bg-muted hover:bg-muted/80 border border-border text-foreground transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
        title="Parar todos os bundles selecionados"
      >
        <Square className="w-3.5 h-3.5 fill-current" />
        <span>Parar</span>
      </button>

      <button
        type="button"
        onClick={() => onBatchAction('refresh')}
        disabled={isBatchActionLoading}
        className="px-3 py-1.5 rounded-xl font-bold bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-700 dark:text-sky-400 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
        title="Atualizar fiações OSGi dos bundles selecionados"
      >
        <RotateCw className="w-3.5 h-3.5" />
        <span>Refresh</span>
      </button>

      <button
        type="button"
        onClick={() => onBatchAction('uninstall')}
        disabled={isBatchActionLoading}
        className="px-3 py-1.5 rounded-xl font-bold bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-700 dark:text-rose-400 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
        title="Desinstalar todos os bundles selecionados"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>Desinstalar</span>
      </button>

      <button
        type="button"
        onClick={onClearSelection}
        className="text-muted-foreground hover:text-foreground text-xs underline pl-2 cursor-pointer"
      >
        Desmarcar
      </button>
    </div>
  </div>
);
