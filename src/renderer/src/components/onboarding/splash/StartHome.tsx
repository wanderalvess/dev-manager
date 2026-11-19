import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { ChangelogHighlight } from '../../../utils/changelogUtils';
import type { StartScreenData } from './useStartScreenData';
import { SplashStartPanel } from './SplashStartPanel';
import { greeting } from './startScreenUtils';
import { heroSummary } from './startHomeUtils';

/** "Terça-feira, 3 de novembro" */
const todayLabel = (now: Date): string => {
  const s = now.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** A hora da tela, virando junto com o minuto do relógio (a tela de início pode ficar aberta um bom tempo). */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const d = new Date();
      setNow(d);
      timer = setTimeout(tick, 60000 - (d.getSeconds() * 1000 + d.getMilliseconds()) + 50);
    };
    tick();
    return () => clearTimeout(timer);
  }, []);
  return now;
}

interface StartHomeProps {
  data: StartScreenData;
  news: { version: string; items: ChangelogHighlight[] } | null;
  onEnter: () => void;
  onOpenTab: (tab: string) => void;
  onWhatsNew: () => void;
}

/** Tela de início de quem já usa o app: saudação com o resumo do dia, a hora, o botão de entrar e os cartões. */
export const StartHome: React.FC<StartHomeProps> = ({ data, news, onEnter, onOpenTab, onWhatsNew }) => {
  const now = useNow();
  const summary = heroSummary(data.jira, data.envs, now);
  const time = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
  return (
    <div className="w-full flex-1 min-h-0 flex flex-col gap-3.5 sm:gap-4 2xl:gap-5">
      <section aria-label="Boas-vindas" className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 animate-splash-rise">
        <div className="flex flex-col gap-1.5 min-w-0">
          <p className="m-0 font-mono text-xs text-muted-foreground uppercase tracking-wider">{todayLabel(now)}</p>
          <h1 className="m-0 text-4xl sm:text-5xl lg:text-6xl 2xl:text-7xl font-extrabold tracking-tighter leading-[0.95]">
            {greeting(now)}
            <span className="text-primary">.</span>
          </h1>
          {summary && <p className="m-0 text-sm sm:text-base text-muted-foreground">{summary}</p>}
        </div>
        <div className="flex items-end gap-5 sm:gap-7">
          <time
            dateTime={now.toISOString()}
            className="hidden md:block font-mono text-4xl lg:text-5xl font-bold tabular-nums tracking-tight leading-none text-foreground/80"
          >
            {time}
          </time>
          <button
            type="button"
            autoFocus
            onClick={onEnter}
            className="group h-12 sm:h-14 px-6 sm:px-8 rounded-2xl bg-primary text-primary-foreground text-sm sm:text-base font-extrabold flex items-center gap-3 cursor-pointer transition-all shadow-lg shadow-primary/25 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/35"
          >
            Entrar no Hub <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </section>
      <SplashStartPanel data={data} news={news} onOpenTab={onOpenTab} onWhatsNew={onWhatsNew} />
    </div>
  );
};
