import React from 'react';
import { NAV_THEME_GROUPS } from '../../header/headerNavConfig';

/** Etapa 1: o que é o Hub Manager e as áreas do menu, com as páginas de cada uma. */
export const WelcomeStep: React.FC<{ onPickGroup: (groupIndex: number) => void }> = ({ onPickGroup }) => (
  <>
    <span className="font-mono text-xs font-bold tracking-[0.14em] text-primary">PRAZER, EU SOU</span>
    <h1 className="m-0 text-5xl lg:text-7xl font-extrabold tracking-tighter leading-none">
      O seu <span className="text-primary">Hub Manager</span>.
    </h1>
    <p className="m-0 max-w-3xl text-base lg:text-lg text-muted-foreground leading-relaxed">
      Um cockpit para Operação, Desenvolvimento e Qualidade no ecossistema WinThor. Ele é dividido em {NAV_THEME_GROUPS.length} áreas — na
      próxima etapa você liga só as páginas que vai usar.
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mt-2">
      {NAV_THEME_GROUPS.map((g, i) => {
        const Icon = g.icon;
        return (
          <button
            key={g.id}
            type="button"
            onClick={() => onPickGroup(i)}
            className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-5 text-left cursor-pointer transition-all hover:-translate-y-0.5 hover:border-primary/50"
          >
            <span className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <Icon className="w-5 h-5" />
            </span>
            <span className="font-extrabold leading-tight">{g.title}</span>
            <span className="w-full border-t border-border pt-3 flex flex-col gap-1.5">
              {g.items.map((item) => (
                <span key={item.id} className="text-sm text-muted-foreground leading-snug">
                  {item.label}
                </span>
              ))}
            </span>
          </button>
        );
      })}
    </div>
  </>
);
