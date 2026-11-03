import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, CircleDashed, GitBranchPlus, RotateCw, XCircle } from 'lucide-react';
import { infrCheckCommands, type InfrCheckCommandId, type InfrContainerCheck, type InfrEnvStatus } from '../../../../../shared/infrEnvCheck';
import type { InfrEnvCheckState } from '../../../hooks/containers/useInfrEnvCheck';
import type { InfrAiGuideState } from '../../../hooks/containers/useInfrAiGuide';
import { InfrCommandLine } from './InfrCommandLine';
import { InfrAiGuideLine } from './newversion/InfrAiGuideLine';
import { InfrVerifyNode } from './verify/InfrVerifyNode';
import { infrCheckBadge } from '../../../utils/infrBootstrapModalUtils';

const SUMMARY: Record<InfrEnvStatus, React.ReactNode> = {
  ok: <CheckCircle2 className="w-7 h-7 text-success" />,
  starting: <RotateCw className="w-7 h-7 text-warning" />,
  fail: <XCircle className="w-7 h-7 text-danger" />,
  missing: <CircleDashed className="w-7 h-7 text-muted-foreground" />
};

const LOG_ID: Record<InfrContainerCheck['role'], InfrCheckCommandId> = { oracle: 'logs-oracle', wta: 'logs-wta', wsh: 'logs-wsh' };
type Panel = InfrContainerCheck['role'] | 'build';

