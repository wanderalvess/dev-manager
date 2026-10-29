import React from 'react';
import { AlertTriangle, CheckCircle2, MinusCircle, XCircle } from 'lucide-react';
import {
  INTEGRATION_LAYER_LABELS,
  type IntegrationCheckStatus,
  type IntegrationLayerReadiness
} from '../../../../shared/integrationTypes';
import {
  CHECK_STATUS_LABELS,
  CHECK_STATUS_TONES,
  LAYER_STATUS_LABELS,
  LAYER_STATUS_TONES,
  formatCheckDuration
} from '../../utils/integrationReadinessView';
import { TONE_BADGE, TONE_TEXT } from './toneClasses';

const CHECK_ICONS: Record<IntegrationCheckStatus, { Icon: typeof CheckCircle2; className: string }> = {
  ok: { Icon: CheckCircle2, className: 'text-success' },
  failed: { Icon: XCircle, className: 'text-danger' },
  skipped: { Icon: AlertTriangle, className: 'text-warning' }
};

interface ReadinessLayerCardProps {
  readiness: IntegrationLayerReadiness;
}

/** Um cartão por camada: o selo de status e cada verificação com detalhe e duração. */
export const ReadinessLayerCard: React.FC<ReadinessLayerCardProps> = ({ readiness }) => {
  const tone = LAYER_STATUS_TONES[readiness.status];
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3 flex flex-col" data-layer={readiness.layer} data-status={readiness.status}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-xs font-semibold text-foreground leading-snug">{INTEGRATION_LAYER_LABELS[readiness.layer]}</h3>
        <span className={`px-2 py-0.5 rounded-full text-2xs font-medium whitespace-nowrap ${TONE_BADGE[tone]}`}>
          {LAYER_STATUS_LABELS[readiness.status]}
        </span>
      </div>

      {readiness.checks.length === 0 ? (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <MinusCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Nada configurado para esta camada.</span>
        </p>
      ) : (
        <ul className="space-y-2">
          {readiness.checks.map((check) => {
            const { Icon, className } = CHECK_ICONS[check.status];
            return (
              <li key={check.label} className="flex items-start gap-2 text-xs">
                <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${className}`} aria-label={CHECK_STATUS_LABELS[check.status]} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-foreground">{check.label}</span>
                    <span className="text-2xs font-mono text-muted-foreground shrink-0">{formatCheckDuration(check.durationMs)}</span>
                  </div>
                  {check.detail && (
                    <p className={`text-2xs break-words ${check.status === 'ok' ? 'text-muted-foreground' : TONE_TEXT[CHECK_STATUS_TONES[check.status]]}`}>
                      {check.detail}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
