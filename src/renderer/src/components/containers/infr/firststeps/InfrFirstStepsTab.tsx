import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, ExternalLink, RotateCw } from 'lucide-react';
import { summarizeFirstSteps, type InfrFirstStep } from '../../../../../../shared/infrFirstSteps';
import { INFR_REPO_URL } from '../../../../../../shared/infrFirstStepsCommands';
import type { InfrFirstStepsState } from '../../../../hooks/containers/useInfrFirstSteps';
import type { InfrBootstrapTab } from '../../../../utils/infrBootstrapModalUtils';
import { InfrFirstStepRow, FS_BTN, FS_INPUT } from './InfrFirstStepRow';
import { InfrFirstStepBody } from './InfrFirstStepBody';

const SEGMENT: Record<InfrFirstStep['status'], string> = {
  ok: 'bg-success',
  warn: 'bg-warning',
  fail: 'bg-danger',
  waiting: 'bg-warning',
  blocked: 'bg-border'
};

/**
 * Montar do zero: do computador sem nada até o ambiente WinThor no Docker. As etapas feitas viram uma linha,
 * a etapa da vez ocupa a tela com o que fazer, e as que dependem dela aparecem apagadas.
 */
export const InfrFirstStepsTab: React.FC<{ f: InfrFirstStepsState; onGoTo: (tab: InfrBootstrapTab) => void }> = ({ f, onGoTo }) => {
  const [showDone, setShowDone] = useState(false);
  const r = f.result;
  const steps = r?.steps ?? [];
  const sum = summarizeFirstSteps(steps);
  const allOk = steps.length > 0 && sum.done === sum.total;
  const current = allOk ? steps.find((s) => s.id === 'ready') : sum.next;
  const done = steps.filter((s) => s.status === 'ok' && s !== current);
  const rest = steps.filter((s) => s.status !== 'ok' && s !== current);
  const currentIndex = current ? steps.indexOf(current) : -1;

  return (
    <div className="flex-1 min-w-0 overflow-auto scrollbar-thin">
      <div className="max-w-6xl mx-auto px-5 md:px-6 py-7 space-y-6">
        <div className="flex flex-wrap items-end gap-3">
          <p className="flex-1 min-w-[16rem] text-sm text-foreground/80">
            O Hub confere cada etapa sozinho, a cada 20 s, e traz o comando pronto.
            {r?.checkedAt && <span className="text-muted-foreground"> Lido às {new Date(r.checkedAt).toLocaleTimeString()}.</span>}
          </p>
          <label className="text-xs text-foreground/80 flex items-center gap-2 whitespace-nowrap">
            Versão do WinThor
            <input value={f.version} onChange={(e) => f.setVersion(e.target.value)} inputMode="numeric" className={`${FS_INPUT} w-20`} />
          </label>
          <button type="button" onClick={f.check} disabled={f.loading} className={FS_BTN}>
            <RotateCw className={`w-3.5 h-3.5 ${f.loading ? 'animate-spin' : ''}`} /> Conferir de novo
          </button>
        </div>

        {r && !r.success && <p className="text-sm text-danger p-3 rounded-xl border border-danger/40 bg-danger/5 break-words">{r.error}</p>}
        {r?.success && r.error && <p className="text-xs text-warning p-3 rounded-xl border border-warning/40 bg-warning/5 break-words">{r.error}</p>}
        {!r && f.loading && <p className="text-sm text-muted-foreground">Conferindo o computador...</p>}

        {steps.length > 0 && (
          <section aria-label="Progresso" className="space-y-2.5">
            <div className="flex gap-1.5" aria-hidden="true">
              {steps.map((s) => (
                <span key={s.id} title={s.title} className={`flex-1 h-1.5 rounded-full ${s === current && !allOk ? 'bg-warning' : SEGMENT[s.status]}`} />
              ))}
            </div>
            {done.length > 0 && (
              <button type="button" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone} className="flex items-center gap-2 text-xs text-foreground/80 text-left cursor-pointer">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                <span>
                  <strong className="text-foreground">
                    {sum.done} de {sum.total} feitas:
                  </strong>{' '}
                  {done.map((s) => s.title).join(', ')}.
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-warning shrink-0 transition ${showDone ? 'rotate-180' : ''}`} />
              </button>
            )}
            {showDone && (
              <ol className="space-y-2">
                {done.map((s) => (
                  <InfrFirstStepRow key={s.id} step={s} index={steps.indexOf(s)} />
                ))}
              </ol>
            )}
          </section>
        )}

        {current && (
          <section aria-label="Etapa atual" className="space-y-4">
            <div>
              <p className="text-2xs font-bold uppercase tracking-wider text-warning">
                {allOk ? 'Tudo pronto' : `Etapa ${currentIndex + 1} de ${steps.length}`}
              </p>
              <h2 className="mt-1 text-2xl font-bold text-foreground tracking-tight">{allOk ? `O ambiente ${f.version} está pronto` : current.title}</h2>
              <p className="mt-1.5 text-sm text-foreground/80 leading-relaxed break-words">{current.detail}</p>
            </div>
            <div className="p-4 md:p-5 rounded-xl border border-warning/40 bg-card space-y-3">
              <InfrFirstStepBody step={current} f={f} />
            </div>
            {allOk && (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => onGoTo('verify')} className={FS_BTN}>
                  Verificar ambiente
                </button>
                <button type="button" onClick={() => onGoTo('newVersion')} className={FS_BTN}>
                  Nova versão a partir deste
                </button>
              </div>
            )}
          </section>
        )}

        {rest.length > 0 && (
          <section aria-label="Próximas etapas" className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground">Depois desta</h3>
            <ol className="space-y-2">
              {rest.map((s) => (
                <InfrFirstStepRow key={s.id} step={s} index={steps.indexOf(s)}>
                  {s.status !== 'blocked' ? <InfrFirstStepBody step={s} f={f} /> : undefined}
                </InfrFirstStepRow>
              ))}
            </ol>
          </section>
        )}

        {f.message && (
          <p className="text-xs text-foreground/80 p-3 rounded-xl border border-border bg-muted/30 break-words" role="status">
            {f.message}
          </p>
        )}

        <div className="p-4 rounded-xl bg-muted/40 text-xs text-foreground/80 leading-relaxed space-y-1.5">
          <p>
            <strong className="text-foreground">Fica com você:</strong> instalar o WSL pela primeira vez (administrador e um reinício), o login no Drive do time e
            no Azure DevOps, o acesso ao Nexus (o build da imagem do WTA baixa de lá), o dump da loja e a configuração inicial do WTA, uma vez.
          </p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <button type="button" onClick={() => f.openUrl(INFR_REPO_URL)} className="inline-flex items-center gap-1 text-primary hover:underline cursor-pointer">
              <ExternalLink className="w-3.5 h-3.5" /> Repositório INFR-Docker
            </button>
            <span className="text-muted-foreground">Passo a passo manual: MANUAL_INSTALACAO.md, na raiz do INFR-Docker.</span>
          </p>
        </div>
      </div>
    </div>
  );
};
