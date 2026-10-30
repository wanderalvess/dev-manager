import React, { useEffect } from 'react';
import { ArrowLeft, ArrowRight, Check, Play, RotateCw } from 'lucide-react';
import type { InfrNewVersionState, InfrNewVersionStep } from '../../../hooks/containers/useInfrNewVersion';
import { StepDatabase, StepOrigin, StepRuntime } from './InfrNewVersionSteps';
import { InfrNewVersionReview } from './InfrNewVersionReview';
import { InfrNewVersionSummary } from './InfrNewVersionSummary';

const STEPS: { step: InfrNewVersionStep; title: string; intro: string }[] = [
  { step: 1, title: 'Origem e versão', intro: 'De qual ambiente partir, para qual versão do WinThor e com que nome.' },
  { step: 2, title: 'Banco', intro: 'De onde vem o banco do ambiente novo. Cada versão roda com o seu.' },
  { step: 3, title: 'WTA, WSH e portas', intro: 'Portas no Windows, o jar do WSH e a configuração copiada da origem (editável).' },
  { step: 4, title: 'Revisar e gerar', intro: 'O Hub leu a origem e o catálogo da 801. O que estiver em vermelho impede o ambiente de subir.' }
];

/** Nova versão a partir de um ambiente: quatro passos, o resumo do que será criado e o Gerar no fim. */
export const InfrNewVersionTab: React.FC<{ s: InfrNewVersionState; onClose: () => void }> = ({ s, onClose }) => {
  const { envs, loadEnvironments, step } = s;
  useEffect(() => {
    if (!envs) loadEnvironments();
  }, [envs, loadEnvironments]);

  const current = STEPS[step - 1];
  const issue = s.stepIssue[step];
  const canGenerate = !!s.command && !!s.preview?.success && !s.blocked && s.busy === null;
  const footerNote =
    step < 4
      ? issue || `Passo ${step} de 4 · nada é criado até você clicar em Gerar`
      : s.blocked
        ? 'Resolva o que está em vermelho para gerar'
        : 'Grava a configuração e abre o terminal com o new_version_env.sh';
  const noteIsProblem = (step < 4 && !!issue) || (step === 4 && s.blocked);

  return (
    <div className="flex-1 min-w-0 min-h-0 flex">
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto p-5 md:p-6 space-y-5 scrollbar-thin">
          <div>
            <h3 className="text-lg font-bold text-foreground">Nova versão a partir de um ambiente</h3>
            <p className="text-sm text-foreground/80 mt-1 leading-relaxed max-w-2xl">
              Escolha um ambiente que já funciona e a versão do WinThor que você quer. O Hub monta um ambiente novo ao lado, com banco, WTA
              e WSH próprios. O ambiente de origem não é alterado.
            </p>
          </div>

          <ol aria-label="Passos" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STEPS.map((st) => {
              const active = st.step === step;
              const done = st.step < step;
              const reachable = s.canReach(st.step);
              return (
                <li key={st.step}>
                  <button
                    type="button"
                    onClick={() => s.goTo(st.step)}
                    disabled={!reachable}
                    aria-current={active ? 'step' : undefined}
                    className={`w-full h-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition ${
                      active ? 'border-warning/60 bg-warning/10' : 'border-border/80 hover:bg-muted/40'
                    } disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
                  >
                    <span
                      className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-2xs font-bold ${
                        active ? 'bg-warning text-white' : done ? 'bg-success text-white' : 'border border-border text-muted-foreground'
                      }`}
                    >
                      {done ? <Check className="w-3.5 h-3.5" /> : st.step}
                    </span>
                    <span className={`text-xs leading-tight ${active ? 'font-semibold text-foreground' : 'text-foreground/80'}`}>{st.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>

          <section className="space-y-4">
            <div>
              <h4 className="text-base font-bold text-foreground">
                {step}. {current.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">{current.intro}</p>
            </div>
            {step === 1 && <StepOrigin s={s} />}
            {step === 2 && <StepDatabase s={s} />}
            {step === 3 && <StepRuntime s={s} />}
            {step === 4 && <InfrNewVersionReview s={s} />}
          </section>

          <details className="xl:hidden rounded-xl border border-border/80 bg-muted/15 px-4 py-3">
            <summary className="text-xs font-bold text-foreground cursor-pointer">O que será criado</summary>
            <div className="mt-3">
              <InfrNewVersionSummary s={s} />
            </div>
          </details>
        </div>

        <footer className="shrink-0 border-t border-border/80 px-5 md:px-6 py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className={`basis-full md:basis-0 md:flex-1 min-w-0 text-xs ${noteIsProblem ? 'text-danger' : 'text-muted-foreground'}`}>{footerNote}</span>
          <button
            type="button"
            onClick={() => (step === 1 ? onClose() : s.setStep((step - 1) as InfrNewVersionStep))}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted cursor-pointer"
          >
            {step > 1 && <ArrowLeft className="w-4 h-4" />}
            {step === 1 ? 'Cancelar' : 'Voltar'}
          </button>
          {step < 4 ? (
            <button
              type="button"
              onClick={() => s.goTo((step + 1) as InfrNewVersionStep)}
              disabled={!!issue}
              className="flex-[2] sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg bg-warning text-white text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próximo: {STEPS[step].title}
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={s.generate}
              disabled={!canGenerate}
              className="flex-[2] sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg bg-warning text-white text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {s.busy === 'generate' ? <RotateCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
              Gerar ambiente {s.form.name || ''}
            </button>
          )}
        </footer>
      </div>

      <aside aria-label="O que será criado" className="hidden xl:block w-72 shrink-0 border-l border-border/70 bg-muted/15 p-5 overflow-y-auto scrollbar-thin">
        <h4 className="text-2xs font-bold uppercase tracking-wider text-foreground/80 mb-3">O que será criado</h4>
        <InfrNewVersionSummary s={s} />
      </aside>
    </div>
  );
};
