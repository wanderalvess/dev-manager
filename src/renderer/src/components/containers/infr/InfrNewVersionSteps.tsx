import React from 'react';
import { CheckCircle2, RotateCw } from 'lucide-react';
import type { InfrContainerInfo, InfrDbMode } from '../../../../../shared/infrWinthorVersion';
import type { InfrNewVersionState } from '../../../hooks/containers/useInfrNewVersion';
import { InfrEnvConfigSection } from './InfrEnvConfigSection';

export const NV_INPUT =
  'w-full bg-background border border-input rounded-[10px] px-3 py-2.5 text-sm text-foreground font-mono focus:outline-hidden focus:ring-2 focus:ring-warning/60';
const LABEL = 'text-xs font-semibold text-foreground block mb-1.5';
const HELP = 'text-2xs text-muted-foreground mt-1.5 leading-snug';

const DB_MODES: { mode: InfrDbMode; label: string; hint: string }[] = [
  { mode: 'clone', label: 'Copiar um banco', hint: 'Backup RMAN de um Oracle restaurado num Oracle novo. A origem não muda.' },
  { mode: 'existing', label: 'Usar um Oracle que já existe', hint: 'O ambiente novo aponta para ele. O WTA da versão nova pode alterar as tabelas.' },
  { mode: 'empty', label: 'Oracle vazio', hint: 'Sobe sem dados; você importa o dump da versão depois.' }
];

const StateDot: React.FC<{ c?: InfrContainerInfo; label: string }> = ({ c, label }) => (
  <span className="inline-flex items-center gap-1.5 text-2xs text-foreground/80">
    <span className={`w-2 h-2 rounded-full ${!c ? 'bg-muted-foreground/40' : c.state === 'running' ? 'bg-success' : 'bg-danger'}`} />
    {c ? `${c.name} ${c.state === 'running' ? 'rodando' : `(${c.state})`}` : `sem ${label}`}
  </span>
);

/** Passo 1: de qual ambiente partir, para qual versão e com que nome. */
export const StepOrigin: React.FC<{ s: InfrNewVersionState }> = ({ s }) => {
  const { form, update, envs } = s;
  const origin = envs?.environments.find((e) => e.name === form.from);
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <label htmlFor="nv-origem" className="text-xs font-semibold text-foreground">Ambiente que já funciona</label>
          <button type="button" onClick={s.loadEnvironments} className="text-2xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer">
            <RotateCw className={`w-3 h-3 ${s.loadingEnvs ? 'animate-spin' : ''}`} /> Atualizar lista
          </button>
        </div>
        <select id="nv-origem" value={form.from} onChange={(e) => update('from', e.target.value)} className={NV_INPUT}>
          {!envs?.environments.length && <option value="">{s.loadingEnvs ? 'Procurando ambientes...' : 'Nenhum ambiente wta-* na distro'}</option>}
          {envs?.environments.map((e) => (
            <option key={e.name} value={e.name}>
              {e.name} · {e.wta?.image}
            </option>
          ))}
        </select>
        {envs && !envs.success && <p className="text-2xs text-danger mt-1.5">{envs.error}</p>}
        {origin && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            <StateDot c={origin.oracle} label="Oracle" />
            <StateDot c={origin.wta} label="WTA" />
            <StateDot c={origin.wsh} label="WSH" />
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="nv-versao" className={LABEL}>Versão nova do WinThor</label>
          <input id="nv-versao" value={form.version} onChange={(e) => update('version', e.target.value)} placeholder="40" inputMode="numeric" className={NV_INPUT} />
          <p className={HELP}>A imagem linux-winthor:{form.version || '<versão>'}-debian é montada se ainda não existir.</p>
        </div>
        <div>
          <label htmlFor="nv-nome" className={LABEL}>Nome do ambiente novo</label>
          <input id="nv-nome" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="develop" className={NV_INPUT} />
          <p className={HELP}>
            Vira o sufixo dos containers: oracle-{form.name || '<nome>'}, wta-{form.name || '<nome>'}, wsh-{form.name || '<nome>'}.
          </p>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-foreground/80 p-3 rounded-xl bg-info/5 border border-info/20">
        As features da versão nova saem do catálogo da rotina 801 do WTA de origem. Se o INFR-Docker já tem a lista dessa versão, você
        escolhe no último passo se mantém a lista ou a substitui.
      </p>
    </div>
  );
};

