import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCopy, MinusCircle, XCircle } from 'lucide-react';
import type { WshItem, WshItemError } from '../../../../../shared/wshMonitorTypes';
import { formatWshError } from '../../../../../shared/wshObservation';
import { formatTraceTime } from '../../../utils/integrationTraceView';
import type { ReadinessTone } from '../../../utils/integrationReadinessView';
import { describeWshItem, wshItemTrace, wshTarget } from '../../../utils/wshItemView';
import { INBOUND_SCENE, OUTBOUND_SCENE } from '../../../utils/traceSceneProfiles';
import { WshDependenciesCard, WshFlowFacts } from './WshFlowCard';
import { WshFixPanel } from './WshFixPanel';
import { useWshDependencies } from '../../../hooks/integration/useWshDependencies';
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

/**
 * Um item do WSH num quadro só: o veredito fica preso no topo e o resto (percurso, fatos, erros, dependências e a
 * OBSERVACAO) rola por baixo dele, sem rolar a página.
 */
export const WshItemDetail: React.FC<WshItemDetailProps> = ({ item, onCopy }) => {
  const verdict = describeWshItem(item);
  const trace = useMemo(() => wshItemTrace(item), [item]);
  const Icon = TONE_ICONS[verdict.tone];
  const sendSeconds = item.createdAt && item.syncedAt ? Math.round((item.syncedAt - item.createdAt) / 1000) : undefined;
  const hasErrors = item.ownErrors.length > 0 || item.otherErrors.length > 0;
  const deps = useWshDependencies(item.route);

  return (
    <div className="flex flex-col lg:h-full min-h-0 bg-card border border-border rounded-xl overflow-hidden" data-testid="wsh-item-detail">
      <div role="status" className={`shrink-0 flex flex-wrap items-center gap-3 border-b px-4 py-3 ${TONE_BOX[verdict.tone].box}`}>
        <Icon className={`w-5 h-5 shrink-0 ${TONE_BOX[verdict.tone].icon}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{verdict.title}</p>
          <p className="text-xs text-muted-foreground break-words">{verdict.detail}</p>
          <p className="text-2xs font-mono text-muted-foreground mt-0.5 break-all">
            {item.internalId ? `${item.internalId} · ` : ''}
            {item.externalId}
          </p>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="h-9 px-3 bg-card hover:bg-muted text-foreground border border-border font-medium text-sm rounded-[10px] transition-colors flex items-center gap-2"
        >
          <ClipboardCopy className="w-4 h-4" />
          <span>Copiar resumo (Jira)</span>
        </button>
      </div>

      <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto p-4 space-y-3">
        {/* O que fazer vem primeiro: é para isso que se abre um item com erro */}
        <WshFixPanel item={item} deps={deps} />

        <TraceAnimationPanel trace={trace} profile={wshTarget(item) === 'WinThor' ? INBOUND_SCENE : OUTBOUND_SCENE} collapsible />

        <dl className="border border-border rounded-xl p-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Fact label="Status no WSH" value={`${item.statusLabel} (STATUS ${item.status || '?'})`} />
          <Fact label="Tentativas" value={item.attempts} />
          <Fact label="Buscado em" value={item.createdAt ? formatTraceTime(item.createdAt) : undefined} mono />
          <Fact label="Enviado em" value={item.syncedAt ? `${formatTraceTime(item.syncedAt)}${sendSeconds !== undefined ? ` (+${sendSeconds} s)` : ''}` : undefined} mono />
          <Fact label="Rota de busca" value={item.route} />
          <Fact label="Rota de envio" value={item.sendRoute} />
          <Fact label="Requisição do envio" value={item.requestId} mono />
          <Fact label="Itens na requisição" value={item.observation?.records} />
        </dl>

        <div className={`grid grid-cols-1 gap-3 ${hasErrors ? 'xl:grid-cols-2' : ''}`}>
          {hasErrors && (
            <div className="border border-border rounded-xl p-3 space-y-3">
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
          <WshDependenciesCard item={item} deps={deps} />
        </div>

        <WshFlowFacts item={item} />

        {item.observation && (
          <details className="border border-border rounded-xl p-3">
            <summary className="text-xs font-semibold text-foreground cursor-pointer">Resposta do {wshTarget(item)} (OBSERVACAO)</summary>
            <pre className="mt-2 text-2xs font-mono text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-1.5 whitespace-pre-wrap break-all max-h-72 overflow-auto">
              {item.observation.raw}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};
