import React from 'react';
import { Star, Play, RefreshCw, RotateCcw, DownloadCloud } from 'lucide-react';
import { RoutineItem } from '../../../../shared/types';
import { getRoutineExtension } from '../../utils/routinesPageUtils';

interface RoutineCardProps {
  routine: RoutineItem;
  onToggleFavorite: () => void;
  onLaunch: () => void;
  onUpdateCcw?: () => void;
  onRollback?: () => void;
  isRunning: boolean;
}

export const RoutineCard: React.FC<RoutineCardProps> = ({
  routine,
  onToggleFavorite,
  onLaunch,
  onUpdateCcw,
  onRollback,
  isRunning
}) => {
  const extension = getRoutineExtension(routine.name);
  const isFavorite = routine.isFavorite;

  return (
    <div
      className={`relative rounded-xl border p-3 flex flex-col justify-between space-y-3 transition-all duration-150 group shadow-2xs ${
        isFavorite
          ? 'bg-card/90 border-amber-500/40 hover:border-amber-500/80 shadow-amber-500/5'
          : 'bg-card/70 border-border/80 hover:border-primary/50 hover:bg-card/95 hover:shadow-primary/5'
      }`}
    >
      {/* Indicador de Status / Borda chanfrada de topo */}
      <div
        className={`absolute top-0 left-0 right-0 h-0.5 transition-colors ${
          isFavorite ? 'bg-amber-500' : 'bg-transparent group-hover:bg-primary/70'
        }`}
      />

      <div className="space-y-2">
        {/* Header de Telemetria & Action Dock */}
        <div className="flex items-start justify-between gap-1.5">
          {/* Telemetria de Módulo, Extensão e Versão PE */}
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span
              className="text-2xs font-mono font-bold px-1.5 py-0.5 rounded bg-muted/70 text-foreground border border-border/70 shrink-0"
              title={`Módulo WinThor: ${routine.module}`}
            >
              {routine.module}
            </span>
            {extension && (
              <span className="text-2xs font-mono font-bold px-1 py-0.5 rounded bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/25 shrink-0">
                {extension}
              </span>
            )}
            {routine.fileVersion && (
              <span
                className="text-2xs font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-2xs shrink-0"
                title={`Versão PE do Executável: FileVersion ${routine.fileVersion}${
                  routine.productVersion ? ` / ProductVersion ${routine.productVersion}` : ''
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>v{routine.fileVersion}</span>
              </span>
            )}
          </div>

          {/* Action Dock (Ações Rápidas) */}
          <div className="flex items-center gap-0.5 shrink-0 bg-background/60 p-0.5 rounded-lg border border-border/60">
            {onRollback && (
              <button
                type="button"
                onClick={onRollback}
                className="p-1 rounded text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                title="Histórico de versões e rollback (.bak) desta rotina" aria-label="Histórico de versões e rollback (.bak) desta rotina"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            {onUpdateCcw && (
              <button
                type="button"
                onClick={onUpdateCcw}
                className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                title="Baixar/atualizar esta rotina da Central de Controle (CCW)" aria-label="Baixar/atualizar esta rotina da Central de Controle (CCW)"
              >
                <DownloadCloud className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              data-tour="favoritar-rotina"
              onClick={onToggleFavorite}
              className="p-1 rounded text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
              title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'} aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            >
              <Star
                className={`w-3.5 h-3.5 transition-transform active:scale-125 ${
                  isFavorite ? 'text-amber-500 fill-amber-500 drop-shadow-[0_0_4px_rgba(245,158,11,0.5)]' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Identificador & Metadados do Binário */}
        <div className="pt-0.5">
          <h4
            className="text-xs font-bold font-mono text-foreground truncate tracking-tight group-hover:text-primary transition-colors"
            title={routine.name}
          >
            {routine.name}
          </h4>
          <div className="flex items-center justify-between text-2xs font-mono text-muted-foreground mt-1">
            <span className="truncate opacity-80" title={routine.fullPath}>
              {routine.sizeMb}
            </span>
            <span className="text-2xs uppercase tracking-wider text-muted-foreground/60 font-mono">
              Binário Local
            </span>
          </div>
        </div>
      </div>

      {/* Command Trigger (Gatilho Mecânico de Execução) */}
      <button
        type="button"
        data-tour="executar-rotina"
        onClick={onLaunch}
        disabled={isRunning}
        className={`w-full py-1.5 px-3 rounded-lg font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] ${
          isRunning
            ? 'bg-primary/20 text-primary border border-primary/40 animate-pulse cursor-wait'
            : 'bg-muted/40 hover:bg-primary text-foreground hover:text-primary-foreground border border-border/80 hover:border-primary shadow-2xs'
        }`}
        title="Executar esta rotina no Windows" aria-label="Executar esta rotina no Windows"
      >
        {isRunning ? (
          <>
            <RefreshCw className="w-3 h-3 animate-spin text-primary" />
            <span>Inicializando...</span>
          </>
        ) : (
          <>
            <Play className="w-3 h-3 fill-current text-primary group-hover:text-primary-foreground transition-colors" />
            <span>Executar Rotina</span>
          </>
        )}
      </button>
    </div>
  );
};