/** Depois do Gerar (ou a qualquer hora): o ambiente como pipeline Oracle → WTA → WSH e o log da parte escolhida. */
export const InfrVerifyTab: React.FC<{ v: InfrEnvCheckState; ai: InfrAiGuideState; envNames: string[]; onNewVersion: (name: string) => void }> = ({
  v,
  ai,
  envNames,
  onNewVersion
}) => {
  const r = v.result;
  const summary = r?.summary;
  const commands = infrCheckCommands(v.name, v.wtaPort);
  const [panel, setPanel] = useState<Panel | null>(null);
  const names = v.name && !envNames.includes(v.name) ? [...envNames, v.name] : envNames;

  useEffect(() => {
    if (!v.name && envNames.length) v.setName(envNames[0]);
  }, [v.name, envNames]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setPanel(null), [v.name]);

  // Sem escolha, abre o que mais interessa: o build que falhou, a primeira parte com problema, ou o WTA
  const containers = r?.success ? r.containers : [];
  const build = r?.success && r.buildLog && r.buildLog.tail.length > 0 ? r.buildLog : undefined;
  const wtaMissing = !containers.find((c) => c.role === 'wta')?.exists;
  const firstBad = containers.find((c) => c.exists && infrCheckBadge(c).tone !== 'up')?.role;
  const shown: Panel = panel ?? (build?.failure ? 'build' : firstBad ?? (build && wtaMissing ? 'build' : 'wta'));
  const sel = shown === 'build' ? undefined : containers.find((c) => c.role === shown);
  const showAi = ai.status === 'building' || ai.status === 'thinking' || ai.status === 'done';

  return (
    <div className="flex-1 min-w-0 overflow-auto scrollbar-thin">
      <div className="max-w-6xl mx-auto px-5 md:px-6 py-6 space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label="Ambiente" className="inline-flex flex-wrap gap-1 p-1 rounded-xl bg-muted/60">
            {names.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => v.setName(n)}
                aria-pressed={v.name === n}
                className={`h-8 px-3.5 rounded-lg font-mono text-xs cursor-pointer ${v.name === n ? 'bg-card text-foreground font-semibold shadow-xs' : 'text-foreground/70 hover:text-foreground'}`}
              >
                {n}
              </button>
            ))}
            {!names.length && (
              <input
                aria-label="Nome do ambiente"
                value={v.name}
                onChange={(e) => v.setName(e.target.value)}
                placeholder="nome do ambiente"
                className="h-8 w-44 px-2.5 rounded-lg border border-border bg-card text-xs font-mono text-foreground"
              />
            )}
          </div>
          <span className="flex-1" />
          <label className="inline-flex items-center gap-1.5 text-xs text-foreground/80">
            <input type="checkbox" checked={v.auto} onChange={(e) => v.setAuto(e.target.checked)} /> Conferir a cada 15 s enquanto sobe
          </label>
          <button
            type="button"
            onClick={v.check}
            disabled={!v.name.trim() || v.loading}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${v.loading ? 'animate-spin' : ''}`} /> Verificar de novo
          </button>
        </div>

        {r && !r.success && <p className="text-sm text-danger p-3 rounded-xl border border-danger/40 bg-danger/5 break-words">{r.error}</p>}
        {!r && v.loading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <RotateCw className="w-4 h-4 animate-spin text-warning" /> Lendo os containers de {v.name}, o log de cada um e se o WTA responde. Leva uns 15 s.
          </p>
        )}

        {summary && (
          <div className="flex flex-wrap items-start gap-3">
            <span className="shrink-0 mt-0.5">{SUMMARY[summary.status]}</span>
            <div className="flex-1 min-w-[16rem]">
              <h2 className="text-xl font-bold text-foreground tracking-tight">{summary.title}</h2>
              <p className="text-sm text-foreground/80 mt-1 break-words">
                {summary.detail}
                {r?.checkedAt && <span className="text-muted-foreground"> Lido às {new Date(r.checkedAt).toLocaleTimeString()}.</span>}
              </p>
            </div>
            {summary.status === 'ok' && (
              <button
                type="button"
                onClick={() => onNewVersion(v.name)}
                className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold text-warning hover:bg-warning/10 cursor-pointer"
              >
                <GitBranchPlus className="w-3.5 h-3.5" /> Copiar para outra versão
              </button>
            )}
          </div>
        )}

        {showAi && <InfrAiGuideLine ai={ai} blocked={false} />}

        {containers.length > 0 && (
          <div className="flex flex-wrap items-stretch gap-y-3">
            {containers.map((c, i) => (
              <React.Fragment key={c.role}>
                {i > 0 && (
                  <span aria-hidden="true" className="w-8 shrink-0 flex items-center justify-center text-muted-foreground/50">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
                <InfrVerifyNode
                  c={c}
                  selected={shown === c.role}
                  onSelect={() => setPanel(c.role)}
                  extra={
                    c.role === 'wta' && r?.wtaHttp ? (
                      <span className={`text-2xs ${r.wtaHttp.status && r.wtaHttp.status < 500 ? 'text-success' : 'text-warning'}`}>
                        {r.wtaHttp.url}: {r.wtaHttp.status ? `HTTP ${r.wtaHttp.status}` : r.wtaHttp.error}
                      </span>
                    ) : undefined
                  }
                />
              </React.Fragment>
            ))}
          </div>
        )}

        {(sel || (shown === 'build' && build)) && (
          <section aria-label="Log" className="rounded-xl border border-border/80 bg-card overflow-hidden">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 border-b border-border/70">
              <p className="text-sm font-bold text-foreground">{shown === 'build' ? `Build${build?.failure ? ' · falhou' : ''}` : `Log do ${sel?.container}`}</p>
              {shown === 'build' && build && <span className="font-mono text-2xs text-muted-foreground truncate">{build.path}</span>}
              {build && shown !== 'build' && (
                <button type="button" onClick={() => setPanel('build')} className="text-2xs font-semibold text-warning hover:underline cursor-pointer">
                  Ver o log do build
                </button>
              )}
              <span className="flex-1" />
              {sel?.exists && (
                <button
                  type="button"
                  onClick={() => v.run(LOG_ID[sel.role])}
                  className="h-8 px-3 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
                >
                  Abrir o log completo no terminal
                </button>
              )}
            </div>
            {shown === 'build' && build?.stage && <p className="px-4 pt-2 text-2xs text-muted-foreground">Última etapa: {build.stage}</p>}
            <pre className="m-0 px-4 py-3 min-h-[12rem] max-h-[22rem] overflow-auto bg-[#090D14] text-xs font-mono text-emerald-400 whitespace-pre-wrap break-all select-text">
              {shown === 'build' ? build?.tail.join('\n') : sel?.exists ? sel.logTail.join('\n') || '(log vazio)' : 'Este container ainda não existe.'}
            </pre>
          </section>
        )}

        {commands.length > 0 && (
          <details className="rounded-xl border border-border/80 bg-card">
            <summary className="px-4 py-3 text-sm font-semibold text-foreground cursor-pointer">
              Os mesmos testes no terminal <span className="font-normal text-muted-foreground">· {commands.length} comandos</span>
            </summary>
            <div className="px-4 pb-4 space-y-2.5">
              {commands.map((c) => (
                <InfrCommandLine key={c.id} label={c.label} command={c.command} onRun={() => v.run(c.id)} />
              ))}
              <p className="text-2xs text-muted-foreground">Executar abre o Windows Terminal na distro com o comando. Copiar leva o texto para colar no WSL.</p>
              {v.message && <p className="text-2xs text-foreground/80 break-all">{v.message}</p>}
            </div>
          </details>
        )}
      </div>
    </div>
  );
};
