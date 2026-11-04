import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { ChangelogHighlight } from '../../../utils/changelogUtils';
import type { StartScreenData } from './useStartScreenData';
import { SplashStartPanel } from './SplashStartPanel';
import { greeting } from './startScreenUtils';
import { heroSummary } from './startHomeUtils';

/** "Terça-feira, 3 de novembro" */
const todayLabel = (now: Date): string => {
  const s = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

interface StartHomeProps {
  data: StartScreenData;
  news: { version: string; items: ChangelogHighlight[] } | null;
  onEnter: () => void;
  onOpenTab: (tab: string) => void;
  onWhatsNew: () => void;
}

/** Tela de início de quem já usa o app: saudação com o resumo do dia, o botão de entrar e os cartões. */
export const StartHome: React.FC<StartHomeProps> = ({ data, news, onEnter, onOpenTab, onWhatsNew }) => {
  const now = new Date();
  const summary = heroSummary(data.jira, data.envs, now);
  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-7 animate-splash-rise">
      <section aria-label="Boas-vindas" className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-2.5 min-w-0">
          <p className="m-0 font-mono text-sm text-muted-foreground">{todayLabel(now)}</p>
          <h1 className="m-0 text-5xl sm:text-6xl font-extrabold tracking-tighter leading-none">
            {greeting(now)}
            <span className="text-primary">.</span>
          </h1>
          {summary && <p className="m-0 text-base sm:text-lg text-muted-foreground">{summary}</p>}
        </div>
        <button
          type="button"
          autoFocus
          onClick={onEnter}
          className="h-14 px-8 rounded-2xl bg-primary text-primary-foreground text-base font-extrabold flex items-center gap-3 cursor-pointer transition-all shadow-lg shadow-primary/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/40"
        >
          Entrar no cockpit <ArrowRight className="w-4 h-4" />
        </button>
      </section>
      <SplashStartPanel data={data} news={news} onOpenTab={onOpenTab} onWhatsNew={onWhatsNew} />
    </div>
  );
};
