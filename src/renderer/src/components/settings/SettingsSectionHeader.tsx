import React from 'react';
import { PAGE_TITLE_CLASS } from '../ui/PageHeader';
import { SETTINGS_SECTIONS, sectionGroupTitle, type SettingsTab } from './settingsSections';

interface SettingsSectionHeaderProps {
  tab: SettingsTab;
  actions?: React.ReactNode;
}

/** Abre cada seção: "Grupo · Seção" em mono, o título no padrão do PageHeader e a frase do que ela resolve. */
export const SettingsSectionHeader: React.FC<SettingsSectionHeaderProps> = ({ tab, actions }) => {
  const section = SETTINGS_SECTIONS[tab];
  const group = sectionGroupTitle(tab);
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
      <div className="min-w-0">
        <span className="font-mono text-xs font-bold tracking-[0.14em] uppercase text-primary">
          {group ? `${group} · ${section.label}` : 'Configurações'}
          {section.optional && <span className="text-muted-foreground"> · opcional</span>}
        </span>
        <h2 className={`${PAGE_TITLE_CLASS} mt-1`}>{section.label}</h2>
        <p className="text-xs text-muted-foreground max-w-2xl">{section.description}</p>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
};
