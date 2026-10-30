import React from 'react';
import { Activity, Database, GitBranchPlus, Globe, Key, Wrench, type LucideIcon } from 'lucide-react';
import { INFR_ASSISTANT_NAV, type InfrBootstrapTab } from '../../../utils/infrBootstrapModalUtils';

const ICONS: Record<InfrBootstrapTab, LucideIcon> = {
  oracle: Database,
  wta: Globe,
  wsh: Key,
  newVersion: GitBranchPlus,
  verify: Activity,
  scripts: Wrench
};

/**
 * Navegação do assistente. Em janela larga é uma coluna à esquerda, com o que cada etapa faz;
 * estreita, vira uma faixa de botões que quebra linha (nunca corta o nome).
 */
export const InfrAssistantNav: React.FC<{ activeTab: InfrBootstrapTab; onSelect: (tab: InfrBootstrapTab) => void }> = ({
  activeTab,
  onSelect
}) => (
  <nav
    aria-label="Etapas do assistente"
    className="shrink-0 border-b md:border-b-0 md:border-r border-border/70 bg-muted/25 p-3 md:w-60 md:py-4 flex flex-wrap md:flex-col md:flex-nowrap gap-2 md:gap-4 md:overflow-y-auto scrollbar-thin"
  >
    {INFR_ASSISTANT_NAV.map((g) => (
      <div key={g.group} className={`contents md:flex md:flex-col md:gap-1 ${g.group === 'Diagnóstico' ? 'md:mt-auto' : ''}`}>
        <span className="hidden md:block px-2.5 pb-1 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">{g.group}</span>
        {g.items.map((item) => {
          const active = item.tab === activeTab;
          const Icon = ICONS[item.tab];
          return (
            <button
              key={item.tab}
              type="button"
              onClick={() => onSelect(item.tab)}
              aria-current={active ? 'page' : undefined}
              className={`flex items-start gap-2.5 text-left rounded-lg border px-3 py-2 md:p-2.5 transition cursor-pointer ${
                active
                  ? 'border-warning/60 bg-warning/10 md:bg-card md:shadow-xs md:border-transparent md:ring-1 md:ring-warning/50'
                  : 'border-border/70 bg-card md:bg-transparent md:border-transparent hover:bg-muted/60'
              }`}
            >
              <span
                className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-2xs font-bold ${
                  active ? 'bg-warning text-white' : 'border border-border text-muted-foreground'
                }`}
              >
                {item.step ?? <Icon className="w-3.5 h-3.5" />}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-foreground leading-6 md:leading-tight">{item.label}</span>
                <span className="hidden md:block text-2xs text-muted-foreground mt-0.5 leading-snug">{item.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    ))}
  </nav>
);
