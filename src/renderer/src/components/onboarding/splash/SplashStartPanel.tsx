import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { ChangelogHighlight } from '../../../utils/changelogUtils';
import type { StartScreenData } from './useStartScreenData';
import { SplashWeatherCard } from './SplashWeatherCard';
import { ENV_STATE_LABEL, envState, formatSaved, formatUptime, topModules, type EnvState } from './startScreenUtils';

const CARD = 'rounded-2xl border border-border/70 bg-card/80 p-5 flex flex-col gap-3 min-w-0';
const EYEBROW = 'font-mono text-xs font-bold tracking-[0.14em] text-muted-foreground';
const STATE_DOT: Record<EnvState, string> = { up: 'bg-success', partial: 'bg-warning', down: 'bg-muted-foreground/50' };

const Bar: React.FC<{ percent: number; label: string }> = ({ percent, label }) => (
  <div className="flex flex-col gap-1">
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-semibold">{Math.round(percent)}%</span>
    </div>
    <div className="h-1.5 rounded-full bg-border overflow-hidden">
      <div className={`h-full rounded-full ${percent >= 85 ? 'bg-danger' : percent >= 65 ? 'bg-warning' : 'bg-primary'}`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  </div>
);

/**
 * Tela de início: o que é útil ver ao abrir o Hub, num relance. O PC, a semana no Hub, os ambientes WinThor, o clima e as
 * novidades da versão. Cada cartão aparece quando o dado chega; nenhum impede de entrar.
 */
export const SplashStartPanel: React.FC<{ data: StartScreenData; news: { version: string; items: ChangelogHighlight[] } | null; onWhatsNew: () => void }> = ({
  data,
  news,
  onWhatsNew
}) => {
  const m = data.metrics;
  const memTotalGb = m ? m.totalMemMb / 1024 : 0;
  const memUsedGb = m ? m.usedMemMb / 1024 : 0;
  const top = topModules(data.week?.summary ?? null);
  const envs = data.envs ?? [];

  return (
    <section aria-label="Tela de início" className="w-full grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <article aria-label="Este PC" className={CARD}>
        <span className={EYEBROW}>ESTE PC</span>
        <p className="m-0 text-lg font-bold truncate">{data.appInfo?.osHostname ?? '—'}</p>
        {m ? (
          <>
            <Bar label="Processador" percent={m.cpuUsagePercent} />
            <Bar label={`Memória · ${memUsedGb.toFixed(1)} de ${memTotalGb.toFixed(1)} GB`} percent={m.memUsagePercent} />
            <p className="m-0 text-xs text-muted-foreground">Ligado há {formatUptime(m.uptimeSeconds)}</p>
          </>
        ) : (
          <p className="m-0 text-sm text-muted-foreground">Lendo o processador e a memória...</p>
        )}
      </article>

      <article aria-label="Sua semana no Hub" className={CARD}>
        <span className={EYEBROW}>SUA SEMANA NO HUB</span>
        {data.usageOff ? (
          <p className="m-0 text-sm text-muted-foreground">A contagem de uso está desligada (Configurações → Meu uso).</p>
        ) : data.week ? (
          <>
            <p className="m-0 text-3xl font-extrabold leading-none">
              {data.week.summary.totalRuns}
              <span className="text-base font-semibold text-muted-foreground"> {data.week.summary.totalRuns === 1 ? 'automação' : 'automações'}</span>
            </p>
            <p className="m-0 text-sm">
              {data.week.savedMs > 0 ? (
                <>
                  <strong>{formatSaved(data.week.savedMs)}</strong> economizados
                </>
              ) : (
                'Nada contado nos últimos 7 dias.'
              )}
              {data.week.summary.totalFailed > 0 && <span className="text-muted-foreground"> · {data.week.summary.totalFailed} com falha</span>}
            </p>
            {top.length > 0 && (
              <ul className="m-0 p-0 list-none flex flex-col gap-1 text-xs">
                {top.map((t) => (
                  <li key={t.label} className="flex justify-between gap-2">
                    <span className="truncate">{t.label}</span>
                    <span className="font-mono text-muted-foreground">{t.runs}×</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="m-0 text-sm text-muted-foreground">Somando os últimos 7 dias...</p>
        )}
      </article>

      <SplashWeatherCard data={data} />

      <article aria-label="Ambientes WinThor" className={CARD}>
        <span className={EYEBROW}>AMBIENTES WINTHOR</span>
        {data.envs === null ? (
          <p className="m-0 text-sm text-muted-foreground">Procurando na distro WSL...</p>
        ) : envs.length === 0 ? (
          <p className="m-0 text-sm text-muted-foreground">Nenhum ambiente nesta máquina (ou o WSL está desligado).</p>
        ) : (
          <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
            {envs.slice(0, 5).map((e) => {
              const state = envState(e);
              return (
                <li key={e.name} className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${STATE_DOT[state]}`} aria-hidden="true" />
                  <span className="font-mono font-semibold truncate">{e.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{ENV_STATE_LABEL[state]}</span>
                </li>
              );
            })}
            {envs.length > 5 && <li className="text-xs text-muted-foreground">e mais {envs.length - 5}</li>}
          </ul>
        )}
      </article>

      {news && news.items.length > 0 && (
        <article aria-label="Novidades desta versão" className={`${CARD} col-span-full`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={EYEBROW}>NOVIDADES · v{news.version}</span>
            <button type="button" onClick={onWhatsNew} className="min-h-9 flex items-center gap-2 text-sm font-bold text-primary cursor-pointer hover:underline">
              Ver todas as novidades <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <ul className="m-0 p-0 list-none grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            {news.items.slice(0, 3).map((item) => (
              <li key={item.title} className="rounded-xl bg-muted/50 px-4 py-3">
                <strong>{item.title}</strong>
                {item.section === 'Corrigido' && <span className="text-info text-xs"> · corrigido</span>}
              </li>
            ))}
          </ul>
        </article>
      )}
    </section>
  );
};
