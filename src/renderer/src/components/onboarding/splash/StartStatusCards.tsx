import React from 'react';
import type { StartScreenData } from './useStartScreenData';
import { ENV_STATE_LABEL, envState, formatSaved, formatUptime, type EnvState } from './startScreenUtils';
import { formatHours, weekBars } from './startHomeUtils';
import { START_CARD, START_EYEBROW, START_ROW } from './startCardStyles';

const STATE_DOT: Record<EnvState, string> = { up: 'bg-success', partial: 'bg-warning', down: 'bg-muted-foreground/50' };

export const StartEnvCard: React.FC<{ data: StartScreenData; className?: string }> = ({ data, className = '' }) => {
  const envs = data.envs ?? [];
  return (
    <article aria-label="Ambientes WinThor" className={`${START_CARD} ${className}`}>
      <span className={START_EYEBROW}>Ambientes</span>
      {data.envs === null ? (
        <p className="m-0 text-xs sm:text-sm text-muted-foreground">Procurando na distro WSL...</p>
      ) : envs.length === 0 ? (
        <p className="m-0 text-xs sm:text-sm text-muted-foreground">Nenhum ambiente nesta máquina (ou o WSL está desligado).</p>
      ) : (
        <ul className="m-0 p-0 list-none flex flex-col gap-1 min-w-0">
          {envs.slice(0, 3).map((e) => {
            const state = envState(e);
            return (
              <li key={e.name} className={START_ROW}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${STATE_DOT[state]}`} aria-hidden="true" />
                <span className="font-mono text-xs font-bold truncate">{e.name}</span>
                <span className="ml-auto text-2xs text-muted-foreground shrink-0">{ENV_STATE_LABEL[state]}</span>
              </li>
            );
          })}
          {envs.length > 3 && <li className="text-2xs text-muted-foreground px-1">+{envs.length - 3} mais</li>}
        </ul>
      )}
    </article>
  );
};

const Gauge: React.FC<{ label: string; percent: number }> = ({ label, percent }) => {
  const p = Math.min(100, Math.max(0, Math.round(percent)));
  const tone = p >= 85 ? 'stroke-danger' : p >= 65 ? 'stroke-warning' : 'stroke-primary';
  return (
    <div className="flex flex-col items-center gap-1" role="meter" aria-label={label} aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}>
      <div className="relative w-16 h-16 sm:w-17 sm:h-17">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90" aria-hidden="true">
          <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3" className="stroke-border" />
          <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3" strokeLinecap="round" className={`${tone} transition-[stroke-dasharray] duration-500`} strokeDasharray={`${p} ${100 - p}`} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg sm:text-xl font-extrabold">{p}%</span>
      </div>
      <span className="text-2xs sm:text-xs text-muted-foreground font-medium">{label}</span>
    </div>
  );
};

export const StartPcCard: React.FC<{ data: StartScreenData; className?: string }> = ({ data, className = '' }) => {
  const m = data.metrics;
  return (
    <article aria-label="Este PC" className={`${START_CARD} ${className}`}>
      <span className={`${START_EYEBROW} truncate`}>Este PC{data.appInfo?.osHostname ? ` · ${data.appInfo.osHostname}` : ''}</span>
      {m ? (
        <>
          <div className="flex-1 grid grid-cols-2 gap-2 items-center">
            <Gauge label="Processador" percent={m.cpuUsagePercent} />
            <Gauge label="Memória" percent={m.memUsagePercent} />
          </div>
          <p className="m-0 text-2xs sm:text-xs text-muted-foreground truncate">
            {(m.usedMemMb / 1024).toFixed(1)} de {(m.totalMemMb / 1024).toFixed(1)} GB · ligado há {formatUptime(m.uptimeSeconds)}
          </p>
        </>
      ) : (
        <p className="m-0 text-xs sm:text-sm text-muted-foreground">Lendo o processador e a memória...</p>
      )}
    </article>
  );
};

export const StartWeekCard: React.FC<{ data: StartScreenData; className?: string }> = ({ data, className = '' }) => {
  const jiraOn = !!data.jira?.success;
  const { bars, unit } = weekBars(new Date(), data.jira, data.week?.days ?? null);
  const runs = data.week?.summary.totalRuns ?? 0;
  return (
    <article aria-label="Sua semana" className={`${START_CARD} ${className}`}>
      <span className={START_EYEBROW}>Sua semana</span>
      <div className="flex-1 flex items-end gap-4 min-w-0">
        <div className="flex flex-col justify-end gap-2 shrink-0">
          {data.usageOff ? (
            <p className="m-0 max-w-44 text-xs text-muted-foreground">A contagem de uso está desligada (Configurações › Meu uso).</p>
          ) : (
            <div>
              <p className="m-0 text-3xl font-extrabold tracking-tight leading-none">{data.week ? runs : '–'}</p>
              <p className="m-0 mt-0.5 text-xs text-muted-foreground">
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
              <p className="m-0 text-3xl font-extrabold tracking-tight leading-none">{formatHours(data.jira!.weekSeconds)}</p>
              <p className="m-0 mt-0.5 text-xs text-muted-foreground">lançadas no Jira desde segunda</p>
            </div>
          )}
        </div>
        <div
          className="flex-1 h-24 grid grid-cols-7 gap-1.5 items-end min-w-0"
          role="img"
          aria-label={unit === 'hours' ? 'Horas lançadas no Jira por dia da semana' : 'Automações por dia da semana'}
        >
          {bars.map((b) => (
            <div key={b.day} className="h-full flex flex-col items-center justify-end gap-1" title={unit === 'hours' ? formatHours(b.value) : `${b.value}`}>
              <span
                className={`w-full rounded-md ${b.today ? 'bg-primary' : b.future ? 'bg-border/50' : 'bg-primary/25'}`}
                style={{ height: `${Math.max(b.percent, 6)}%` }}
              />
              <span className={`font-mono text-2xs ${b.today ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>{b.label}</span>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
};
