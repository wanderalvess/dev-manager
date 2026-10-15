import React, { useEffect, useState, useCallback, useRef } from 'react';
import { RefreshCw, Settings, HelpCircle } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { AppLogo } from './AppLogo';
import { NetworkIpInfo, SystemMetrics } from '../../../shared/types';
import { HeaderNav } from './header/HeaderNav';
import { StatusPopover } from './header/StatusPopover';
import { QuickSearchButton } from './header/QuickSearchButton';
import { IconButton } from './ui/IconButton';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onRefreshAll: () => void;
  isRefreshing: boolean;
  onOpenQuickLauncher?: () => void;
  onOpenWhatsNew?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onRefreshAll,
  isRefreshing,
  onOpenQuickLauncher,
  onOpenWhatsNew
}) => {
  const [networkIps, setNetworkIps] = useState<NetworkIpInfo | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [isStatusOpen, setIsStatusOpen] = useState<boolean>(false);
  const navRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.electronAPI?.getAppInfo) {
      window.electronAPI.getAppInfo().then((info) => setAppVersion(info.appVersion)).catch(() => {});
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    if (window.electronAPI?.getSystemMetrics) {
      try {
        const metrics = await window.electronAPI.getSystemMetrics();
        setSystemMetrics(metrics);
      } catch {
        // Silencioso em caso de indisponibilidade
      }
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const metricsInterval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(metricsInterval);
  }, [fetchMetrics]);

  const fetchNetworkIps = useCallback(async () => {
    if (window.electronAPI?.getNetworkIps) {
      try {
        const ips = await window.electronAPI.getNetworkIps();
        setNetworkIps(ips);
      } catch (err) {
        console.error('Erro ao buscar IPs de rede:', err);
      }
    }
  }, []);

  useEffect(() => {
    fetchNetworkIps();
    const ipInterval = setInterval(fetchNetworkIps, 30000);
    return () => clearInterval(ipInterval);
  }, [fetchNetworkIps]);

  // Fecha menus e popovers ao clicar fora ou apertar Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setIsStatusOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenu(null);
        setIsStatusOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <header className="bg-card/95 border-b border-border/80 px-2.5 sm:px-3 lg:px-4 py-2 flex items-center justify-between shadow-md relative z-30 backdrop-blur-md transition-colors duration-300 gap-2.5 shrink-0 h-14 w-full">
      {/* 1. Identidade do Aplicativo (Esquerda) */}
      <div className="flex items-center gap-2.5 shrink-0">
        <AppLogo size="sm" showStatusDot />

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <div className="text-sm font-extrabold tracking-tight text-foreground font-sans flex items-center gap-1">
              Hub <span className="text-primary font-bold">Manager</span>
            </div>
            <button
              type="button"
              onClick={onOpenWhatsNew}
              className="text-2xs px-1.5 py-0.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary font-mono font-bold border border-primary/30 hover:border-primary/50 transition cursor-pointer active:scale-95"
              title="Clique para ver as novidades desta versão e versões anteriores"
            >
              v{appVersion || '...'}
            </button>
          </div>
          <p className="text-2xs text-muted-foreground font-medium hidden min-[1600px]:block leading-tight">
            Cockpit de Desenvolvimento &amp; Automação
          </p>
        </div>
      </div>

      {/* 2. Navegação dos Menus Temáticos (Centro-Esquerda) */}
      <HeaderNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openMenu={openMenu}
        setOpenMenu={setOpenMenu}
        navRef={navRef}
      />

      {/* 3. Busca Rápida Ampla e Centralizada (Ctrl+K) */}
      <QuickSearchButton onOpenQuickLauncher={onOpenQuickLauncher} />

      {/* 4. Ações da Direita: Status do Sistema, Tema, Central de Ajuda, Configurações e Atualizar */}
      <div className="flex items-center gap-1.5 shrink-0">
        <StatusPopover
          networkIps={networkIps}
          systemMetrics={systemMetrics}
          isOpen={isStatusOpen}
          setIsOpen={setIsStatusOpen}
          statusRef={statusRef}
          onOpenHelp={() => setActiveTab('help')}
        />

        <ThemeToggle />

        <IconButton
          data-tour="help"
          onClick={() => setActiveTab('help')}
          tone={activeTab === 'help' ? 'active' : 'neutral'}
          label="Central de Ajuda, FAQ e Diagnósticos (Alt+9)"
          icon={<HelpCircle className="w-4 h-4" />}
        />

        <IconButton
          data-tour="settings"
          onClick={() => setActiveTab('settings')}
          tone={activeTab === 'settings' ? 'active' : 'neutral'}
          label="Configurações do Sistema e Portas"
          icon={<Settings className="w-4 h-4" />}
        />

        <IconButton
          data-tour="refresh"
          onClick={onRefreshAll}
          disabled={isRefreshing}
          label="Recarregar status de serviços, portas e repositórios"
          icon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />}
        />
      </div>
    </header>
  );
};
