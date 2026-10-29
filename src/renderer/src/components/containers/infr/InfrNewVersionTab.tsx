import React, { useEffect } from 'react';
import { GitBranchPlus, RotateCw, Search, Play } from 'lucide-react';
import type { InfrContainerInfo, InfrDbMode } from '../../../../../shared/infrWinthorVersion';
import type { InfrNewVersionState } from '../../../hooks/containers/useInfrNewVersion';
import { InfrNewVersionPreview } from './InfrNewVersionPreview';

const INPUT =
  'w-full bg-background border border-input/80 rounded-[10px] px-2.5 py-2 text-sm text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-warning';
const LABEL = 'text-2xs font-semibold text-muted-foreground block mb-1';
const BOX = 'p-4 bg-card border border-border/80 rounded-xl space-y-3';

const DB_MODES: { mode: InfrDbMode; label: string; hint: string }[] = [
  { mode: 'clone', label: 'Clonar um banco', hint: 'Backup RMAN do Oracle escolhido restaurado num Oracle novo.' },
  { mode: 'existing', label: 'Usar um Oracle existente', hint: 'O ambiente novo aponta para um Oracle que já roda.' },
  { mode: 'empty', label: 'Oracle vazio', hint: 'Cria o Oracle sem dados; você importa o dump da versão depois.' }
];

const StateDot: React.FC<{ c?: InfrContainerInfo; label: string }> = ({ c, label }) => (
  <span className="inline-flex items-center gap-1 text-2xs text-muted-foreground">
    <span className={`w-1.5 h-1.5 rounded-full ${!c ? 'bg-muted-foreground/30' : c.state === 'running' ? 'bg-success' : 'bg-danger'}`} />
    {c ? `${c.name} (${c.state})` : `sem ${label}`}
  </span>
);

