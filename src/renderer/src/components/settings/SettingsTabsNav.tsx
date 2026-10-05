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

// Grupos separados por divisor sutil: onde configurar, o que monitorar e o que automatizar.
const TAB_GROUPS: TabDef[][] = [
  [
    { id: 'dirs', label: 'Diretórios & IDE', icon: Folder },
    { id: 'karaf', label: 'Karaf', icon: KeyRound },
    { id: 'azure', label: 'Azure & Git', icon: GitBranch }
  ],
  [
    { id: 'services', label: 'Serviços & Processos', icon: Server },
    { id: 'ports', label: 'Portas', icon: Radio },
    { id: 'logs', label: 'Logs', icon: ScrollText }
  ],
  [
    { id: 'automation', label: 'Automação', icon: Zap },
    { id: 'backup', label: 'Backup', icon: HardDriveDownload },
    { id: 'ai', label: 'IA & LLM', icon: Bot },
    { id: 'quality', label: 'Qualidade & QA', icon: CheckCheck }
  ]
];

export const SettingsTabsNav: React.FC<SettingsTabsNavProps> = ({ activeTab, onTabChange, counts }) => (
  <div
    role="tablist"
    aria-label="Seções das Configurações"
    className="flex items-center border-b border-border text-xs flex-wrap gap-y-1"
    data-tour="tabs-nav-dirs"
  >
    {TAB_GROUPS.map((group, groupIndex) => (
      <React.Fragment key={group[0].id}>
        {groupIndex > 0 && <span aria-hidden="true" className="h-4 w-px bg-border mx-2" />}
        {group.map(({ id, label, icon: Icon }) => {
          const count = counts[id] ?? 0;
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(id)}
              className={`flex items-center space-x-1.5 px-3 py-2 font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px ${
                active
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
              {count > 0 && (
                <span className="px-1.5 rounded text-2xs font-mono bg-muted text-muted-foreground">{count}</span>
              )}
            </button>
          );
        })}
      </React.Fragment>
    ))}
  </div>
);
