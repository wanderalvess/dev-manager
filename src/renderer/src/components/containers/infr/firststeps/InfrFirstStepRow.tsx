import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { InfrFirstStep, InfrFirstStepStatus } from '../../../../../../shared/infrFirstSteps';

export const FS_BTN =
  'inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
export const FS_PRIMARY =
  'inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
export const FS_INPUT = 'h-9 w-full px-2.5 rounded-lg border border-input bg-background text-xs font-mono text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/50';

const TONE: Record<InfrFirstStepStatus, { box: string; circle: string; pill?: string; label?: string }> = {
  ok: { box: 'border-success/40', circle: 'bg-success text-white' },
  warn: { box: 'border-warning/50', circle: 'bg-warning text-white', pill: 'bg-warning/10 text-warning', label: 'Falta ajustar' },
  fail: { box: 'border-danger/50', circle: 'bg-danger text-white', pill: 'bg-danger/10 text-danger', label: 'Falta' },
  waiting: { box: 'border-warning/50', circle: 'bg-warning text-white', pill: 'bg-warning/10 text-warning', label: 'Esperando' },
  blocked: { box: 'border-border/70 bg-muted/20', circle: 'border border-border text-muted-foreground', pill: 'bg-muted text-muted-foreground', label: 'Bloqueado' }
};

/** Uma etapa do checklist: número, nome, o que o Hub encontrou e o estado; o corpo abre quando há o que fazer. */
export const InfrFirstStepRow: React.FC<{ step: InfrFirstStep; index: number; children?: React.ReactNode }> = ({ step, index, children }) => {
  const t = TONE[step.status];
  const muted = step.status === 'blocked';
  return (
    <li className={`rounded-xl border bg-card ${t.box}`}>
      <div className="flex items-start gap-3 px-4 py-3">
        <span className={`w-6 h-6 mt-0.5 shrink-0 rounded-full flex items-center justify-center text-2xs font-bold ${t.circle}`}>{index + 1}</span>
        <div className="flex-1 min-w-0 flex flex-wrap items-start gap-x-4 gap-y-1">
          <p className={`w-52 shrink-0 text-sm font-semibold ${muted ? 'text-muted-foreground' : 'text-foreground'}`}>{step.title}</p>
          <p className={`flex-1 min-w-[16rem] text-xs leading-relaxed break-words ${muted ? 'text-muted-foreground' : 'text-foreground/80'}`}>{step.detail}</p>
        </div>
        {step.status === 'ok' ? (
          <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-success">
            <CheckCircle2 className="w-4 h-4" /> pronto
          </span>
        ) : (
          <span className={`shrink-0 px-2 py-0.5 rounded-full text-2xs font-semibold ${t.pill}`}>{t.label}</span>
        )}
      </div>
      {children && <div className="px-4 pb-4 pl-[3.25rem] space-y-3">{children}</div>}
    </li>
  );
};
