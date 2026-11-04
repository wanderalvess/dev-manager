import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { ChangelogHighlight } from '../../../utils/changelogUtils';
import type { StartScreenData } from './useStartScreenData';
import { SplashWeatherCard } from './SplashWeatherCard';
import { StartContinueCard, StartJiraCard, StartJiraNotice } from './StartJiraCards';
import { StartEnvCard, StartPcCard, StartWeekCard } from './StartStatusCards';
import { StartShortcutsCard } from './StartShortcutsCard';

const NewsStrip: React.FC<{ news: { version: string; items: ChangelogHighlight[] }; onWhatsNew: () => void }> = ({ news, onWhatsNew }) => (
  <section aria-label="Novidades desta versão" className="min-h-12 px-5 rounded-2xl border border-border bg-card flex flex-wrap items-center gap-x-4 gap-y-1 py-2 text-sm min-w-0">
    <span className="font-mono text-2xs font-bold tracking-[0.14em] uppercase text-primary shrink-0">Novo · v{news.version}</span>
    <span className="flex-1 min-w-0 truncate text-muted-foreground">{news.items.slice(0, 3).map((i) => i.title).join(' · ')}</span>
    <button type="button" onClick={onWhatsNew} className="min-h-9 shrink-0 flex items-center gap-1.5 text-sm font-bold text-primary cursor-pointer hover:underline">
      Ver todas <ArrowRight className="w-4 h-4" />
    </button>
  </section>
);

/**
 * Tela de início: o que é útil ver ao abrir o Hub, num relance. Com o Jira, onde parei e o Jira do dia em cima; sem ele,
 * os módulos mais usados (o Jira é apresentado no onboarding, aqui não insistimos). Embaixo a semana, o PC e o clima, e
 * as novidades da versão numa faixa. Cada cartão aparece quando o dado chega; nenhum impede de entrar.
 */
export const SplashStartPanel: React.FC<{
  data: StartScreenData;
  news: { version: string; items: ChangelogHighlight[] } | null;
  onOpenTab: (tab: string) => void;
  onWhatsNew: () => void;
}> = ({ data, news, onOpenTab, onWhatsNew }) => {
  const jira = data.jira;
  // Lendo, ou cadastrado e com erro: o cartão do Jira; sem fonte Jira, os outros indicadores
  const jiraLayout = jira === null || jira.configured;
  return (
    <div className="w-full flex flex-col gap-4">
      <section aria-label="Tela de início" className="grid grid-cols-1 md:grid-cols-6 xl:grid-cols-12 gap-4 xl:auto-rows-[15.5rem]">
        {jiraLayout ? (
          <>
            {jira?.success ? (
              <>
                <StartContinueCard jira={jira} className="md:col-span-3 xl:col-span-5" />
                <StartJiraCard jira={jira} className="md:col-span-3 xl:col-span-4" />
              </>
            ) : (
              <StartJiraNotice jira={jira} onRetry={data.reloadJira} className="md:col-span-6 xl:col-span-9" />
            )}
            <StartEnvCard data={data} className="md:col-span-6 xl:col-span-3" />
            <StartWeekCard data={data} className="md:col-span-6 xl:col-span-5" />
            <StartPcCard data={data} className="md:col-span-3 xl:col-span-3" />
            <SplashWeatherCard data={data} className="md:col-span-3 xl:col-span-4" />
          </>
        ) : (
          <>
            <StartShortcutsCard data={data} onOpenTab={onOpenTab} className="md:col-span-6 xl:col-span-5" />
            <StartEnvCard data={data} className="md:col-span-3 xl:col-span-4" />
            <StartPcCard data={data} className="md:col-span-3 xl:col-span-3" />
            <StartWeekCard data={data} className="md:col-span-6 xl:col-span-8" />
            <SplashWeatherCard data={data} className="md:col-span-6 xl:col-span-4" />
          </>
        )}
      </section>
      {news && news.items.length > 0 && <NewsStrip news={news} onWhatsNew={onWhatsNew} />}
    </div>
  );
};
