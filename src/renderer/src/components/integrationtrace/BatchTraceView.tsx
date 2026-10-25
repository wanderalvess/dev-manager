import React from 'react';
import { Loader2, Route } from 'lucide-react';
import { useBatchTrace } from '../../hooks/integration/useBatchTrace';
import { BatchTraceForm } from './BatchTraceForm';
import { TraceHistoryList } from './TraceHistoryList';
import { TraceResultPanel } from './TraceResultPanel';
import { LiveTraceBar } from './LiveTraceBar';
import { useLiveTraceRefresh } from '../../hooks/integration/useLiveTraceRefresh';

interface BatchTraceViewProps {
  settingsVersion?: number;
  onOpenSettings: () => void;
}

/** Aba "Rastrear lote": formulário e histórico à esquerda, resultado à direita. */
export const BatchTraceView: React.FC<BatchTraceViewProps> = ({ settingsVersion, onOpenSettings }) => {
  const { flows, history, current, running, error, form, run, open, remove, copyReport, replaceCurrent, reloadHistory } = useBatchTrace(settingsVersion);
  const live = useLiveTraceRefresh(current, replaceCurrent, () => void reloadHistory());
  const waitSeconds = flows.find((flow) => flow.id === form.flowId)?.evidence.pdvWaitSeconds ?? 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[20rem_minmax(0,1fr)] gap-4 items-start">
      <div className="space-y-4">
        <BatchTraceForm
          flows={flows}
          flowId={form.flowId}
          batchNumber={form.batchNumber}
          lookbackMinutes={form.lookbackMinutes}
          branchId={form.branchId}
          running={running}
          error={error}
          onFlowChange={form.setFlowId}
          onBatchChange={form.setBatchNumber}
          onLookbackChange={form.setLookbackMinutes}
          onBranchChange={form.setBranchId}
          onRun={() => void run()}
          onOpenSettings={onOpenSettings}
        />
        <TraceHistoryList items={history} activeId={current?.id} onOpen={(id) => void open(id)} onRemove={(id) => void remove(id)} />
      </div>

      <div className="min-w-0">
        {running ? (
          <div role="status" className="bg-card border border-border rounded-xl p-6 flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>
              Procurando o lote no PDV, nos logs e no APM
              {waitSeconds > 0 ? `. A consulta do PDV pode esperar até ${waitSeconds} s pela descida do dado.` : '.'}
            </span>
          </div>
        ) : current ? (
          <TraceResultPanel
            trace={current}
            onCopyReport={() => void copyReport()}
            live={
              <LiveTraceBar
                active={live.active}
                checking={live.checking}
                attempts={live.attempts}
                secondsLeft={live.secondsLeft}
                stopReason={live.stopReason}
                canStart={live.canStart}
                onStart={live.start}
                onStop={live.stop}
              />
            }
          />
        ) : (
          <div className="bg-card border border-border rounded-xl p-6 space-y-2">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Route className="w-4 h-4 text-primary" /> Rastreie um lote já executado
            </h2>
            <p className="text-xs text-muted-foreground">
              O Hub procura o lote onde consegue: no banco do PDV (esperando o dado descer), na retaguarda, no APM e nos logs do WSH e do CH.
              O que não tiver fonte aparece como &quot;sem evidência&quot;, nunca como ok.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
