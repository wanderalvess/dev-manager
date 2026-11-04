import React from 'react';
import { Check } from 'lucide-react';
import { describeEnvironment } from '../../../../../../shared/infrActiveEnv';
import type { InfrNewVersionForm, InfrNewVersionState } from '../../../../hooks/containers/useInfrNewVersion';
import { radioProps } from './radioProps';
import { infrImageVersion } from '../../../../utils/infrBootstrapModalUtils';

/** Título de cada passo da tela, com o número na frente. */
export const InfrStepTitle: React.FC<{ n: number; id: string; children: React.ReactNode; ai?: boolean }> = ({ n, id, children, ai }) => (
  <h3 id={id} className="flex items-center gap-2 text-sm font-bold text-foreground">
    <span className="text-muted-foreground font-mono">{n} ·</span>
    {children}
    {ai && <span className="px-1.5 py-0.5 rounded-md bg-warning/15 text-warning text-2xs font-semibold">preenchido pela IA</span>}
  </h3>
);

const STATUS = {
  up: { text: 'no ar', cls: 'text-success', dot: 'bg-success' },
  partial: { text: 'em parte', cls: 'text-warning', dot: 'bg-warning' },
  down: { text: 'parado', cls: 'text-muted-foreground', dot: 'bg-muted-foreground/50' }
} as const;

/**
 * Passo 1: de onde copiar. Um cartão por ambiente da distro, com a versão (da imagem do WTA) e o estado. É um
 * grupo de opções (radiogroup): cada cartão é um botão, escolhido com Tab e Enter/Espaço.
 */
export const InfrNewVersionOrigin: React.FC<{
  s: InfrNewVersionState;
  /** Campos que a IA preencheu e a pessoa ainda não editou */
  filled: string[];
  onEdited: (field: keyof InfrNewVersionForm) => void;
}> = ({ s, filled, onEdited }) => {
  const envs = s.envs?.environments ?? [];
  const pick = (name: string) => {
    s.update('from', name);
    onEdited('from');
  };
  const originBad = !!s.form.from && s.origin.blocked && !!s.origin.result;

  return (
    <section aria-labelledby="nv-passo-origem" className="space-y-2.5">
      <InfrStepTitle n={1} id="nv-passo-origem" ai={filled.includes('from')}>
        De onde copiar
      </InfrStepTitle>
      {envs.length === 0 ? (
        <p className="text-xs text-muted-foreground p-4 rounded-xl border border-dashed border-border">
          {s.loadingEnvs ? 'Procurando os ambientes da distro...' : 'Nenhum ambiente encontrado na distro. Use Montar do zero para criar o primeiro.'}
        </p>
      ) : (
        <div role="radiogroup" aria-labelledby="nv-passo-origem" className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {envs.map((e, i) => {
            const on = e.name === s.form.from;
            const version = infrImageVersion(e.wta?.image);
            const status = describeEnvironment(e).status;
            const st = status === 'up' ? STATUS.up : status === 'down' ? STATUS.down : STATUS.partial;
            const border = on ? (originBad ? 'border-2 border-danger' : 'border-2 border-foreground') : 'border border-border/80 hover:border-foreground/40';
            return (
              <button
                key={e.name}
                type="button"
                {...radioProps({ index: i, count: envs.length, checked: on, anyChecked: envs.some((x) => x.name === s.form.from), pickAt: (n) => pick(envs[n].name) })}
                onClick={() => !on && pick(e.name)}
                className={`relative text-left rounded-xl bg-card px-4 py-3.5 cursor-pointer transition focus:outline-hidden focus-visible:ring-2 focus-visible:ring-warning/60 ${border}`}
              >
                <span className="block font-mono text-sm font-semibold text-foreground truncate pr-6">{e.name}</span>
                <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span aria-hidden="true" className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
                  {version ? `WinThor ${version} · ` : ''}
                  <span className={st.cls}>{st.text}</span>
                </span>
                {on && (
                  <span aria-hidden="true" className="absolute top-3 right-3 w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};
