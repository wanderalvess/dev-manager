import React from 'react';
import { CheckCircle2, CircleDashed, Clock, MinusCircle, XCircle, type LucideIcon } from 'lucide-react';
import {
  stepLabel,
  type IntegrationStepStatus,
  type IntegrationTraceStep
} from '../../../../shared/integrationTypes';
import { STEP_STATUS_LABELS, STEP_STATUS_TONES, formatTraceDuration } from '../../utils/integrationTraceView';
import { TONE_BADGE, TONE_TEXT } from './toneClasses';

const STEP_ICONS: Record<IntegrationStepStatus, LucideIcon> = {
  ok: CheckCircle2,
  failed: XCircle,
  pending: Clock,
  skipped: MinusCircle,
  unknown: CircleDashed
};

const SOURCE_LABELS: Record<IntegrationTraceStep['source'], string> = {
  'ch-api': 'API do PDVSync',
  apm: 'APM',
  log: 'log',
  sql: 'SQL',
  http: 'HTTP',
  none: ''
};

interface TraceStepRowProps {
  step: IntegrationTraceStep;
  position: number;
}

/** Uma linha por passo da cadeia: status, o que foi provado e a evidência do passo. O que falhou ganha destaque. */
export const TraceStepRow: React.FC<TraceStepRowProps> = ({ step, position }) => {
  const tone = STEP_STATUS_TONES[step.status];
  const Icon = STEP_ICONS[step.status];
  const facts = [
    SOURCE_LABELS[step.source],
    step.httpStatus !== undefined ? `HTTP ${step.httpStatus}` : '',
    step.itemCount !== undefined ? `${step.itemCount} item(ns)` : '',
    formatTraceDuration(step.durationMs)
  ].filter(Boolean);

  return (
    <li
      data-step={step.id}
      data-status={step.status}
      className={`flex items-start gap-3 px-4 py-3 ${step.status === 'failed' ? 'bg-danger/10' : ''}`}
    >
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${TONE_TEXT[tone]}`} aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={`text-xs font-medium ${step.status === 'unknown' ? 'text-muted-foreground' : 'text-foreground'}`}>
            <span className="font-mono text-muted-foreground mr-1.5">{position}</span>
            {stepLabel(step.id)}
          </span>
          <span className="flex items-center gap-2">
            {facts.length > 0 && <span className="text-2xs font-mono text-muted-foreground">{facts.join(' · ')}</span>}
            <span className={`px-2 py-0.5 rounded-full text-2xs font-medium whitespace-nowrap ${TONE_BADGE[tone]}`}>
              {STEP_STATUS_LABELS[step.status]}
            </span>
          </span>
        </div>
        {step.message && (
          <p className={`text-2xs break-words ${step.status === 'failed' ? 'text-danger' : 'text-muted-foreground'}`}>{step.message}</p>
        )}
        {step.evidence && (
          <pre className="text-2xs font-mono text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-1.5 whitespace-pre-wrap break-words">
            {step.evidence}
          </pre>
        )}
      </div>
    </li>
  );
};
