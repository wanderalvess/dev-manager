import React from 'react';
import { Compass, Sparkles } from 'lucide-react';
import { HELP_SECTIONS, HELP_SECTION_GROUPS, type HelpCategory } from '../helpSections';

interface HelpSectionNavProps {
  activeCategory: HelpCategory;
  onSelect: (category: HelpCategory) => void;
  /** Texto curto à direita do item (quantidade de perguntas, versão…). */
  badges: Partial<Record<HelpCategory, string>>;
  /** Busca da Ajuda, logo abaixo do título. */
  search: React.ReactNode;
  onRestartTour?: () => void;
  onResetPageTours?: () => void;
}

/** Menu lateral da Central de Ajuda: mesmo desenho do menu das Configurações. */
export const HelpSectionNav: React.FC<HelpSectionNavProps> = ({
  activeCategory,
  onSelect,
  badges,
  search,
  onRestartTour,
  onResetPageTours
}) => (
  <nav
    aria-label="Seções da Central de Ajuda"
    className="w-full md:w-60 shrink-0 md:border-r border-border/80 md:pr-3 flex flex-col gap-3 md:overflow-y-auto"
  >
    <div className="space-y-2.5 px-1">
      <h1 className="text-lg font-bold text-foreground tracking-tight">Central de Ajuda</h1>
      {search}
    </div>

    <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
      {HELP_SECTION_GROUPS.map((group) => (
        <div key={group.title ?? 'top'} className="space-y-0.5 shrink-0">
          {group.title && <div className="px-2.5 pb-1 text-xs font-medium text-muted-foreground">{group.title}</div>}
          {group.sections.map((id) => {
            const active = activeCategory === id;
            const badge = badges[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelect(id)}
                aria-current={active ? 'page' : undefined}
                className={`w-full h-8 flex items-center justify-between gap-2 rounded-lg px-2.5 text-left text-[13px] transition-colors cursor-pointer whitespace-nowrap ${
                  active ? 'bg-accent text-accent-foreground font-semibold' : 'text-foreground hover:bg-muted'
                }`}
              >
                <span className="truncate">{HELP_SECTIONS[id].label}</span>
                {badge && <span className="text-xs font-mono text-muted-foreground shrink-0">{badge}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </div>

    {(onRestartTour || onResetPageTours) && (
      <div className="hidden md:flex mt-auto pt-3 border-t border-border/80 px-2.5 flex-col items-start gap-1.5 text-xs">
        {onRestartTour && (
          <button type="button" onClick={onRestartTour} className="flex items-center gap-1.5 font-semibold text-primary hover:underline cursor-pointer">
            <Sparkles className="w-3.5 h-3.5" /> Rever o tour de boas-vindas
          </button>
        )}
        {onResetPageTours && (
          <button
            type="button"
            onClick={onResetPageTours}
            title="Reativa os tutoriais rápidos de cada tela (Banco, Rotinas, Deploy, Containers, Git...)"
            className="flex items-center gap-1.5 font-semibold text-primary hover:underline cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" /> Rever os tours das telas
          </button>
        )}
      </div>
    )}
  </nav>
);
