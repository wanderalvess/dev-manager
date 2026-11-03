import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { InfrNewVersionForm, InfrNewVersionState } from '../../../../hooks/containers/useInfrNewVersion';
import { InfrEnvConfigSection } from '../InfrEnvConfigSection';

const INPUT =
  'w-full h-9 bg-background border border-input rounded-lg px-2.5 text-sm text-foreground font-mono focus:outline-hidden focus:ring-2 focus:ring-warning/60 disabled:opacity-50';
const LABEL = 'text-xs font-semibold text-foreground block mb-1';
const HELP = 'text-2xs text-muted-foreground mt-1 leading-snug';

const Value: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <span className="text-xs text-foreground/80">
    {label} <strong className="font-semibold text-foreground">{children}</strong>
  </span>
);

/** Ajustes da Nova versão: banco, portas, WSH, a configuração copiada da origem e o avançado. Fechado mostra os valores. */
export const InfrNewVersionAdjust: React.FC<{ s: InfrNewVersionState; open: boolean; onToggle: () => void }> = ({ s, open, onToggle }) => {
  const { form, update, envs } = s;
  const jar = form.wshJar.split('/').pop();
  const field = (id: keyof InfrNewVersionForm, label: string, opts: { disabled?: boolean; help?: string } = {}) => (
    <div>
      <label htmlFor={`nv-${id}`} className={LABEL}>
        {label}
      </label>
      <input id={`nv-${id}`} value={form[id]} onChange={(e) => update(id, e.target.value)} disabled={opts.disabled} inputMode="numeric" className={INPUT} />
      {opts.help && <p className={HELP}>{opts.help}</p>}
    </div>
  );

  return (
    <section className="rounded-xl border border-border/80 bg-card">
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-3 text-left cursor-pointer">
        <span className="text-sm font-semibold text-foreground">Ajustes</span>
        {!open && (
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <Value label="Oracle">{form.dbMode === 'existing' ? form.dbContainer || '—' : `${form.dbContainer || '—'} :${form.oraclePort || '?'}`}</Value>
            <Value label="WTA">:{form.wtaPort || '?'}</Value>
            <Value label="WSH">{form.wshJar ? `${jar} :${form.wshPort || '?'}` : 'sem'}</Value>
            <Value label="Configuração">copiada do {form.from || '—'}</Value>
            {form.dryRun === '1' && <Value label="Ensaio no Karaf">sim</Value>}
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-warning">
          {open ? 'Fechar' : 'Editar'} <ChevronDown className={`w-3.5 h-3.5 transition ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-5 border-t border-border/60">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3">
            {form.dbMode === 'clone' && (
              <div>
                <label htmlFor="nv-db-src" className={LABEL}>
                  Copiar o banco de
                </label>
                <select id="nv-db-src" value={form.dbSource} onChange={(e) => update('dbSource', e.target.value)} className={INPUT}>
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
              <label htmlFor="nv-db" className={LABEL}>
                {form.dbMode === 'existing' ? 'Oracle a usar' : 'Nome do Oracle novo'}
              </label>
              {form.dbMode === 'existing' ? (
                <select id="nv-db" value={form.dbContainer} onChange={(e) => update('dbContainer', e.target.value)} className={INPUT}>
                  <option value="">Escolha...</option>
                  {envs?.oracles.map((o) => (
                    <option key={o.name} value={o.name}>
                      {o.name} ({o.state})
                    </option>
                  ))}
                </select>
              ) : (
                <input id="nv-db" value={form.dbContainer} onChange={(e) => update('dbContainer', e.target.value)} className={INPUT} />
              )}
              {form.dbMode === 'existing' && <p className={HELP}>O WTA da versão nova pode alterar as tabelas dele.</p>}
            </div>
            {form.dbMode !== 'existing' && field('oraclePort', 'Porta do Oracle no Windows')}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {field('wtaPort', 'Porta do WTA no Windows')}
            <div>
              <label htmlFor="nv-jar" className={LABEL}>
                Jar do WSH
              </label>
              <select id="nv-jar" value={form.wshJar} onChange={(e) => update('wshJar', e.target.value)} className={INPUT}>
                <option value="">Sem WSH (criar depois)</option>
                {envs?.wshJars.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
              <p className={HELP}>{envs?.wshJars.length ? 'O de produção serve: o WSH só cobra versão mínima das features.' : 'Nenhum jar em /opt da distro.'}</p>
            </div>
            {field('wshPort', 'Porta do WSH no Windows', { disabled: !form.wshJar })}
          </div>

          <InfrEnvConfigSection s={s} />

          <div className="space-y-3 pt-1">
            <p className="text-xs font-semibold text-foreground">Avançado</p>
            <div>
              <label htmlFor="nv-url" className="text-2xs text-muted-foreground block mb-1">
                URL do WTA de origem. Vazio usa a porta publicada do wta-{form.from || '<origem>'}; é dele que vem o catálogo da 801.
              </label>
              <input id="nv-url" value={form.originWtaUrl} onChange={(e) => update('originWtaUrl', e.target.value)} placeholder="http://localhost:8038" className={INPUT} />
            </div>
            <label htmlFor="nv-dry" className="flex items-start gap-2 text-2xs text-muted-foreground cursor-pointer">
              <input id="nv-dry" type="checkbox" checked={form.dryRun === '1'} onChange={(e) => update('dryRun', e.target.checked ? '1' : '')} className="mt-0.5" />
              <span>
                <strong className="text-foreground">Ensaiar a resolução no Karaf de origem</strong> (feature:install -t). O Karaf simula as features trocadas antes do
                build; leva alguns minutos e acrescenta os repositórios novos ao Karaf do wta-{form.from || '<origem>'} só durante o teste.
              </span>
            </label>
          </div>
        </div>
      )}
    </section>
  );
};
