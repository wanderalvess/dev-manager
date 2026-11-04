import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { StartScreenData } from './useStartScreenData';
import { weekShortcuts } from './startHomeUtils';
import { START_CARD, START_EYEBROW } from './startCardStyles';

/** Sem Jira: os módulos mais usados na semana, cada um entrando no cockpit direto na sua aba. */
export const StartShortcutsCard: React.FC<{ data: StartScreenData; onOpenTab: (tab: string) => void; className?: string }> = ({
  data,
  onOpenTab,
  className = ''
}) => {
  const { items, suggested } = weekShortcuts(data.week?.summary ?? null, data.disabledModules);
  return (
    <article aria-label="Atalhos" className={`${START_CARD} ${className}`}>
      <span className={START_EYEBROW}>{suggested ? 'Começar por' : 'Mais usados na semana'}</span>
      <ul className="m-0 p-0 list-none grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 content-start">
        {items.map((item) => (
          <li key={item.tab}>
            <button
              type="button"
              onClick={() => onOpenTab(item.tab)}
              className="group w-full min-h-16 px-4 py-3 rounded-xl border border-border bg-muted/40 flex items-center gap-3 text-left cursor-pointer transition-colors hover:border-primary hover:bg-primary/5"
            >
              <span className="flex-1 min-w-0">
                <span className="block font-bold truncate">{item.label}</span>
                {item.runs > 0 && (
                  <span className="block text-xs text-muted-foreground">
                    {item.runs} {item.runs === 1 ? 'uso' : 'usos'}
                  </span>
                )}
              </span>
              <ArrowRight className="w-4 h-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </button>
          </li>
        ))}
      </ul>
    </article>
  );
};
