import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  RefreshCw,
  Layers,
  GitPullRequest,
  Terminal,
  Grid,
  Settings,
  Activity,
  HelpCircle,
  Search,
  FileSearch,
  Database,
  Box,
  Wifi,
  Check,
  Cpu,
  ChevronDown,
  Copy
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { NetworkIpInfo, SystemMetrics } from '../../../shared/types';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onRefreshAll: () => void;
  isRefreshing: boolean;
  onOpenQuickLauncher?: () => void;
}

const ClockDisplay: React.FC = React.memo(() => {
  const [timeStr, setTimeStr] = useState<string>(() =>
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  useEffect(() => {
    const updateClock = () => {
      setTimeStr(
        new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-muted/60 border border-border/60 text-[11px] font-mono text-muted-foreground select-none">
      <Activity className="w-3 h-3 text-primary" />
      <span className="font-semibold text-foreground">{timeStr}</span>
    </div>
  );
});
ClockDisplay.displayName = 'ClockDisplay';

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onRefreshAll,
  isRefreshing,
  onOpenQuickLauncher
}) => {
  const [networkIps, setNetworkIps] = useState<NetworkIpInfo | null>(null);
  const { copy: copyToClipboard, copiedKey: copiedIp } = useCopyToClipboard(1800);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (window.electronAPI?.getSystemMetrics) {
      try {
        const metrics = await window.electronAPI.getSystemMetrics();
        setSystemMetrics(metrics);
      } catch (err) {
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

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [isStatusOpen, setIsStatusOpen] = useState<boolean>(false);
  const navRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

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

  const navThemeGroups = [
    {
      id: 'infra',
      title: 'Infraestrutura & Ambiente',
      shortTitle: 'Infraestrutura',
      icon: Terminal,
      items: [
        {
          id: 'env',
          label: 'Ambiente Dev',
          shortLabel: 'Ambiente',
          icon: Terminal,
          description: 'Serviços locais, servidores & scanner de portas',
          shortcut: 'Alt+1'
        },
        {
          id: 'containers',
          label: 'Containers Docker',
          shortLabel: 'Docker',
          icon: Box,
          description: 'Gerenciador Docker daemon, containers & logs',
          shortcut: 'Alt+3'
        },
        {
          id: 'deploy',
          label: 'Deploy & Esteiras',
          shortLabel: 'Deploy',
          icon: Layers,
          description: 'Perfis de deploy, Docker & esteiras de automação',
          shortcut: 'Alt+4'
        }
      ]
    },
    {
      id: 'data',
      title: 'Banco de Dados & Rotinas',
      shortTitle: 'Dados & Rotinas',
      icon: Database,
      items: [
        {
          id: 'database',
          label: 'Banco de Dados',
          shortLabel: 'Banco',
          icon: Database,
          description: 'Conexão e SQL runner Oracle, MySQL, Postgres',
          shortcut: 'Alt+2'
        },
        {
          id: 'routines',
          label: 'Catálogo de Rotinas',
          shortLabel: 'Rotinas',
          icon: Grid,
          description: 'Catálogo de executáveis, rotinas e atalhos',
          shortcut: 'Alt+6'
        }
      ]
    },
    {
      id: 'dev',
      title: 'Desenvolvimento & Suporte',
      shortTitle: 'Desenvolvimento',
      icon: GitPullRequest,
      items: [
        {
          id: 'git',
          label: 'Git & DevOps',
          shortLabel: 'Git',
          icon: GitPullRequest,
          description: 'Repositórios Git, branches, commits e PRs',
          shortcut: 'Alt+5'
        },
        {
          id: 'docs',
          label: 'Documentação Semântica',
          shortLabel: 'Docs',
          icon: FileSearch,
          description: 'Busca semântica RAG na documentação dos projetos',
          shortcut: 'Alt+7'
        },
        {
          id: 'help',
          label: 'Central de Ajuda',
          shortLabel: 'Ajuda',
          icon: HelpCircle,
          description: 'Diagnósticos do sistema, tutoriais e suporte',
          shortcut: 'Alt+9'
        }
      ]
    }
  ];

  // Identifica o item e grupo atualmente ativos
  const activeGroup = navThemeGroups.find((g) => g.items.some((item) => item.id === activeTab));
  const activeItem = activeGroup?.items.find((item) => item.id === activeTab);
  const ActiveIcon = activeItem?.icon || Terminal;

  return (
    <header className="bg-card/95 border-b border-border/80 px-3 sm:px-4 py-2 flex items-center justify-between shadow-md relative z-30 backdrop-blur-md transition-colors duration-300 gap-2 sm:gap-3 lg:gap-4 shrink-0 h-14">
      {/* Identidade do Aplicativo (Esquerda) */}
      <div className="flex items-center space-x-2.5 shrink-0">
        <div className="relative">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary/80 via-primary to-primary flex items-center justify-center font-black text-primary-foreground shadow-md shadow-primary/25 text-sm tracking-wider border border-primary/30">
            D
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-card rounded-full flex items-center justify-center">
            <span className="w-1 h-1 bg-white rounded-full animate-ping" />
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center space-x-1.5">
            <h1 className="text-xs sm:text-sm font-extrabold tracking-tight text-foreground font-sans flex items-center gap-1">
              Dev <span className="text-primary font-bold">Manager</span>
            </h1>
            <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-bold border border-primary/30">
              v1.0
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground font-medium hidden 2xl:block leading-tight">
            Cockpit de Desenvolvimento & Automação
          </p>
        </div>
      </div>

      {/* 2. Navegação dos Menus Temáticos (Centro-Esquerda) — Dimensões padronizadas h-9 */}
      <nav ref={navRef} className="flex items-center space-x-1.5 shrink-0">
        {/* Visualização Desktop (>= md): 3 Botões de Tema com Dropdown Individual */}
        <div className="hidden md:flex items-center space-x-1.5">
          {navThemeGroups.map((group) => {
            const GroupIcon = group.icon;
            const isGroupActive = group.items.some((item) => item.id === activeTab);
            const activeSubItem = group.items.find((item) => item.id === activeTab);
            const isOpen = openMenu === group.id;

            return (
              <div key={group.id} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMenu(isOpen ? null : group.id)}
                  title={`Tema: ${group.title} (Clique para alternar rotinas)`}
                  className={`h-9 px-3 rounded-lg text-xs font-semibold transition-all select-none border cursor-pointer flex items-center space-x-2 whitespace-nowrap ${
                    isGroupActive
                      ? 'bg-card text-foreground border-primary/50 shadow-xs'
                      : 'bg-card/50 hover:bg-card text-muted-foreground hover:text-foreground border-border/60 hover:border-border'
                  }`}
                >
                  <GroupIcon
                    className={`w-3.5 h-3.5 shrink-0 ${isGroupActive ? 'text-primary' : 'text-muted-foreground'}`}
                  />
                  <span>{group.shortTitle}</span>
                  {activeSubItem && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-primary text-primary-foreground font-mono leading-none shrink-0">
                      {activeSubItem.shortLabel}
                    </span>
                  )}
                  <ChevronDown
                    className={`w-3 h-3 text-muted-foreground transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180 text-primary' : ''
                    }`}
                  />
                </button>

                {/* Popover Dropdown das Abas deste Tema — 100% Opaco e Sólido */}
                {isOpen && (
                  <div
                    style={{ backgroundColor: 'hsl(var(--card))' }}
                    className="absolute top-full left-0 mt-2 w-72 bg-card text-card-foreground rounded-xl border border-border shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 mb-1.5 flex items-center justify-between">
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
                                  className={`text-[10px] truncate leading-normal ${
                                    isItemActive ? 'text-primary-foreground/90' : 'text-muted-foreground'
                                  }`}
                                >
                                  {item.description}
                                </div>
                              </div>
                            </div>
                            <span
                              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
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

        {/* Visualização Compacta (< md): Seletor de Módulo Dropdown Único */}
        <div className="md:hidden relative">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === 'compact' ? null : 'compact')}
            className="h-9 flex items-center space-x-2 px-3 rounded-lg text-xs font-semibold bg-card border border-primary/40 text-foreground shadow-xs cursor-pointer whitespace-nowrap"
          >
            <ActiveIcon className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>{activeItem?.label || 'Módulos'}</span>
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
              {navThemeGroups.map((group) => (
                <div key={group.id} className="space-y-1">
                  <div className="px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
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
                          <span className="text-[9px] font-mono opacity-80 shrink-0 ml-2">{item.shortcut}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* 3. Busca Rápida Ampla e Centralizada (Ctrl+K) — h-9 */}
      {onOpenQuickLauncher && (
        <button
          type="button"
          onClick={onOpenQuickLauncher}
          className="h-9 flex-1 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg px-3 rounded-lg bg-muted/40 hover:bg-muted/80 border border-border/70 hover:border-primary/50 text-muted-foreground hover:text-foreground transition-all text-xs flex items-center justify-between group shadow-xs cursor-pointer select-none"
          title="Abrir busca rápida de rotinas, comandos e ações (Ctrl+K)"
        >
          <div className="flex items-center space-x-2 min-w-0 pr-2">
            <Search className="w-4 h-4 text-primary shrink-0 group-hover:scale-110 transition-transform" />
            <span className="truncate text-xs font-normal">Buscar rotinas, tabelas, esteiras...</span>
          </div>
          <kbd className="px-1.5 py-0.5 rounded bg-card text-[10px] font-mono font-bold text-foreground border border-border/70 shadow-xs shrink-0">
            Ctrl+K
          </kbd>
        </button>
      )}

      {/* 4. Ações da Direita: Status do Sistema, Tema, Configurações e Atualizar — Todas h-9 */}
      <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
        {/* Popover de Status do Sistema (LAN, WSL, CPU e RAM centralizados) */}
        <div className="relative" ref={statusRef}>
          <button
            type="button"
            onClick={() => setIsStatusOpen(!isStatusOpen)}
            className={`h-9 px-2.5 rounded-lg border transition-all flex items-center space-x-1.5 text-xs select-none cursor-pointer ${
              isStatusOpen
                ? 'bg-card text-foreground border-primary/50 shadow-xs font-semibold'
                : 'bg-card/50 hover:bg-card border-border/60 hover:border-border text-muted-foreground hover:text-foreground'
            }`}
            title="Clique para ver IPs da máquina (LAN/WSL) e uso de CPU/RAM"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="hidden lg:inline text-xs font-medium">Status</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          </button>

          {isStatusOpen && (
            <div
              style={{ backgroundColor: 'hsl(var(--card))' }}
              className="absolute right-0 mt-2 w-80 bg-card text-card-foreground rounded-xl border border-border shadow-2xl z-50 p-3 space-y-3 animate-in fade-in zoom-in-95 duration-150"
            >
              {/* Cabeçalho */}
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">Diagnósticos & Rede</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                  Online
                </span>
              </div>

              {/* Seção de Endereços IP */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Wifi className="w-3 h-3 text-primary" />
                  <span>Endereços IP</span>
                </div>

                {networkIps ? (
                  <div className="space-y-1.5 bg-muted/40 p-2.5 rounded-lg border border-border/50 text-xs font-mono">
                    {/* IP Local (Windows) */}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-sans">LAN (Local):</span>
                      <div className="flex items-center space-x-1.5">
                        <strong className="text-foreground">{networkIps.primaryLocalIp}</strong>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(networkIps.primaryLocalIp, 'lan')}
                          className="p-1 rounded hover:bg-card text-muted-foreground hover:text-primary transition cursor-pointer"
                          title="Copiar IP Local"
                        >
                          {copiedIp === 'lan' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* IP do WSL se existir */}
                    {networkIps.wslIp && (
                      <div className="flex items-center justify-between pt-1.5 border-t border-border/40">
                        <span className="text-muted-foreground font-sans">WSL:</span>
                        <div className="flex items-center space-x-1.5">
                          <strong className="text-foreground">{networkIps.wslIp}</strong>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(networkIps.wslIp!, 'wsl')}
                            className="p-1 rounded hover:bg-card text-muted-foreground hover:text-primary transition cursor-pointer"
                            title="Copiar IP do WSL"
                          >
                            {copiedIp === 'wsl' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic">Detectando interfaces de rede...</p>
                )}
              </div>

              {/* Seção de Recursos (CPU / RAM) */}
              {systemMetrics ? (() => {
                const usedMb = systemMetrics.usedMemMb ?? systemMetrics.usedMemoryMb ?? 0;
                const totalMb = systemMetrics.totalMemMb ?? systemMetrics.totalMemoryMb ?? 1;
                const memPercent = systemMetrics.memUsagePercent ?? systemMetrics.memoryUsagePercent ?? 0;
                const cpu = systemMetrics.cpuUsagePercent ?? 0;
                const uptimeHours = Math.floor((systemMetrics.uptimeSeconds || 0) / 3600);
                const uptimeMinutes = Math.floor(((systemMetrics.uptimeSeconds || 0) % 3600) / 60);

                return (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-primary" />
                      <span>Uso da Máquina</span>
                    </div>

                    <div className="bg-muted/40 p-2.5 rounded-lg border border-border/50 space-y-2 text-xs">
                      {/* CPU */}
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Processador (CPU)</span>
                          <span className={`font-mono font-bold ${cpu > 80 ? 'text-rose-400' : 'text-foreground'}`}>
                            {cpu}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${cpu > 80 ? 'bg-rose-500' : 'bg-primary'}`}
                            style={{ width: `${Math.min(100, Math.max(0, cpu))}%` }}
                          />
                        </div>
                      </div>

                      {/* RAM */}
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Memória RAM</span>
                          <span className={`font-mono font-bold ${memPercent > 85 ? 'text-amber-400' : 'text-foreground'}`}>
                            {(usedMb / 1024).toFixed(1)} / {(totalMb / 1024).toFixed(1)} GB ({memPercent}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${memPercent > 85 ? 'bg-amber-500' : 'bg-primary'}`}
                            style={{ width: `${Math.min(100, Math.max(0, memPercent))}%` }}
                          />
                        </div>
                      </div>

                      {/* Uptime */}
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40 font-mono">
                        <span className="font-sans">Uptime SO:</span>
                        <span className="text-foreground font-semibold">{uptimeHours}h {uptimeMinutes}m</span>
                      </div>
                    </div>
                  </div>
                );
              })() : (
                <p className="text-[11px] text-muted-foreground italic">Coletando métricas do sistema...</p>
              )}

              {/* Atalho para Diagnósticos */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('help');
                  setIsStatusOpen(false);
                }}
                className="w-full py-2 px-2.5 rounded-lg bg-card hover:bg-muted border border-border/60 hover:border-primary/40 text-xs font-semibold text-primary flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <span>Central de Diagnósticos & Ajuda</span>
                <ChevronDown className="w-3 h-3 -rotate-90" />
              </button>
            </div>
          )}
        </div>

        {/* Seletor de Temas (h-9) */}
        <ThemeToggle />

        {/* Configurações (h-9 w-9) */}
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 shrink-0 ${
            activeTab === 'settings'
              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
              : 'bg-card/50 hover:bg-card border-border/60 hover:border-border text-muted-foreground hover:text-foreground'
          }`}
          title="Configurações do Sistema e Portas (Alt+8)"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Botão de Atualização Geral (h-9 w-9) */}
        <button
          type="button"
          onClick={onRefreshAll}
          disabled={isRefreshing}
          className="h-9 w-9 text-muted-foreground hover:text-foreground bg-card/50 hover:bg-card border border-border/60 hover:border-border rounded-lg flex items-center justify-center transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 shrink-0"
          title="Recarregar status de serviços, portas e repositórios"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
        </button>
      </div>
    </header>
  );
};

