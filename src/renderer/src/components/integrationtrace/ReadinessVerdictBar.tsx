import React from 'react';
import { CheckCircle2, Loader2, MinusCircle, RefreshCw, XCircle, AlertTriangle } from 'lucide-react';
import type { IntegrationReadinessResult } from '../../../../shared/integrationTypes';
import { describeReadiness, formatCheckedAgo, type ReadinessTone } from '../../utils/integrationReadinessView';
import { TONE_BOX } from './toneClasses';

const TONE_ICONS: Record<ReadinessTone, typeof CheckCircle2> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  muted: MinusCircle
};

interface ReadinessVerdictBarProps {
  result: IntegrationReadinessResult | null;
  running: boolean;
  onRun: () => void;
}

/** Veredito do pré-voo em uma frase ("posso testar agora?") e o botão que roda a conferência. */
export const ReadinessVerdictBar: React.FC<ReadinessVerdictBarProps> = ({ result, running, onRun }) => {
  const verdict = describeReadiness(result);
  const classes = TONE_BOX[verdict.tone];
  const Icon = TONE_ICONS[verdict.tone];
  return (
    <div role="status" className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${classes.box}`}>
      <div className="flex items-center gap-3 min-w-0">
        <Icon className={`w-5 h-5 shrink-0 ${classes.icon}`} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{verdict.title}</p>
          <p className="text-xs text-muted-foreground">
            {verdict.detail}
            {result && <span className="ml-1 font-mono text-2xs">· conferido {formatCheckedAgo(result.checkedAt, Date.now())}</span>}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRun}
        disabled={running}
        className="h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm rounded-[10px] transition-colors flex items-center gap-2 disabled:opacity-60"
      >
        {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        <span>{running ? 'Conferindo...' : result ? 'Conferir de novo' : 'Conferir agora'}</span>
      </button>
    </div>
  );
};
