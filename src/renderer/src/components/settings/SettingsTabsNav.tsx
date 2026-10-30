import React from 'react';
import {
  Folder,
  KeyRound,
  GitBranch,
  Radio,
  Server,
  Zap,
  ScrollText,
  HardDriveDownload,
  Bot,
  CheckCheck,
  BarChart3,
  LayoutGrid,
  PackageOpen,
  Route,
  LucideIcon
} from 'lucide-react';
import type { SettingsTab } from './settingsSearchData';

interface SettingsTabsNavProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  counts: Partial<Record<SettingsTab, number>>;
}

interface TabDef {
  id: SettingsTab;
  label: string;
  icon: LucideIcon;
}

interface TabGroup {
  title: string;
  tabs: TabDef[];
}

// Grupos nomeados e separados por divisor sutil: o que aparece, onde as coisas estão, o que monitorar e o que automatizar.
const TAB_GROUPS: TabGroup[] = [
  { title: 'Geral', tabs: [{ id: 'modules', label: 'Módulos', icon: LayoutGrid }] },
  {
    title: 'Ambiente',
    tabs: [
      { id: 'dirs', label: 'Diretórios & IDE', icon: Folder },
      { id: 'karaf', label: 'Karaf', icon: KeyRound },
      { id: 'routines', label: 'Rotinas WinThor', icon: PackageOpen },
      { id: 'azure', label: 'Azure & Git', icon: GitBranch }
    ]
  },
  {
    title: 'Monitoramento',
    tabs: [
      { id: 'services', label: 'Serviços & Processos', icon: Server },
      { id: 'ports', label: 'Portas', icon: Radio },
      { id: 'logs', label: 'Logs', icon: ScrollText }
    ]
  },
  {
    title: 'Recursos',
    tabs: [
      { id: 'automation', label: 'Automação', icon: Zap },
      { id: 'backup', label: 'Banco & Backup', icon: HardDriveDownload },
      { id: 'ai', label: 'IA & LLM', icon: Bot },
      { id: 'quality', label: 'Qualidade & QA', icon: CheckCheck },
      { id: 'integration', label: 'Integração ponta a ponta', icon: Route },
      { id: 'usage', label: 'Meu uso', icon: BarChart3 }
    ]
  }
];

export const SettingsTabsNav: React.FC<SettingsTabsNavProps> = ({ activeTab, onTabChange, counts }) => (
  <div
    role="tablist"
    aria-label="Seções das Configurações"
    className="flex items-center border-b border-border text-sm flex-wrap gap-y-1"
    data-tour="tabs-nav-dirs"
  >
    {TAB_GROUPS.map((group, groupIndex) => (
      <React.Fragment key={group.title}>
        {groupIndex > 0 && <span aria-hidden="true" className="h-4 w-px bg-border mx-2" />}
        <span aria-hidden="true" className="hidden xl:inline text-[13px] text-muted-foreground mr-1">
          {group.title}
        </span>
        {group.tabs.map(({ id, label, icon: Icon }) => {
          const count = counts[id] ?? 0;
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(id)}
              className={`flex items-center space-x-1.5 px-3 py-2.5 font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                active
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
              {count > 0 && (
                <span className="px-2 rounded-full text-xs font-medium bg-muted text-muted-foreground">{count}</span>
              )}
            </button>
          );
        })}
      </React.Fragment>
    ))}
  </div>
);
