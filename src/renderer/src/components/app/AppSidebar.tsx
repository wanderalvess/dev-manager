import React, { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AppLogo } from '../AppLogo';
import type { NavThemeGroup } from '../header/headerNavConfig';

interface AppSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  /** Grupos já filtrados pelos módulos ligados em Configurações → Módulos. */
  navGroups: NavThemeGroup[];
  onOpenWhatsNew?: () => void;
}

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  isActive: boolean;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, shortcut, isActive, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-current={isActive ? 'page' : undefined}
    className={`w-full h-8 flex items-center gap-2.5 px-2.5 rounded-lg text-left text-[13px] transition-colors cursor-pointer ${
      isActive ? 'bg-accent text-accent-foreground font-semibold' : 'text-foreground hover:bg-muted'
    }`}
  >
    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-accent-foreground' : 'text-muted-foreground'}`} />
    <span className="truncate flex-1">{label}</span>
    {shortcut && <span className="text-2xs font-mono text-muted-foreground shrink-0">{shortcut}</span>}
  </button>
);

/** Menu lateral com todos os módulos visíveis, agrupados como no antigo menu do cabeçalho (só a partir de lg). */
export const AppSidebar: React.FC<AppSidebarProps> = ({ activeTab, setActiveTab, navGroups, onOpenWhatsNew }) => {
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    if (window.electronAPI?.getAppInfo) {
      window.electronAPI.getAppInfo().then((info) => setAppVersion(info.appVersion)).catch(() => {});
    }
  }, []);

  return (
    <aside
      aria-label="Módulos"
      className="hidden lg:flex flex-col w-56 shrink-0 bg-card border-r border-border/80 overflow-y-auto"
    >
      <div className="flex items-center gap-2.5 px-4 h-14 shrink-0">
        <AppLogo size="sm" showStatusDot />
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-extrabold tracking-tight text-foreground leading-tight">
            Hub <span className="text-primary">Manager</span>
          </span>
          <button
            type="button"
            onClick={onOpenWhatsNew}
            title="Ver as novidades desta versão e das anteriores"
            className="text-2xs font-mono text-muted-foreground hover:text-primary text-left cursor-pointer w-fit"
          >
            v{appVersion || '...'}
          </button>
        </div>
      </div>

      <nav className="flex-1 px-2.5 pb-3 space-y-3">
        {navGroups.map((group) => (
          <div key={group.id} data-tour={`nav-${group.id}`} className="space-y-0.5">
            <div className="px-2.5 pb-1 text-xs font-medium text-muted-foreground">{group.shortTitle}</div>
            {group.items.map((item) => (
              <SidebarItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                shortcut={item.shortcut}
                isActive={activeTab === item.id}
                onClick={() => setActiveTab(item.id)}
              />
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
};
