import React from 'react';
import { ChevronDown, HelpCircle, Settings, Terminal } from 'lucide-react';
import { NAV_THEME_GROUPS } from './headerNavConfig';

interface HeaderNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openMenu: string | null;
  setOpenMenu: (menu: string | null) => void;
  navRef: React.RefObject<HTMLDivElement>;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  activeTab,
  setActiveTab,
  openMenu,
  setOpenMenu,
  navRef
}) => {
  const activeGroup = NAV_THEME_GROUPS.find((g) => g.items.some((item) => item.id === activeTab));
  const activeItem = activeGroup?.items.find((item) => item.id === activeTab);
  const ActiveIcon = activeItem?.icon || (activeTab === 'help' ? HelpCircle : activeTab === 'settings' ? Settings : Terminal);

  return (
    <nav ref={navRef} className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
      {/* Visualização Desktop (>= lg): Botões de Tema com Dropdown Individual */}
      <div className="hidden lg:flex items-center space-x-1 xl:space-x-1.5">
        {NAV_THEME_GROUPS.map((group) => {
          const GroupIcon = group.icon;
          const isGroupActive = group.items.some((item) => item.id === activeTab);
          const activeSubItem = group.items.find((item) => item.id === activeTab);
          const isOpen = openMenu === group.id;

          return (
            <div key={group.id} className="relative">
              <button
                type="button"
                data-tour={`nav-${group.id}`}
                onClick={() => setOpenMenu(isOpen ? null : group.id)}
                title={`Tema: ${group.title} (Clique para alternar rotinas)`}
                className={`h-9 px-2 xl:px-2.5 2xl:px-3 rounded-lg text-xs font-semibold transition-all select-none border cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                  isGroupActive
                    ? 'bg-card text-foreground border-primary/50 shadow-xs'
                    : 'bg-card/50 hover:bg-card text-muted-foreground hover:text-foreground border-border/60 hover:border-border'
                }`}
              >
                <GroupIcon
                  className={`w-3.5 h-3.5 shrink-0 ${isGroupActive ? 'text-primary' : 'text-muted-foreground'}`}
                />
                <span className="hidden 2xl:inline">{group.shortTitle}</span>
                <span className="2xl:hidden">{group.compactTitle}</span>
                {activeSubItem && (
                  <span className="px-1.5 py-0.5 text-2xs font-bold rounded bg-primary text-primary-foreground font-mono leading-none shrink-0 hidden xl:inline">
                    {activeSubItem.shortLabel}
                  </span>
                )}
                <ChevronDown
                  className={`w-3 h-3 text-muted-foreground transition-transform duration-200 shrink-0 ${
                    isOpen ? 'rotate-180 text-primary' : ''
                  }`}
                />
              </button>

              {/* Popover Dropdown das Abas deste Tema */}
              {isOpen && (
                <div
                  style={{ backgroundColor: 'hsl(var(--card))' }}
                  className="absolute top-full left-0 mt-2 w-72 bg-card text-card-foreground rounded-xl border border-border shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="px-3 py-1.5 text-2xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 mb-1.5 flex items-center justify-between">
                    <span>{group.title}</span>
                  </div>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const ItemIcon = item.icon;
                      const isItemActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setActiveTab(item.id);
                            setOpenMenu(null);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all cursor-pointer ${
                            isItemActive
                              ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                              : 'hover:bg-muted text-foreground'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                            <ItemIcon
                              className={`w-4 h-4 shrink-0 ${
                                isItemActive ? 'text-primary-foreground' : 'text-primary'
                              }`}
                            />
                            <div className="truncate">
                              <div className="text-xs font-semibold leading-tight">{item.label}</div>
                              <div
                                className={`text-2xs truncate leading-normal ${
                                  isItemActive ? 'text-primary-foreground/90' : 'text-muted-foreground'
                                }`}
                              >
                                {item.description}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`text-2xs font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              isItemActive
                                ? 'bg-primary-foreground/20 text-primary-foreground'
                                : 'bg-muted text-muted-foreground border border-border/60'
                            }`}
                          >
                            {item.shortcut}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Visualização Compacta (< lg): Seletor de Módulo Dropdown Único */}
      <div className="lg:hidden relative">
        <button
          type="button"
          onClick={() => setOpenMenu(openMenu === 'compact' ? null : 'compact')}
          className="h-9 flex items-center space-x-2 px-2.5 sm:px-3 rounded-lg text-xs font-semibold bg-card border border-primary/40 text-foreground shadow-xs cursor-pointer whitespace-nowrap"
        >
          <ActiveIcon className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>
            {activeItem?.label ||
              (activeTab === 'help'
                ? 'Central de Ajuda'
                : activeTab === 'settings'
                  ? 'Configurações'
                  : 'Módulos')}
          </span>
          <ChevronDown
            className={`w-3 h-3 text-muted-foreground transition-transform duration-200 shrink-0 ${
              openMenu === 'compact' ? 'rotate-180 text-primary' : ''
            }`}
          />
        </button>

        {openMenu === 'compact' && (
          <div
            style={{ backgroundColor: 'hsl(var(--card))' }}
            className="absolute top-full left-0 mt-2 w-72 max-h-[80vh] overflow-y-auto bg-card text-card-foreground rounded-xl border border-border shadow-2xl z-50 p-2 space-y-3"
          >
            {NAV_THEME_GROUPS.map((group) => (
              <div key={group.id} className="space-y-1">
                <div className="px-2 text-2xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <group.icon className="w-3 h-3 text-primary" />
                  <span>{group.title}</span>
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const ItemIcon = item.icon;
                    const isItemActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(item.id);
                          setOpenMenu(null);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                          isItemActive
                            ? 'bg-primary text-primary-foreground font-semibold'
                            : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <ItemIcon className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-xs truncate">{item.label}</span>
                        </div>
                        <span className="text-2xs font-mono opacity-80 shrink-0 ml-2">{item.shortcut}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="space-y-1 pt-1 border-t border-border/50">
              <div className="px-2 text-2xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-3 h-3 text-primary" />
                <span>Sistema &amp; Suporte</span>
              </div>
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('help');
                    setOpenMenu(null);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                    activeTab === 'help'
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-xs truncate">Central de Ajuda</span>
                  </div>
                  <span className="text-2xs font-mono opacity-80 shrink-0 ml-2">Alt+9</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('settings');
                    setOpenMenu(null);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                    activeTab === 'settings'
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <Settings className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-xs truncate">Configurações</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
