import React, { useEffect, useState } from 'react';
import { ChevronsLeft, ChevronsRight, Plug, type LucideIcon } from 'lucide-react';
import { AppLogo } from '../AppLogo';
import type { NavThemeGroup } from '../header/headerNavConfig';

interface AppSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  /** Grupos já filtrados pelos módulos ligados em Configurações → Módulos. */
  navGroups: NavThemeGroup[];
  onOpenWhatsNew?: () => void;
}

const COLLAPSED_KEY = 'devManager.sidebar.collapsed';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  isActive: boolean;
  collapsed: boolean;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, shortcut, isActive, collapsed, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-current={isActive ? 'page' : undefined}
    // Recolhido, o nome vai para o tooltip e para o leitor de tela
    aria-label={collapsed ? label : undefined}
    title={collapsed ? (shortcut ? `${label} (${shortcut})` : label) : undefined}
    className={`w-full h-8 flex items-center gap-2.5 rounded-lg text-left text-[13px] transition-colors cursor-pointer ${
      collapsed ? 'justify-center px-0' : 'px-2.5'
    } ${isActive ? 'bg-accent text-accent-foreground font-semibold' : 'text-foreground hover:bg-muted'}`}
  >
    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-accent-foreground' : 'text-muted-foreground'}`} />
    {!collapsed && <span className="truncate flex-1">{label}</span>}
    {!collapsed && shortcut && <span className="text-2xs font-mono text-muted-foreground shrink-0">{shortcut}</span>}
  </button>
);

/**
 * Menu lateral com todos os módulos visíveis, agrupados como no antigo menu do cabeçalho (só a partir de lg).
 * Recolhível numa faixa de ícones para devolver espaço às telas largas; a escolha fica salva nesta máquina.
 */
export const AppSidebar: React.FC<AppSidebarProps> = ({ activeTab, setActiveTab, navGroups, onOpenWhatsNew }) => {
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(readCollapsed);

  useEffect(() => {
    if (window.electronAPI?.getAppInfo) {
      window.electronAPI.getAppInfo().then((info) => setAppVersion(info.appVersion)).catch(() => {});
    }
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
    } catch {
      // Sem localStorage a escolha vale só até fechar o app
    }
  };

  return (
    <aside
      aria-label="Módulos"
      className={`hidden lg:flex flex-col shrink-0 bg-card border-r border-border/80 overflow-y-auto transition-[width] duration-200 ${
        collapsed ? 'w-[60px]' : 'w-56'
      }`}
    >
      <div className={`flex items-center gap-2.5 h-14 shrink-0 ${collapsed ? 'justify-center px-0' : 'px-4'}`}>
        <AppLogo size="sm" showStatusDot />
        {!collapsed && (
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
        )}
      </div>

      <nav className="flex-1 px-2.5 pb-3 space-y-3">
        {navGroups.map((group) => (
          <div key={group.id} data-tour={`nav-${group.id}`} className="space-y-0.5">
            {collapsed ? (
              <div aria-hidden="true" className="mx-auto mb-1 w-7 border-t border-border/80" />
            ) : (
              <div className="px-2.5 pb-1 text-xs font-medium text-muted-foreground">{group.shortTitle}</div>
            )}
            {group.items.map((item) => (
              <SidebarItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                shortcut={item.shortcut}
                isActive={activeTab === item.id}
                collapsed={collapsed}
                onClick={() => setActiveTab(item.id)}
              />
            ))}
          </div>
        ))}
        <div data-tour="nav-integrations" className="pt-2 border-t border-border/80">
          <SidebarItem
            icon={Plug}
            label="Integrações"
            isActive={activeTab === 'integrations'}
            collapsed={collapsed}
            onClick={() => setActiveTab('integrations')}
          />
        </div>
      </nav>

      <div className="px-2.5 pb-3 shrink-0">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          className="w-full h-8 flex items-center justify-center gap-2 rounded-lg border border-border/80 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          {!collapsed && <span>Recolher menu</span>}
        </button>
      </div>
    </aside>
  );
};
