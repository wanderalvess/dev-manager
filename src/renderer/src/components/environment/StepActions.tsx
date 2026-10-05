import React from 'react';
import { Play, Square, RefreshCw } from 'lucide-react';
import type { AutomationStep } from '../../../../shared/types';
import type { StepRuntimeTarget } from '../../utils/environmentPageUtils';

interface StepActionsProps {
  step: AutomationStep;
  runtime: StepRuntimeTarget;
  loadingAction?: 'run' | 'stop' | 'restart';
  isRunningProfile: boolean;
  onRun: (step: AutomationStep) => void;
  onStop: (step: AutomationStep) => void;
  onRestart: (step: AutomationStep) => void;
  onToggleService: (step: AutomationStep, isRunning: boolean) => void;
}

const STOP_CLASS = 'p-1 px-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-lg text-2xs font-bold flex items-center gap-1 transition-all';
const START_CLASS = 'p-1 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-lg text-2xs font-bold flex items-center gap-1 transition-all';

/** Badge de porta/debug e botões individuais de uma etapa. */
export const StepActions: React.FC<StepActionsProps> = ({
  step,
  runtime,
  loadingAction,
  isRunningProfile,
  onRun,
  onStop,
  onRestart,
  onToggleService
}) => {
  const { targetPort, isPortActive, service: srvFound } = runtime;
  const isServiceRunning = srvFound?.state === 'RUNNING';

  return (
    <div className="flex flex-col items-end gap-1.5 shrink-0">
      {((step.type === 'command' && step.port) || step.type === 'karaf') && targetPort ? (
        <span
          className={`text-2xs font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
            isPortActive
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
              : 'bg-muted/40 text-muted-foreground border border-border/60'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isPortActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40'
            }`}
          />
          :{targetPort} {step.type === 'karaf' ? (isPortActive ? 'Debug Ativo' : 'Debug Livre') : (isPortActive ? 'Online' : 'Offline')}
        </span>
      ) : null}

      <div className="flex items-center space-x-1">
        {step.type === 'service-start' || step.type === 'service-stop' ? (
          /* Botão único de serviço: rótulo/ação seguem o estado real (Iniciar/Parar) */
          <button
            type="button"
            onClick={() => onToggleService(step, isServiceRunning)}
            disabled={loadingAction === 'run' || loadingAction === 'stop' || isRunningProfile}
            className={isServiceRunning ? STOP_CLASS : START_CLASS}
            title={isServiceRunning ? 'Parar serviço' : 'Iniciar serviço'}
          >
            {isServiceRunning ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
            <span>{isServiceRunning ? 'Parar' : 'Iniciar'}</span>
          </button>
        ) : step.type === 'kill-process' ? (
          /* Botão único: kill-process não tem "início" simétrico, só finalizar */
          <button
            type="button"
            onClick={() => onStop(step)}
            disabled={loadingAction === 'stop' || isRunningProfile}
            className={STOP_CLASS}
            title="Finalizar processo"
          >
            <Square className="w-3 h-3" />
            <span>Finalizar</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onRun(step)}
              disabled={loadingAction === 'run' || isRunningProfile}
              className={START_CLASS}
              title="Executar esta etapa"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Subir</span>
            </button>

            <button
              type="button"
              onClick={() => onStop(step)}
              disabled={loadingAction === 'stop' || isRunningProfile}
              className={STOP_CLASS}
              title="Encerrar processo ou garantir serviço parado"
            >
              <Square className="w-3 h-3" />
              <span>Parar</span>
            </button>

            <button
              type="button"
              onClick={() => onRestart(step)}
              disabled={loadingAction === 'restart' || isRunningProfile}
              className="p-1 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-lg text-2xs font-bold flex items-center gap-1 transition-all"
              title="Reiniciar esta etapa"
            >
              <RefreshCw className={`w-3 h-3 ${loadingAction === 'restart' ? 'animate-spin' : ''}`} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
