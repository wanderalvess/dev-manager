import React from 'react';
import type { InfrDbMode } from '../../../../../../shared/infrWinthorVersion';
import type { InfrNewVersionForm, InfrNewVersionState } from '../../../../hooks/containers/useInfrNewVersion';
import { InfrStepTitle } from './InfrNewVersionOrigin';

const FIELD = 'w-full h-10 px-3 rounded-[10px] border bg-background text-sm font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-warning/60';

/** Campo preenchido pela IA leva o sublinhado âmbar. */
const tone = (ai: boolean) => (ai ? 'border-warning/60 shadow-[inset_0_-3px_0_hsl(var(--warning)/0.7)]' : 'border-input');

const Field: React.FC<{ id: string; label: string; hint?: string; ai?: boolean; children: React.ReactNode }> = ({ id, label, hint, ai, children }) => (
  <div className="min-w-0 space-y-1.5">
    <label htmlFor={id} className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
      {label}
      {ai && <span className="px-1.5 py-0.5 rounded-md bg-warning/15 text-warning text-2xs font-semibold">IA</span>}
    </label>
    {children}
    {hint && (
      <p id={`${id}-dica`} className="text-2xs text-muted-foreground leading-relaxed">
        {hint}
      </p>
    )}
  </div>
);

/**
 * Passo 3: o ambiente novo. Nome, versão do WinThor e de onde vem o banco, lado a lado com o rótulo em cima e a dica
 * embaixo. Portas, WSH e configuração ficam em Ajustes.
 */
export const InfrNewVersionFields: React.FC<{
  s: InfrNewVersionState;
  /** Campos que a IA preencheu e a pessoa ainda não editou */
  filled: string[];
  onEdited: (field: keyof InfrNewVersionForm) => void;
}> = ({ s, filled, onEdited }) => {
  const { form } = s;
  const set = (field: keyof InfrNewVersionForm, value: string) => {
    s.update(field, value);
    onEdited(field);
  };
  const ai = (f: string) => filled.includes(f);
  const dbOptions: { mode: InfrDbMode; label: string; hint: string }[] = [
    { mode: 'clone', label: `Cópia do ${form.dbSource || 'Oracle de origem'}`, hint: 'Restaura por RMAN, uns 10 min.' },
    { mode: 'empty', label: 'Oracle vazio', hint: 'Importe o dump depois.' },
    { mode: 'existing', label: 'Usar um Oracle existente', hint: 'Usa o banco como ele está, sem copiar.' }
  ];
  const dbHint = dbOptions.find((o) => o.mode === form.dbMode)?.hint;
  // Clone com a imagem da origem fora do padrão: a versão não vem dela, então a pessoa informa
  const locked = s.clone && !!s.originVersion;
  const versionHint = locked
    ? 'Igual à origem'
    : s.clone
      ? 'A imagem da origem não diz a versão'
      : s.originVersion
        ? form.version === s.originVersion
          ? 'Igual à origem'
          : `A origem está na ${s.originVersion}`
        : undefined;

  return (
    <section aria-labelledby="nv-passo-novo" className="space-y-2.5">
      <InfrStepTitle n={3} id="nv-passo-novo">
        O ambiente novo
      </InfrStepTitle>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3 rounded-xl border border-border/80 bg-card p-4">
        <Field id="nv-nome" label="Nome" hint="Vira oracle-, wta- e wsh-<nome>" ai={ai('name')}>
          <input
            id="nv-nome"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="homolog"
            aria-describedby="nv-nome-dica"
            className={`${FIELD} font-mono ${tone(ai('name'))}`}
          />
        </Field>
        <Field id="nv-versao" label="Versão do WinThor" hint={versionHint} ai={ai('version')}>
          {locked ? (
            <input id="nv-versao" value={form.version || '…'} readOnly aria-describedby="nv-versao-dica" className={`${FIELD} font-mono bg-muted/50`} />
          ) : (
            <input
              id="nv-versao"
              value={form.version}
              onChange={(e) => set('version', e.target.value)}
              placeholder="40"
              inputMode="numeric"
              aria-describedby={versionHint ? 'nv-versao-dica' : undefined}
              className={`${FIELD} font-mono ${tone(ai('version'))}`}
            />
          )}
        </Field>
        <Field id="nv-banco" label="Banco" hint={dbHint} ai={ai('dbMode')}>
          <select id="nv-banco" value={form.dbMode} onChange={(e) => set('dbMode', e.target.value)} aria-describedby="nv-banco-dica" className={`${FIELD} ${tone(ai('dbMode'))}`}>
            {dbOptions.map((o) => (
              <option key={o.mode} value={o.mode}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </section>
  );
};