/** Passo 2: de onde vem o banco do ambiente novo. */
export const StepDatabase: React.FC<{ s: InfrNewVersionState }> = ({ s }) => {
  const { form, update, envs } = s;
  return (
    <div className="space-y-5">
      <fieldset className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <legend className="sr-only">De onde vem o banco</legend>
        {DB_MODES.map((m) => (
          <label
            key={m.mode}
            className={`p-3 rounded-xl border cursor-pointer text-xs transition ${form.dbMode === m.mode ? 'border-warning bg-warning/5 ring-1 ring-warning/40' : 'border-border hover:bg-muted/40'}`}
          >
            <span className="flex items-center gap-2 font-semibold text-foreground">
              <input type="radio" name="nv-db" className="accent-warning w-4 h-4" checked={form.dbMode === m.mode} onChange={() => update('dbMode', m.mode)} />
              {m.label}
            </span>
            <span className="block text-2xs text-muted-foreground mt-1.5 leading-snug">{m.hint}</span>
          </label>
        ))}
      </fieldset>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {form.dbMode === 'clone' && (
          <div>
            <label htmlFor="nv-db-src" className={LABEL}>Copiar de</label>
            <select id="nv-db-src" value={form.dbSource} onChange={(e) => update('dbSource', e.target.value)} className={NV_INPUT}>
              {!envs?.oracles.some((o) => o.name === form.dbSource) && <option value={form.dbSource}>{form.dbSource || '—'}</option>}
              {envs?.oracles.map((o) => (
                <option key={o.name} value={o.name}>
                  {o.name} ({o.state})
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="nv-db" className={LABEL}>{form.dbMode === 'existing' ? 'Oracle a usar' : 'Nome do Oracle novo'}</label>
          {form.dbMode === 'existing' ? (
            <select id="nv-db" value={form.dbContainer} onChange={(e) => update('dbContainer', e.target.value)} className={NV_INPUT}>
              <option value="">Escolha...</option>
              {envs?.oracles.map((o) => (
                <option key={o.name} value={o.name}>
                  {o.name} ({o.state})
                </option>
              ))}
            </select>
          ) : (
            <input id="nv-db" value={form.dbContainer} onChange={(e) => update('dbContainer', e.target.value)} placeholder="oracle-develop" className={NV_INPUT} />
          )}
        </div>
        {form.dbMode !== 'existing' && (
          <div>
            <label htmlFor="nv-db-port" className={LABEL}>Porta do Oracle no Windows</label>
            <input id="nv-db-port" value={form.oraclePort} onChange={(e) => update('oraclePort', e.target.value)} inputMode="numeric" className={NV_INPUT} />
          </div>
        )}
      </div>
    </div>
  );
};

/** Passo 3: portas do WTA e do WSH, o jar do WSH e a configuração copiada da origem. */
export const StepRuntime: React.FC<{ s: InfrNewVersionState }> = ({ s }) => {
  const { form, update, envs } = s;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="nv-wta-port" className={LABEL}>Porta do WTA no Windows</label>
          <input id="nv-wta-port" value={form.wtaPort} onChange={(e) => update('wtaPort', e.target.value)} inputMode="numeric" className={NV_INPUT} />
        </div>
        <div>
          <label htmlFor="nv-jar" className={LABEL}>Jar do WSH</label>
          <select id="nv-jar" value={form.wshJar} onChange={(e) => update('wshJar', e.target.value)} className={NV_INPUT}>
            <option value="">Sem WSH (criar depois)</option>
            {envs?.wshJars.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
          <p className={HELP}>O de produção serve: o WSH só cobra versão mínima das features.</p>
        </div>
        <div>
          <label htmlFor="nv-wsh-port" className={LABEL}>Porta do WSH no Windows</label>
          <input id="nv-wsh-port" value={form.wshPort} onChange={(e) => update('wshPort', e.target.value)} disabled={!form.wshJar} inputMode="numeric" className={`${NV_INPUT} disabled:opacity-50`} />
        </div>
      </div>
      <InfrEnvConfigSection s={s} />
      <details className="rounded-xl border border-border/80 px-4 py-3">
        <summary className="text-xs font-semibold text-foreground cursor-pointer">Avançado: URL do WTA de origem</summary>
        <label htmlFor="nv-url" className="text-2xs text-muted-foreground block mt-3 mb-1.5">
          Vazio usa a porta publicada do wta-{form.from || '<origem>'}. É dele que vem o catálogo da 801.
        </label>
        <input id="nv-url" value={form.originWtaUrl} onChange={(e) => update('originWtaUrl', e.target.value)} placeholder="http://localhost:8038" className={NV_INPUT} />
      </details>
      <p className="text-2xs text-muted-foreground flex items-center gap-1.5">
        <CheckCircle2 className="w-3.5 h-3.5 text-success" /> No próximo passo o Hub lê a origem e o catálogo e mostra o que vai acontecer, antes de gerar.
      </p>
    </div>
  );
};
