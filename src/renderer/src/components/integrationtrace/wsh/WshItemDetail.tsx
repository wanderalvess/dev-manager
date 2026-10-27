import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCopy, MinusCircle, XCircle } from 'lucide-react';
import type { WshItem, WshItemError } from '../../../../../shared/wshMonitorTypes';
import { formatWshError } from '../../../../../shared/wshObservation';
import { formatTraceTime } from '../../../utils/integrationTraceView';
import type { ReadinessTone } from '../../../utils/integrationReadinessView';
import { describeWshItem, wshItemTrace, wshTarget } from '../../../utils/wshItemView';
import { INBOUND_SCENE, OUTBOUND_SCENE } from '../../../utils/traceSceneProfiles';
import { WshFlowCard } from './WshFlowCard';
import { TONE_BOX } from '../toneClasses';
import { TraceAnimationPanel } from '../TraceAnimationPanel';

const TONE_ICONS: Record<ReadinessTone, typeof CheckCircle2> = { success: CheckCircle2, warning: AlertTriangle, danger: XCircle, muted: MinusCircle };

const Fact: React.FC<{ label: string; value?: string | number; mono?: boolean }> = ({ label, value, mono }) =>
  value === undefined || value === '' ? null : (
    <div className="min-w-0">
      <dt className="text-2xs text-muted-foreground">{label}</dt>
      <dd className={`text-xs text-foreground break-words ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );

const ErrorList: React.FC<{ errors: WshItemError[]; tone: 'danger' | 'muted' }> = ({ errors, tone }) => (
  <ul className={`text-xs space-y-1 list-disc pl-4 ${tone === 'danger' ? 'text-danger' : 'text-muted-foreground'}`}>
    {errors.map((error, index) => (
      <li key={`${error.externalId ?? ''}-${error.field}-${index}`} className="break-words">{formatWshError(error)}</li>
    ))}
  </ul>
);

interface WshItemDetailProps {
  item: WshItem;
  onCopy: () => void;
}

/** Um item do WSH: veredito, percurso animado, datas, erros do PDVSync e a OBSERVACAO original. */
export const WshItemDetail: React.FC<WshItemDetailProps> = ({ item, onCopy }) => {
  const verdict = describeWshItem(item);
  const trace = useMemo(() => wshItemTrace(item), [item]);
  const Icon = TONE_ICONS[verdict.tone];
  const sendSeconds = item.createdAt && item.syncedAt ? Math.round((item.syncedAt - item.createdAt) / 1000) : undefined;

  return (
    <div className="space-y-4" data-testid="wsh-item-detail">
      <div role="status" className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${TONE_BOX[verdict.tone].box}`}>
        <div className="flex items-center gap-3 min-w-0">
          <Icon className={`w-5 h-5 shrink-0 ${TONE_BOX[verdict.tone].icon}`} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{verdict.title}</p>
            <p className="text-xs text-muted-foreground break-words">{verdict.detail}</p>
            <p className="text-2xs font-mono text-muted-foreground mt-0.5 break-all">{item.externalId}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="h-10 px-3 bg-muted hover:bg-muted/80 text-foreground border border-border font-medium text-sm rounded-[10px] transition-colors flex items-center gap-2"
        >
          <ClipboardCopy className="w-4 h-4" />
          <span>Copiar resumo (Jira)</span>
        </button>
      </div>

      <TraceAnimationPanel trace={trace} profile={wshTarget(item) === 'WinThor' ? INBOUND_SCENE : OUTBOUND_SCENE} />

      <dl className="bg-card border border-border rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Fact label="Status no WSH" value={`${item.statusLabel} (STATUS ${item.status || '?'})`} />
        <Fact label="Tentativas" value={item.attempts} />
        <Fact label="Buscado em" value={item.createdAt ? formatTraceTime(item.createdAt) : undefined} mono />
        <Fact label="Enviado em" value={item.syncedAt ? `${formatTraceTime(item.syncedAt)}${sendSeconds !== undefined ? ` (+${sendSeconds} s)` : ''}` : undefined} mono />
        <Fact label="Rota de busca" value={item.route} />
        <Fact label="Rota de envio" value={item.sendRoute} />
        <Fact label="Requisição do envio" value={item.requestId} mono />
        <Fact label="Itens na requisição" value={item.observation?.records} />
      </dl>

      <WshFlowCard item={item} />

      {(item.ownErrors.length > 0 || item.otherErrors.length > 0) && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          {item.ownErrors.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">Erros deste item</p>
              <ErrorList errors={item.ownErrors} tone="danger" />
            </div>
          )}
          {item.otherErrors.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">Erros de outros itens do mesmo envio ({item.otherErrors.length})</p>
              <p className="text-2xs text-muted-foreground">O {wshTarget(item)} recusa a requisição inteira: estes itens derrubaram o envio junto.</p>
              <ErrorList errors={item.otherErrors} tone="muted" />
            </div>
          )}
          {item.observation?.truncated && <p className="text-2xs text-muted-foreground">A OBSERVACAO foi lida em parte; pode haver mais erros.</p>}
        </div>
      )}

      {item.observation && (
        <details className="bg-card border border-border rounded-xl p-4">
          <summary className="text-xs font-semibold text-foreground cursor-pointer">Resposta do PDVSync (OBSERVACAO)</summary>
          <pre className="mt-2 text-2xs font-mono text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-1.5 whitespace-pre-wrap break-all max-h-72 overflow-auto">
            {item.observation.raw}
          </pre>
        </details>
      )}
    </div>
  );
};
