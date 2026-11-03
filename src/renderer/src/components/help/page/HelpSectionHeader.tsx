import React from 'react';
import { PAGE_TITLE_CLASS } from '../../ui/PageHeader';
import { HELP_SECTIONS, helpSectionGroupTitle, type HelpCategory } from '../helpSections';

interface HelpSectionHeaderProps {
  category: HelpCategory;
}

/** Abre cada seção da Ajuda: "Grupo · Seção" em mono, o título no padrão do PageHeader e a frase do que ela resolve. */
export const HelpSectionHeader: React.FC<HelpSectionHeaderProps> = ({ category }) => {
  const section = HELP_SECTIONS[category];
  const group = helpSectionGroupTitle(category);
  return (
    <div className="border-b border-border pb-3">
      <span className="font-mono text-xs font-bold tracking-[0.14em] uppercase text-primary">
        {group ? `${group} · ${section.label}` : 'Central de Ajuda'}
      </span>
      <h2 className={`${PAGE_TITLE_CLASS} mt-1`}>{section.label}</h2>
      <p className="text-xs text-muted-foreground max-w-2xl">{section.description}</p>
    </div>
  );
};
