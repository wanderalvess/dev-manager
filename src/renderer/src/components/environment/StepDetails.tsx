import React from 'react';
import { FolderOpen } from 'lucide-react';
import type { AutomationStep } from '../../../../shared/types';
import type { StepRuntimeTarget } from '../../utils/environmentPageUtils';

interface StepDetailsProps {
  step: AutomationStep;
  runtime: StepRuntimeTarget;
}

/** Detalhes contextuais por tipo de etapa (comando, serviço, processo, porta, IDE, Karaf, navegador). */
export const StepDetails: React.FC<StepDetailsProps> = ({ step, runtime }) => {
  const {
    effectiveKarafPort,
    serviceTargetName: srvTarget,
    service: srvFound,
    processTargetName: procTarget,
    process: procFound
  } = runtime;

  return (
    <div className="mt-1 space-y-0.5 text-2xs font-mono text-muted-foreground truncate">
      {/* 1. Comando */}
      {step.type === 'command' && (
        <>
          {step.cwd && (
            <p className="truncate text-muted-foreground/80 flex items-center gap-1">
              <FolderOpen className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="truncate">{step.cwd}</span>
            </p>
          )}
          {step.command && (
            <p className="truncate text-foreground/80 font-mono bg-muted/40 px-1.5 py-0.5 rounded max-w-md">
              $ {step.command}
            </p>
          )}
        </>
      )}

      {/* 2. Serviços Windows (Start / Stop) */}
      {(step.type === 'service-start' || step.type === 'service-stop') && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-muted-foreground">Serviço:</span>
          <span className="text-foreground font-semibold bg-muted/50 px-1.5 py-0.5 rounded">
            {srvTarget}
          </span>
          {srvFound && (
            <span
              className={`text-2xs px-1.5 py-0.2 rounded font-sans font-bold ${
                srvFound.state === 'RUNNING'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
              }`}
            >
              {srvFound.state === 'RUNNING' ? 'Em Execução' : srvFound.state === 'STOPPED' ? 'Parado' : srvFound.state}
            </span>
          )}
        </div>
      )}

      {/* 3. Finalizar Processo */}
      {step.type === 'kill-process' && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-muted-foreground">Processo alvo:</span>
          <span className="text-foreground font-semibold bg-muted/50 px-1.5 py-0.5 rounded">
            {procTarget}
          </span>
          {procFound && (
            <span
              className={`text-2xs px-1.5 py-0.2 rounded font-sans font-bold ${
                procFound.isRunning
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {procFound.isRunning ? `Ativo (PID ${procFound.pid})` : 'Inativo'}
            </span>
          )}
        </div>
      )}

      {/* 4. Liberar Porta */}
      {step.type === 'kill-port' && step.port && (
        <p className="text-muted-foreground">
          Porta alvo para liberação imediata: <span className="text-foreground font-bold">:{step.port}</span>
        </p>
      )}

      {/* 5. IDE */}
      {step.type === 'ide' && (
        <p className="text-muted-foreground">
          Inicializa o editor ou IDE configurado no Cockpit
        </p>
      )}

      {/* 6. Karaf OSGi */}
      {step.type === 'karaf' && (
        <div className="space-y-0.5">
          <p className="text-muted-foreground">
            Inicia o Karaf OSGi em modo console depurável (<span className="text-foreground font-semibold">winthor.bat debug</span>).
          </p>
          <p className="text-muted-foreground/80 flex items-center gap-1 flex-wrap">
            Porta depurador JDWP:{' '}
            <span className="text-purple-600 dark:text-purple-400 font-bold font-mono">
              :{effectiveKarafPort}
            </span>
            <span className="text-2xs text-muted-foreground">
              (Configure no IntelliJ: Remote JVM Debug)
            </span>
          </p>
        </div>
      )}

      {/* 7. Navegador */}
      {step.type === 'browser' && step.browserUrl && (
        <p className="truncate text-primary">
          {step.browserUrl}
        </p>
      )}
    </div>
  );
};
