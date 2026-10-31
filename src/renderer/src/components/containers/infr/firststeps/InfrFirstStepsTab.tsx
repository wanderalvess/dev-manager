import React from 'react';
import { ExternalLink, RotateCw } from 'lucide-react';
import { summarizeFirstSteps, type InfrFirstStep } from '../../../../../../shared/infrFirstSteps';
import { INFR_REPO_URL } from '../../../../../../shared/infrFirstStepsCommands';
import type { InfrFirstStepsState } from '../../../../hooks/containers/useInfrFirstSteps';
import type { InfrBootstrapTab } from '../../../../utils/infrBootstrapModalUtils';
import { InfrFirstStepRow, FS_BTN, FS_INPUT } from './InfrFirstStepRow';
import { InfrFirstStepBody } from './InfrFirstStepBody';

/** Abre o corpo da etapa quando há o que fazer nela (e no fim, com os endereços do ambiente). */
const showBody = (s: InfrFirstStep) => (s.id === 'ready' ? s.status === 'ok' : s.status !== 'ok' && s.status !== 'blocked');

/** Primeiros passos: do computador sem nada até o ambiente WinThor no Docker, conferido pelo Hub. */
export const InfrFirstStepsTab: React.FC<{ f: InfrFirstStepsState; onGoTo: (tab: InfrBootstrapTab) => void }> = ({ f, onGoTo }) => {
  const r = f.result;
  const steps = r?.steps ?? [];
  const sum = summarizeFirstSteps(steps);
  const allOk = steps.length > 0 && sum.done === sum.total;

  return (
    <div className="flex-1 min-w-0 flex min-h-0">
      <div className="flex-1 min-w-0 overflow-auto p-5 md:p-6 space-y-4 scrollbar-thin">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[16rem]">
            <h3 className="text-lg font-bold text-foreground">Primeiros passos</h3>
            <p className="text-sm text-foreground/80 mt-1">Do computador sem nada até o ambiente WinThor no Docker. O Hub confere cada etapa sozinho e diz o que falta.</p>
          </div>
          <label className="text-xs text-foreground/80 flex flex-col gap-1">
            Versão do WinThor
            <input value={f.version} onChange={(e) => f.setVersion(e.target.value)} inputMode="numeric" className={`${FS_INPUT} w-24`} />
          </label>
          <button type="button" onClick={f.check} disabled={f.loading} className={FS_BTN}>
            <RotateCw className={`w-3.5 h-3.5 ${f.loading ? 'animate-spin' : ''}`} /> Conferir de novo
          </button>
        </div>

        {r && !r.success && <p className="text-sm text-danger p-3 rounded-xl border border-danger/40 bg-danger/5 break-words">{r.error}</p>}
        {r?.success && r.error && <p className="text-xs text-warning p-3 rounded-xl border border-warning/40 bg-warning/5 break-words">{r.error}</p>}

        {steps.length > 0 && (
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${allOk ? 'border-success/40 bg-success/5' : 'border-warning/40 bg-warning/5'}`}>
            <span className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white ${allOk ? 'bg-success' : 'bg-warning'}`}>
              {sum.done}/{sum.total}
            </span>
            <div className="min-w-0">
              <p className="text-base font-bold text-foreground">{allOk ? `O ambiente ${f.version} está pronto` : sum.next ? `Próximo: ${sum.next.title}` : 'Conferindo'}</p>
              <p className="text-xs text-foreground/80 mt-0.5">
                {allOk ? 'Banco, WTA e WSH no ar e o login do WTA entrando.' : 'Cada etapa diz o que falta e traz o comando pronto. Esta tela confere de novo a cada 20 s.'}
                {r?.checkedAt && ` Lido às ${new Date(r.checkedAt).toLocaleTimeString()}.`}
              </p>
            </div>
          </div>
        )}

        {!r && f.loading && <p className="text-sm text-muted-foreground">Conferindo o computador...</p>}

        <ol className="space-y-2">
          {steps.map((s, i) => (
            <InfrFirstStepRow key={s.id} step={s} index={i}>
              {showBody(s) ? <InfrFirstStepBody step={s} f={f} /> : undefined}
            </InfrFirstStepRow>
          ))}
        </ol>

        {f.message && <p className="text-xs text-foreground/80 p-3 rounded-xl border border-border bg-muted/30 break-words" role="status">{f.message}</p>}
      </div>

      <aside className="hidden xl:flex w-72 shrink-0 border-l border-border/70 bg-muted/20 p-5 flex-col gap-5 overflow-auto scrollbar-thin">
        <section className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Precisa de você</h4>
          <p className="text-xs text-foreground/80">O Hub mostra o comando ou o link, mas estes passos são seus:</p>
          <ul className="list-disc pl-4 space-y-1.5 text-xs text-foreground/90 leading-snug">
            <li>Instalar o WSL pela primeira vez: administrador e um reinício.</li>
            <li>Login no Drive do time e no Azure DevOps.</li>
            <li>Acesso ao Nexus, liberado pelo time (o build da imagem do WTA baixa de lá).</li>
            <li>O dump da loja que você vai usar.</li>
            <li>A configuração inicial do WTA, uma vez.</li>
          </ul>
        </section>
        <section className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Depois de pronto</h4>
          <button type="button" onClick={() => onGoTo('verify')} className={`${FS_BTN} w-full`}>
            Verificar ambiente
          </button>
          <button type="button" onClick={() => onGoTo('newVersion')} className={`${FS_BTN} w-full`}>
            Nova versão a partir deste
          </button>
        </section>
        <section className="space-y-1.5">
          <h4 className="text-sm font-semibold text-foreground">Onde fica cada coisa</h4>
          <button type="button" onClick={() => f.openUrl(INFR_REPO_URL)} className="flex items-center gap-1.5 text-xs text-primary hover:underline cursor-pointer">
            <ExternalLink className="w-3.5 h-3.5" /> Repositório INFR-Docker
          </button>
          <p className="text-2xs text-muted-foreground">Passo a passo manual: MANUAL_INSTALACAO.md, na raiz do INFR-Docker.</p>
        </section>
      </aside>
    </div>
  );
};
