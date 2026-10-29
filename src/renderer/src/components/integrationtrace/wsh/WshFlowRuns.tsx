import React from 'react';
import type { WshScheduledFlow } from '../../../../../shared/wshMonitorTypes';
import { collapseRuns, type WshRunTone } from '../../../../../shared/wshExecution';
import { formatTraceTime } from '../../../utils/integrationTraceView';
import { formatSeconds } from '../../../utils/wshFlowView';

// Literais completos para o scanner do Tailwind
const TONE_BADGE: Record<WshRunTone, string> = {
  ok: 'bg-success/10 text-success',
  error: 'bg-danger/10 text-danger',
  other: 'bg-muted text-muted-foreground'
};

const duration = (start?: number, end?: number) =>
  start !== undefined && end !== undefined && end >= start ? formatSeconds(Math.round((end - start) / 1000)) : undefined;

/** Últimas execuções de cada fluxo da rota (gestão de execução do WSH): quando, como terminou e onde parou. */
export const WshFlowRuns: React.FC<{ flows: WshScheduledFlow[] }> = ({ flows }) => {
  const withRuns = flows.filter((flow) => flow.runs !== undefined);
  if (withRuns.length === 0) return null;
  return (
    <div className="mt-3 space-y-2">
      {withRuns.map((flow) => (
        <div key={flow.id ?? flow.name} className="space-y-1">
          <p className="text-2xs font-semibold text-foreground">Últimas execuções do fluxo "{flow.name}"</p>
          {flow.runs!.length === 0 ? (
            <p className="text-2xs text-muted-foreground">Nenhuma execução registrada neste banco.</p>
          ) : (
            <ul className="space-y-1">
              {collapseRuns(flow.runs!).map(({ run, times }) => {
                const took = duration(run.startedAt, run.finishedAt);
                const steps = run.steps.filter((step) => step.fetched || step.sent);
                return (
                  <li key={run.id} className="text-2xs">
                    <span className="font-mono text-muted-foreground">{run.startedAt ? formatTraceTime(run.startedAt) : 'sem data'}</span>{' '}
                    <span className={`px-1.5 py-0.5 rounded-full font-medium ${TONE_BADGE[run.tone]}`}>{run.statusLabel}</span>
                    {times > 1 && <span className="text-muted-foreground"> · {times} vezes seguidas</span>}
                    {took && times === 1 && <span className="text-muted-foreground"> · {took}</span>}
                    {run.failedStep && <span className="text-muted-foreground"> · parou em <span className="font-mono">{run.failedStep}</span></span>}
                    {steps.length > 0 && (
                      <span className="text-muted-foreground">
                        {' '}
                        · {steps.map((step) => `${step.name}: ${step.fetched ?? 0} buscado(s), ${step.sent ?? 0} enviado(s)`).join('; ')}
                      </span>
                    )}
                    {run.error && <span className="block text-danger break-words">{run.error}</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
};
