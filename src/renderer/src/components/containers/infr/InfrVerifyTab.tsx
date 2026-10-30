import React from 'react';
import { AlertTriangle, CheckCircle2, CircleDashed, RotateCw, XCircle } from 'lucide-react';
import { INFR_ROLE_LABEL, infrCheckCommands, type InfrCheckCommandId, type InfrContainerCheck, type InfrEnvStatus } from '../../../../../shared/infrEnvCheck';
import type { InfrEnvCheckState } from '../../../hooks/containers/useInfrEnvCheck';
import { InfrCommandLine } from './InfrCommandLine';

const SUMMARY: Record<InfrEnvStatus, { icon: React.ReactNode; box: string }> = {
  ok: { icon: <CheckCircle2 className="w-6 h-6 text-success" />, box: 'border-success/40 bg-success/5' },
  starting: { icon: <RotateCw className="w-6 h-6 text-warning" />, box: 'border-warning/40 bg-warning/5' },
  fail: { icon: <XCircle className="w-6 h-6 text-danger" />, box: 'border-danger/40 bg-danger/5' },
  missing: { icon: <CircleDashed className="w-6 h-6 text-muted-foreground" />, box: 'border-border bg-muted/30' }
};

function badge(c: InfrContainerCheck): { text: string; tone: string } {
  if (!c.exists) return { text: 'Não existe', tone: 'bg-muted text-muted-foreground' };
  if (c.state === 'running' && c.health === 'unhealthy') return { text: 'Rodando · unhealthy', tone: 'bg-danger/10 text-danger' };
  if (c.state === 'running' && c.health === 'starting') return { text: 'Iniciando', tone: 'bg-warning/15 text-warning' };
  if (c.state === 'running') return { text: c.health ? `No ar · ${c.health}` : 'No ar', tone: 'bg-success/10 text-success' };
  if (c.state === 'restarting') return { text: 'Reiniciando', tone: 'bg-warning/15 text-warning' };
  return { text: c.state ?? '?', tone: 'bg-danger/10 text-danger' };
}

const LOG_ID: Record<InfrContainerCheck['role'], InfrCheckCommandId> = { oracle: 'logs-oracle', wta: 'logs-wta', wsh: 'logs-wsh' };

/** Depois do Gerar: o ambiente subiu? Estado, log e os mesmos testes para copiar ou abrir no terminal. */
export const InfrVerifyTab: React.FC<{ v: InfrEnvCheckState; envNames: string[] }> = ({ v, envNames }) => {
  const r = v.result;
  const summary = r?.summary;
  const commands = infrCheckCommands(v.name, v.wtaPort);

  return (
    <div className="flex-1 min-w-0 overflow-auto p-5 md:p-6 space-y-5 scrollbar-thin">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[16rem]">
          <h3 className="text-lg font-bold text-foreground">Verificar o ambiente</h3>
          <p className="text-sm text-foreground/80 mt-1">
            O Hub lê os containers oracle-, wta- e wsh-&lt;nome&gt; na distro{r?.distro ? ` ${r.distro}` : ''}, o fim do log de cada um e se o WTA responde.
          </p>
        </div>
        <label className="text-xs text-foreground/80 flex flex-col gap-1">
          Ambiente
          <input
            list="infr-verify-envs"
            value={v.name}
            onChange={(e) => v.setName(e.target.value)}
            placeholder="ex.: develop"
            className="h-9 w-48 px-2.5 rounded-lg border border-border bg-card text-sm font-mono text-foreground"
          />
          <datalist id="infr-verify-envs">
            {envNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </label>
        <button
          type="button"
          onClick={v.check}
          disabled={!v.name.trim() || v.loading}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted cursor-pointer disabled:opacity-50"
        >
          <RotateCw className={`w-3.5 h-3.5 ${v.loading ? 'animate-spin' : ''}`} /> Verificar de novo
        </button>
        <label className="h-9 inline-flex items-center gap-1.5 text-xs text-foreground/80">
          <input type="checkbox" checked={v.auto} onChange={(e) => v.setAuto(e.target.checked)} /> A cada 15 s enquanto sobe
        </label>
      </div>

      {r && !r.success && <p className="text-sm text-danger p-3 rounded-xl border border-danger/40 bg-danger/5 break-words">{r.error}</p>}

      {summary && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${SUMMARY[summary.status].box}`}>
          {SUMMARY[summary.status].icon}
          <div className="min-w-0">
            <p className="text-base font-bold text-foreground">{summary.title}</p>
            <p className="text-xs text-foreground/80 mt-0.5 break-words">
              {summary.detail}
              {r?.checkedAt && ` Lido às ${new Date(r.checkedAt).toLocaleTimeString()}.`}
            </p>
          </div>
        </div>
      )}

      {r?.success && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {r.containers.map((c) => {
            const b = badge(c);
            return (
              <article key={c.role} className="flex flex-col gap-2 p-4 rounded-xl border border-border/80 bg-card min-w-0">
                <div className="flex items-center gap-2">
                  <p className="flex-1 text-sm font-bold text-foreground">{INFR_ROLE_LABEL[c.role]}</p>
                  <span className={`text-2xs font-bold px-2 py-0.5 rounded-full ${b.tone}`}>{b.text}</span>
                </div>
                <code className="text-xs font-mono text-foreground">{c.container}</code>
                {c.exists ? (
                  <>
                    <p className="text-2xs text-muted-foreground break-words">
                      {c.image} · {c.ports.join(', ') || 'sem porta publicada'}
                      {c.restarts ? ` · ${c.restarts} reinícios` : ''}
                    </p>
                    {c.role === 'wta' && r.wtaHttp && (
                      <p className={`text-2xs ${r.wtaHttp.status && r.wtaHttp.status < 500 ? 'text-success' : 'text-warning'}`}>
                        {r.wtaHttp.url}: {r.wtaHttp.status ? `HTTP ${r.wtaHttp.status}` : r.wtaHttp.error}
                      </p>
                    )}
                    <pre className="flex-1 min-h-[7rem] max-h-56 overflow-auto p-2.5 bg-[#090D14] rounded-lg text-2xs font-mono text-emerald-400 whitespace-pre-wrap break-all select-text">
                      {c.logTail.join('\n') || '(log vazio)'}
                    </pre>
                    <button
                      type="button"
                      onClick={() => v.run(LOG_ID[c.role])}
                      className="h-8 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
                    >
                      Abrir o log completo no terminal
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-warning" /> Ainda não criado. O Gerar cria na ordem banco, WTA, WSH.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}

      {commands.length > 0 && (
        <section className="space-y-2.5 p-4 rounded-xl border border-border/80 bg-card">
          <p className="text-sm font-bold text-foreground">Os mesmos testes no terminal</p>
          {commands.map((c) => (
            <InfrCommandLine key={c.id} label={c.label} command={c.command} onRun={() => v.run(c.id)} />
          ))}
          <p className="text-2xs text-muted-foreground">Executar abre o Windows Terminal na distro com o comando. Copiar leva o texto para colar no WSL.</p>
          {v.message && <p className="text-2xs text-foreground/80 break-all">{v.message}</p>}
        </section>
      )}
    </div>
  );
};
