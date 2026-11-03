import React from 'react';
import { Check } from 'lucide-react';
import { SETTINGS_SECTIONS, SETTINGS_SECTION_GROUPS, type SettingsTab } from './settingsSections';
import type { SectionStatus } from '../../utils/settingsSectionStatus';

interface SettingsSectionNavProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  statuses: Partial<Record<SettingsTab, SectionStatus>>;
  /** Busca nas configurações, logo abaixo do título. */
  search: React.ReactNode;
  onOpenTour: () => void;
}

const StatusMark: React.FC<{ status?: SectionStatus }> = ({ status }) => {
  if (!status) return null;
  if (status.kind === 'ok') return <Check aria-label="pronto" className="w-3.5 h-3.5 text-success shrink-0" />;
  if (status.kind === 'optional') return <span className="text-xs text-muted-foreground shrink-0">opcional</span>;
  return (
    <span className="text-xs font-mono font-semibold text-warning bg-warning/10 rounded-full px-1.5 shrink-0">
      falta {status.count}
    </span>
  );
};

/** Menu lateral das Configurações: mesmo desenho dos itens da AppSidebar, com a situação de cada seção. */
export const SettingsSectionNav: React.FC<SettingsSectionNavProps> = ({ activeTab, onTabChange, statuses, search, onOpenTour }) => (
  <nav
    aria-label="Seções das Configurações"
    data-tour="settings-nav"
    className="w-full md:w-60 shrink-0 md:border-r border-border/80 md:pr-3 flex flex-col gap-3 md:overflow-y-auto"
  >
    <div className="space-y-2.5 px-1">
      <h1 className="text-lg font-bold text-foreground tracking-tight">Configurações</h1>
      <div data-tour="settings-search">{search}</div>
    </div>

    <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
      {SETTINGS_SECTION_GROUPS.map((group) => (
        <div key={group.title ?? 'top'} className="space-y-0.5 shrink-0">
          {group.title && <div className="px-2.5 pb-1 text-xs font-medium text-muted-foreground">{group.title}</div>}
          {group.sections.map((id) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(id)}
                aria-current={active ? 'page' : undefined}
                className={`w-full h-8 flex items-center justify-between gap-2 rounded-lg px-2.5 text-left text-[13px] transition-colors cursor-pointer whitespace-nowrap ${
                  active ? 'bg-accent text-accent-foreground font-semibold' : 'text-foreground hover:bg-muted'
                }`}
              >
                <span className="truncate">{SETTINGS_SECTIONS[id].label}</span>
                <StatusMark status={statuses[id]} />
              </button>
            );
          })}
        </div>
      ))}
    </div>

    <div className="hidden md:flex mt-auto pt-3 border-t border-border/80 px-2.5 flex-col gap-1.5 text-xs text-muted-foreground">
      <span className="flex items-center gap-2">
        <Check className="w-3.5 h-3.5 text-success" /> pronto para usar
      </span>
      <span className="flex items-center gap-2">
        <span className="font-mono font-semibold text-warning whitespace-nowrap shrink-0">falta 1</span> uma tela ainda não funciona
      </span>
      <button type="button" onClick={onOpenTour} className="self-start mt-1 font-semibold text-primary hover:underline cursor-pointer">
        Rever o tour desta página
      </button>
    </div>
  </nav>
);