/** Aba Nova versão: escolhe a origem, a versão, o banco, as portas e o WSH, e gera pelo catálogo da 801. */
export const InfrNewVersionTab: React.FC<{ s: InfrNewVersionState }> = ({ s }) => {
  const { form, update, envs } = s;
  const { loadEnvironments } = s;
  useEffect(() => {
    if (!envs) loadEnvironments();
  }, [envs, loadEnvironments]);
  const origin = envs?.environments.find((e) => e.name === form.from);

  return (
    <div className="space-y-4">
      <div className="bg-warning/5 border border-warning/20 rounded-xl p-3 flex items-start gap-3 text-xs leading-relaxed text-muted-foreground">
        <GitBranchPlus className="w-4 h-4 text-warning shrink-0 mt-0.5" />
        <div>
          <strong className="text-foreground font-semibold block mb-0.5">Nova versão a partir de um ambiente</strong>
          Lê as features do WTA de origem, sobe cada uma pelo catálogo de atualizações da rotina 801 até a versão nova (sem passar dela) e confere
          com o que o WSH da versão exige. Ao gerar, grava <code className="font-mono text-foreground">versions/&lt;versão&gt;.features</code> e abre o
          terminal com o <code className="font-mono text-foreground">new_version_env.sh</code>: imagem, banco, WTA e WSH.
        </div>
      </div>

      <div className={BOX}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">Origem {envs?.distro && <span className="text-muted-foreground font-normal">· {envs.distro}</span>}</span>
          <button onClick={loadEnvironments} className="text-2xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer">
            <RotateCw className={`w-3 h-3 ${s.loadingEnvs ? 'animate-spin' : ''}`} /> Atualizar
          </button>
        </div>
        {envs && !envs.success && <p className="text-2xs text-danger">{envs.error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <label className={LABEL}>Ambiente de origem</label>
            <select value={form.from} onChange={(e) => update('from', e.target.value)} className={INPUT}>
              {!envs?.environments.length && <option value="">{s.loadingEnvs ? 'Carregando...' : 'Nenhum ambiente wta-*'}</option>}
              {envs?.environments.map((e) => (
                <option key={e.name} value={e.name}>{e.name} · {e.wta?.image}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Versão nova</label>
            <input value={form.version} onChange={(e) => update('version', e.target.value)} placeholder="40" inputMode="numeric" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Nome do ambiente novo</label>
            <input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="develop" className={INPUT} />
          </div>
        </div>
        {origin && (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <StateDot c={origin.oracle} label="Oracle" />
            <StateDot c={origin.wta} label="WTA" />
            <StateDot c={origin.wsh} label="WSH" />
          </div>
        )}
      </div>

      <div className={BOX}>
        <span className="text-xs font-semibold text-foreground">Banco do ambiente novo</span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {DB_MODES.map((m) => (
            <label key={m.mode} className={`p-2.5 rounded-lg border cursor-pointer text-2xs ${form.dbMode === m.mode ? 'border-warning bg-warning/5' : 'border-border/70'}`}>
              <input type="radio" className="mr-1.5" checked={form.dbMode === m.mode} onChange={() => update('dbMode', m.mode)} />
              <strong className="text-foreground">{m.label}</strong>
              <span className="block text-muted-foreground mt-0.5">{m.hint}</span>
            </label>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {form.dbMode === 'clone' && (
            <div>
              <label className={LABEL}>Clonar de</label>
              <select value={form.dbSource} onChange={(e) => update('dbSource', e.target.value)} className={INPUT}>
                {!envs?.oracles.some((o) => o.name === form.dbSource) && <option value={form.dbSource}>{form.dbSource || '—'}</option>}
                {envs?.oracles.map((o) => <option key={o.name} value={o.name}>{o.name} ({o.state})</option>)}
              </select>
            </div>
          )}
          <div>
            <label className={LABEL}>{form.dbMode === 'existing' ? 'Oracle a usar' : 'Oracle novo'}</label>
            {form.dbMode === 'existing' ? (
              <select value={form.dbContainer} onChange={(e) => update('dbContainer', e.target.value)} className={INPUT}>
                <option value="">Escolha...</option>
                {envs?.oracles.map((o) => <option key={o.name} value={o.name}>{o.name} ({o.state})</option>)}
              </select>
            ) : (
              <input value={form.dbContainer} onChange={(e) => update('dbContainer', e.target.value)} placeholder="oracle-develop" className={INPUT} />
            )}
          </div>
          {form.dbMode !== 'existing' && (
            <div>
              <label className={LABEL}>Porta do Oracle</label>
              <input value={form.oraclePort} onChange={(e) => update('oraclePort', e.target.value)} className={INPUT} />
            </div>
          )}
        </div>
      </div>

      <div className={BOX}>
        <span className="text-xs font-semibold text-foreground">WTA e WSH</span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={LABEL}>Porta do WTA</label>
            <input value={form.wtaPort} onChange={(e) => update('wtaPort', e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Jar do WSH da versão</label>
            <select value={form.wshJar} onChange={(e) => update('wshJar', e.target.value)} className={INPUT}>
              <option value="">Sem WSH (criar depois)</option>
              {envs?.wshJars.map((j) => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Porta do WSH</label>
            <input value={form.wshPort} onChange={(e) => update('wshPort', e.target.value)} disabled={!form.wshJar} className={`${INPUT} disabled:opacity-50`} />
          </div>
        </div>
        <div>
          <label className={LABEL}>URL do WTA de origem (catálogo da 801) — vazio usa a porta publicada do wta-{form.from || '<origem>'}</label>
          <input value={form.originWtaUrl} onChange={(e) => update('originWtaUrl', e.target.value)} placeholder="http://localhost:8086" className={INPUT} />
        </div>
      </div>

      <button
        onClick={s.runPreview}
        disabled={!s.canPreview}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-warning text-warning rounded-lg text-xs font-bold transition cursor-pointer disabled:opacity-50"
      >
        {s.busy === 'preview' ? <RotateCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        <span>{s.busy === 'preview' ? 'Lendo a origem e o catálogo da 801...' : 'Pré-visualizar a versão nova'}</span>
      </button>

      {s.preview && <InfrNewVersionPreview preview={s.preview} version={form.version} />}

      {s.preview?.success && (
        <div className={BOX}>
          <div className="p-3 bg-[#090D14] rounded-lg border border-border/60 text-xs font-mono text-emerald-400 break-all">
            {s.command || 'Preencha o nome do ambiente novo (diferente da origem) para gerar.'}
          </div>
          <button
            onClick={s.generate}
            disabled={!s.command || s.busy !== null}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-warning text-white rounded-lg text-xs font-bold transition cursor-pointer disabled:opacity-50"
          >
            {s.busy === 'generate' ? <RotateCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            <span>Gerar versão {form.version} ({form.name || '...'})</span>
          </button>
          {s.message && <p className="text-2xs text-muted-foreground break-all">{s.message}</p>}
        </div>
      )}
    </div>
  );
};
