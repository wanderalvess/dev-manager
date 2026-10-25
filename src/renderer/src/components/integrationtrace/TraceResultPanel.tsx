import React from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCopy, MinusCircle, XCircle } from 'lucide-react';
import type { IntegrationTraceResult } from '../../../../shared/integrationTypes';
import { describeTrace, formatTraceDuration, formatTraceTime } from '../../utils/integrationTraceView';
import type { ReadinessTone } from '../../utils/integrationReadinessView';
import { TONE_BOX } from './toneClasses';
import { TraceStepRow } from './TraceStepRow';
import { TraceLogPanel } from './TraceLogPanel';
import { TraceAnimationPanel } from './TraceAnimationPanel';

const TONE_ICONS: Record<ReadinessTone, typeof CheckCircle2> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  muted: MinusCircle
};

interface TraceResultPanelProps {
  trace: IntegrationTraceResult;
  onCopyReport: () => void;
  /** Linha do modo ao vivo, repassada para a vista animada. */
  live?: React.ReactNode;
}

/** O resultado de um rastreio: veredito, o percurso animado, os oito passos, os logs do lote e as observações. */
export const TraceResultPanel: React.FC<TraceResultPanelProps> = ({ trace, onCopyReport, live }) => {
  const verdict = describeTrace(trace);
  const classes = TONE_BOX[verdict.tone];
  const Icon = TONE_ICONS[verdict.tone];
  const duration = trace.finishedAt ? formatTraceDuration(trace.finishedAt - trace.startedAt) : '';

  return (
    <div className="space-y-4" data-testid="trace-result">
      <div role="status" className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${classes.box}`}>
        <div className="flex items-center gap-3 min-w-0">
          <Icon className={`w-5 h-5 shrink-0 ${classes.icon}`} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{verdict.title}</p>
            <p className="text-xs text-muted-foreground break-words">{verdict.detail}</p>
            <p className="text-2xs font-mono text-muted-foreground mt-0.5">
              Lote {trace.batchNumber ?? '?'} · {trace.flowName ?? trace.flowId} · {formatTraceTime(trace.startedAt)}
              {duration && ` · ${duration}`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCopyReport}
          className="h-10 px-3 bg-muted hover:bg-muted/80 text-foreground border border-border font-medium text-sm rounded-[10px] transition-colors flex items-center gap-2"
        >
          <ClipboardCopy className="w-4 h-4" />
          <span>Copiar relatório (Jira)</span>
        </button>
      </div>

      <TraceAnimationPanel trace={trace} live={live} />

      <ol className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
        {trace.steps.map((step, index) => (
          <TraceStepRow key={step.id} step={step} position={index + 1} />
        ))}
      </ol>

      {trace.logExcerpts && trace.logExcerpts.length > 0 && <TraceLogPanel excerpts={trace.logExcerpts} />}

      {trace.notes && trace.notes.length > 0 && (
        <div className="bg-muted/30 border border-border/50 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">Observações</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {trace.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
