import React from 'react';
import type { StartScreenData } from './useStartScreenData';
import { ENV_STATE_LABEL, envState, formatSaved, formatUptime, type EnvState } from './startScreenUtils';
import { formatHours, weekBars } from './startHomeUtils';
import { START_CARD, START_EYEBROW, START_ROW } from './startCardStyles';

const STATE_DOT: Record<EnvState, string> = {
  up: 'bg-success',
  partial: 'bg-warning',
  down: 'bg-muted-foreground/50'
};
const STATE_TEXT: Record<EnvState, string> = {
  up: 'text-success',
  partial: 'text-warning',
  down: 'text-muted-foreground'
};

/** Bolinha "ao vivo" ao lado do título de um cartão que se atualiza sozinho. */
const LiveDot: React.FC = () => <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-success animate-live-dot shrink-0" />;

/** Um container do ambiente (banco, WTA, WSH) como etiqueta: acesa quando está rodando. */
const ServicePill: React.FC<{ label: string; state?: string }> = ({ label, state }) => {
  if (!state) return null;
  const on = state === 'running';
  return (
    <span
      title={`${label}: ${on ? 'rodando' : state}`}
      className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold leading-none ${on ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground/70'}`}
    >
      {label}
    </span>
  );
};

export const StartEnvCard: React.FC<{
  data: StartScreenData;
  className?: string;
}> = ({ data, className = '' }) => {
  const envs = data.envs ?? [];
  const states = envs.map(envState);
  const upCount = states.filter((s) => s === 'up').length;
  return (
    <article aria-label="Ambientes WinThor" className={`${START_CARD} @container ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={START_EYEBROW}>Ambientes</span>
        {envs.length > 0 && (
          <span className="font-mono text-2xs text-muted-foreground">
            <strong className="text-foreground">{upCount}</strong> de {envs.length} no ar
          </span>
        )}
      </div>
      {data.envs === null ? (
        <p className="m-0 text-xs sm:text-sm text-muted-foreground">Procurando na distro WSL...</p>
      ) : envs.length === 0 ? (
        <div className="flex-1 flex flex-col items-start justify-center gap-1.5">
          <p className="m-0 text-sm font-semibold">Nenhum ambiente por aqui.</p>
          <p className="m-0 text-xs text-muted-foreground leading-relaxed">
            Não há ambiente WinThor nesta máquina, ou o WSL está desligado.
          </p>
        </div>
      ) : (
        <ul className="m-0 p-0 list-none flex flex-col gap-1.5 min-w-0">
          {envs.slice(0, 4).map((e, i) => {
            const state = states[i];
            return (
              <li key={e.name} className={START_ROW}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${STATE_DOT[state]}`} aria-hidden="true" />
                <span className="font-mono text-xs font-bold truncate">{e.name}</span>
                <span className="ml-auto hidden @[20rem]:flex items-center gap-1 shrink-0">
                  <ServicePill label="ORA" state={e.oracle?.state} />
                  <ServicePill label="WTA" state={e.wta?.state} />
                  <ServicePill label="WSH" state={e.wsh?.state} />
                </span>
                <span className={`ml-auto @[20rem]:ml-0 w-14 text-right text-2xs font-semibold shrink-0 ${STATE_TEXT[state]}`}>{ENV_STATE_LABEL[state]}</span>
              </li>
            );
          })}
          {envs.length > 4 && <li className="text-2xs text-muted-foreground px-1">+{envs.length - 4} mais</li>}
        </ul>
      )}
      {envs.length > 0 && (
        <p className="m-0 mt-auto pt-1 hidden @[20rem]:flex items-center gap-1.5 text-2xs text-muted-foreground">
          <span className="px-1.5 py-0.5 rounded bg-success/15 text-success font-mono text-[10px] font-bold leading-none">WTA</span>
          etiqueta acesa: container rodando
        </p>
      )}
    </article>
  );
};

const Gauge: React.FC<{ label: string; percent: number; detail?: string }> = ({ label, percent, detail }) => {
  const p = Math.min(100, Math.max(0, Math.round(percent)));
  const tone = p >= 85 ? 'stroke-danger' : p >= 65 ? 'stroke-warning' : 'stroke-primary';
  return (
    <div
      className="flex flex-col items-center gap-1.5"
      role="meter"
      aria-label={label}
      aria-valuenow={p}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="relative w-20 h-20 2xl:w-24 2xl:h-24 [@media(max-height:900px)]:w-16 [@media(max-height:900px)]:h-16 [@media(max-height:900px)]:2xl:w-16 [@media(max-height:900px)]:2xl:h-16">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90" aria-hidden="true">
          <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="2.6" className="stroke-border" />
          <circle
            cx="18"
            cy="18"
            r="15.9"
            fill="none"
            strokeWidth="2.6"
            strokeLinecap="round"
            className={`${tone} transition-[stroke-dasharray] duration-700`}
            strokeDasharray={`${p} ${100 - p}`}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xl 2xl:text-2xl font-extrabold tabular-nums">
          {p}
          <span className="text-xs text-muted-foreground">%</span>
        </span>
      </div>
      <span className="text-xs font-semibold">{label}</span>
      {detail && <span className="-mt-1 font-mono text-2xs text-muted-foreground">{detail}</span>}
    </div>
  );
};

