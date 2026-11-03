import React from 'react';
import type { InfrDbMode } from '../../../../../../shared/infrWinthorVersion';
import type { InfrNewVersionForm, InfrNewVersionState } from '../../../../hooks/containers/useInfrNewVersion';

const TOKEN =
  'inline-block align-middle h-10 mx-1 my-1 px-3 rounded-[10px] border bg-background text-base font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-warning/60';

/** Campo preenchido pela IA leva o sublinhado âmbar; origem com problema, o vermelho. */
const tone = (ai: boolean, bad = false) =>
  bad ? 'border-danger/60 shadow-[inset_0_-3px_0_hsl(var(--danger)/0.6)]' : ai ? 'border-warning/60 shadow-[inset_0_-3px_0_hsl(var(--warning)/0.7)]' : 'border-input';

/**
 * Nova versão numa frase: nome, versão, origem e de onde vem o banco. É o que antes eram os passos 1 e 2;
 * portas, WSH e configuração ficam em Ajustes.
 */
export const InfrNewVersionSentence: React.FC<{
  s: InfrNewVersionState;
  /** Campos que a IA preencheu e a pessoa ainda não editou */
  filled: string[];
  onEdited: (field: keyof InfrNewVersionForm) => void;
}> = ({ s, filled, onEdited }) => {
  const { form, envs } = s;
  const set = (field: keyof InfrNewVersionForm, value: string) => {
    s.update(field, value);
    onEdited(field);
  };
  const ai = (f: string) => filled.includes(f);
  const originBad = !!form.from && s.origin.blocked && !!s.origin.result;
  const dbOptions: { mode: InfrDbMode; label: string }[] = [
    { mode: 'clone', label: `copiado do ${form.dbSource || 'Oracle de origem'}` },
    { mode: 'existing', label: 'de um Oracle que já existe' },
    { mode: 'empty', label: 'vazio (importar o dump depois)' }
  ];

  return (
    <p className="text-xl leading-[2.6rem] font-medium text-foreground">
      Criar o ambiente
      <label htmlFor="nv-nome" className="sr-only">
        Nome do ambiente novo
      </label>
      <input
        id="nv-nome"
        value={form.name}
        onChange={(e) => set('name', e.target.value)}
        placeholder="nome"
        size={Math.max(form.name.length, 5)}
        className={`${TOKEN} font-mono ${tone(ai('name'))}`}
      />
      na versão
      <label htmlFor="nv-versao" className="sr-only">
        Versão nova do WinThor
      </label>
      <input
        id="nv-versao"
        value={form.version}
        onChange={(e) => set('version', e.target.value)}
        placeholder="40"
        inputMode="numeric"
        size={3}
        className={`${TOKEN} font-mono text-center ${tone(ai('version'))}`}
      />
      do WinThor, a partir do
      <label htmlFor="nv-origem" className="sr-only">
        Ambiente de origem
      </label>
      <select id="nv-origem" value={form.from} onChange={(e) => set('from', e.target.value)} className={`${TOKEN} font-mono ${tone(ai('from'), originBad)}`}>
        {!envs?.environments.length && <option value="">{s.loadingEnvs ? 'procurando...' : 'nenhum ambiente'}</option>}
        {envs?.environments.map((e) => (
          <option key={e.name} value={e.name}>
            {e.name}
          </option>
        ))}
      </select>
      , com o banco
      <label htmlFor="nv-banco" className="sr-only">
        De onde vem o banco
      </label>
      <select id="nv-banco" value={form.dbMode} onChange={(e) => set('dbMode', e.target.value)} className={`${TOKEN} ${tone(ai('dbMode'))}`}>
        {dbOptions.map((o) => (
          <option key={o.mode} value={o.mode}>
            {o.label}
          </option>
        ))}
      </select>
      .
    </p>
  );
};