export const StartPcCard: React.FC<{
  data: StartScreenData;
  className?: string;
}> = ({ data, className = '' }) => {
  const m = data.metrics;
  return (
    <article aria-label="Este PC" className={`${START_CARD} ${className}`}>
      <span className={`${START_EYEBROW} flex items-center gap-2 min-w-0`}>
        {m && <LiveDot />}
        <span className="truncate">
          Este PC
          {data.appInfo?.osHostname ? ` · ${data.appInfo.osHostname}` : ''}
        </span>
      </span>
      {m ? (
        <>
          <div className="flex-1 grid grid-cols-2 gap-2 items-center">
            <Gauge label="Processador" percent={m.cpuUsagePercent} />
            <Gauge
              label="Memória"
              percent={m.memUsagePercent}
              detail={`${(m.usedMemMb / 1024).toFixed(1)} / ${(m.totalMemMb / 1024).toFixed(1)} GB`}
            />
          </div>
          <p className="m-0 text-2xs sm:text-xs text-muted-foreground truncate text-center">ligado há {formatUptime(m.uptimeSeconds)}</p>
        </>
      ) : (
        <p className="m-0 text-xs sm:text-sm text-muted-foreground">Lendo o processador e a memória...</p>
      )}
    </article>
  );
};

/** Horas curtas para caber em cima da barra: "3h45", "4h". */
const compactHours = (seconds: number): string => {
  const minutes = Math.round(seconds / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h${m ? String(m).padStart(2, '0') : ''}` : `${m}min`;
};

export const StartWeekCard: React.FC<{
  data: StartScreenData;
  className?: string;
}> = ({ data, className = '' }) => {
  const jiraOn = !!data.jira?.success;
  const { bars, unit } = weekBars(new Date(), data.jira, data.week?.days ?? null);
  const runs = data.week?.summary.totalRuns ?? 0;
  const barValue = (v: number) => (v <= 0 ? '' : unit === 'hours' ? compactHours(v) : `${v}`);
  return (
    <article aria-label="Sua semana" className={`${START_CARD} ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={START_EYEBROW}>Sua semana</span>
        <span className="font-mono text-2xs text-muted-foreground">
          {unit === 'hours' ? 'horas no Jira por dia' : 'automações por dia'}
        </span>
      </div>
      <div className="flex-1 min-h-0 flex items-stretch gap-5 min-w-0">
        <div className="flex flex-col justify-end gap-4 [@media(max-height:900px)]:gap-2 shrink-0">
          {data.usageOff ? (
            <p className="m-0 max-w-44 text-xs text-muted-foreground">A contagem de uso está desligada (Configurações › Meu uso).</p>
          ) : (
            <div>
              <p className="m-0 text-4xl [@media(max-height:900px)]:text-3xl font-extrabold tracking-tight leading-none tabular-nums">{data.week ? runs : '–'}</p>
              <p className="m-0 mt-1 text-xs text-muted-foreground">
                {runs === 1 ? 'automação' : 'automações'} em 7 dias
                {data.week && data.week.savedMs > 0 && (
                  <>
                    {' · '}
                    <strong className="text-success">{formatSaved(data.week.savedMs)}</strong> economizados
                  </>
                )}
              </p>
            </div>
          )}
          {jiraOn && (
            <div>
              <p className="m-0 text-4xl [@media(max-height:900px)]:text-3xl font-extrabold tracking-tight leading-none tabular-nums">{formatHours(data.jira!.weekSeconds)}</p>
              <p className="m-0 mt-1 text-xs text-muted-foreground">lançadas no Jira desde segunda</p>
            </div>
          )}
        </div>
        <div
          className="flex-1 min-h-24 [@media(max-height:900px)]:min-h-16 grid grid-cols-7 gap-1.5 sm:gap-2 items-end min-w-0"
          role="img"
          aria-label={unit === 'hours' ? 'Horas lançadas no Jira por dia da semana' : 'Automações por dia da semana'}
        >
          {bars.map((b) => (
            <div
              key={b.day}
              className="h-full flex flex-col items-center gap-1.5 min-w-0"
              title={unit === 'hours' ? formatHours(b.value) : `${b.value}`}
            >
              <span
                className={`font-mono text-[10px] leading-none truncate max-w-full ${b.today ? 'text-primary font-bold' : 'text-muted-foreground'}`}
              >
                {barValue(b.value)}
              </span>
              <span className="flex-1 min-h-0 w-full flex items-end">
                <span
                  className={`w-full rounded-lg transition-[height] duration-700 ${
                    b.today ? 'bg-primary shadow-md shadow-primary/30' : b.future ? 'bg-border/50' : 'bg-primary/25'
                  }`}
                  style={{ height: `${Math.max(b.percent, 4)}%` }}
                />
              </span>
              <span className={`font-mono text-2xs ${b.today ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>{b.label}</span>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
};
