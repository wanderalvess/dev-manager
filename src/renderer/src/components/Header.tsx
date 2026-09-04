import React, { useEffect, useState, useCallback } from 'react';
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
  Cpu
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { NetworkIpInfo, SystemMetrics } from '../../../shared/types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onRefreshAll: () => void;
  isRefreshing: boolean;
  onOpenQuickLauncher?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onRefreshAll,
  isRefreshing,
  onOpenQuickLauncher
}) => {

  const [timeStr, setTimeStr] = useState<string>('');
  const [networkIps, setNetworkIps] = useState<NetworkIpInfo | null>(null);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
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

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIp(label);
    setTimeout(() => setCopiedIp(null), 1800);
  };

  const navItems = [
    { id: 'env', label: 'Ambiente Dev', shortLabel: 'Ambiente', icon: Terminal, title: 'Ambiente de Desenvolvimento & Serviços' },
    { id: 'database', label: 'Banco de Dados', shortLabel: 'Banco', icon: Database, title: 'Conexão e Consultas Oracle, MySQL, Postgres' },
    { id: 'containers', label: 'Containers', shortLabel: 'Docker', icon: Box, title: 'Gerenciador de Containers Docker' },
    { id: 'deploy', label: 'Deploy', shortLabel: 'Deploy', icon: Layers, title: 'Perfis de Deploy — Karaf OSGi, Docker & Comandos Genéricos' },
    { id: 'git', label: 'Git & Azure', shortLabel: 'Git', icon: GitPullRequest, title: 'Repositórios Git & Azure DevOps' },
    { id: 'routines', label: 'Rotinas', shortLabel: 'Rotinas', icon: Grid, title: 'Catálogo de Executáveis e Rotinas' },
    { id: 'docs', label: 'Documentação', shortLabel: 'Docs', icon: FileSearch, title: 'Busca semântica na documentação dos projetos' },
    { id: 'help', label: 'Ajuda', shortLabel: 'Ajuda', icon: HelpCircle, title: 'Central de Ajuda e Diagnósticos' }
  ];

  return (
    <header className="bg-card/95 border-b border-border/80 px-3 sm:px-4 py-2 flex items-center justify-between shadow-md relative z-30 backdrop-blur-md transition-colors duration-300 gap-2 shrink-0 h-13">
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
            <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-mono font-bold border border-primary/30">
              v1.0
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground font-medium hidden 2xl:block leading-tight">
            Cockpit de Automação & OSGi
          </p>
        </div>
      </div>

      {/* Navegação Principal (Centro) - Sem barra de rolagem */}
      <nav className="flex items-center space-x-1 bg-muted/60 p-1 rounded-xl border border-border/60 shadow-inner max-w-full min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={item.title}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 select-none ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm font-bold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/70'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
              <span className="hidden md:inline lg:hidden">{item.shortLabel}</span>
              <span className="hidden lg:inline">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Status do Sistema e Ações (Direita) */}
      <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
        {/* Badges de IPs de Rede (Local e WSL) com 1-click copy */}
        {networkIps && (
          <div className="hidden lg:flex items-center space-x-1 font-mono text-[11px]">
            {/* IP Local (Windows) */}
            <button
              onClick={() => copyToClipboard(networkIps.primaryLocalIp, 'lan')}
              title={`IP Local da Máquina: ${networkIps.primaryLocalIp} (Clique para copiar)`}
              className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-muted/60 hover:bg-muted border border-border/80 text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              {copiedIp === 'lan' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copiado!</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3 h-3 text-primary" />
                  <span>LAN: <strong className="text-foreground">{networkIps.primaryLocalIp}</strong></span>
                </>
              )}
            </button>

            {/* IP do WSL (se detectado) */}
            {networkIps.wslIp && (
              <button
                onClick={() => copyToClipboard(networkIps.wslIp!, 'wsl')}
                title={`IP da Distribuição WSL: ${networkIps.wslIp} (Clique para copiar)`}
                className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-muted/60 hover:bg-muted border border-border/80 text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                {copiedIp === 'wsl' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-3 h-3 text-amber-400" />
                    <span>WSL: <strong className="text-foreground">{networkIps.wslIp}</strong></span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Botão de Busca Rápida (Ctrl+K) */}
        {onOpenQuickLauncher && (
          <button
            onClick={onOpenQuickLauncher}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-muted/60 hover:bg-muted border border-border/80 text-muted-foreground hover:text-foreground transition-all text-xs group"
            title="Abrir busca rápida de rotinas e ações (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
            <span className="hidden xl:inline text-[11px] font-medium">Buscar...</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-card text-[9px] font-mono font-bold text-foreground border border-border/60 shadow-sm">
              Ctrl+K
            </kbd>
          </button>
        )}

        {/* Recursos do Sistema (CPU / RAM) */}
        {systemMetrics && (() => {
          const usedMb = systemMetrics.usedMemMb ?? systemMetrics.usedMemoryMb ?? 0;
          const totalMb = systemMetrics.totalMemMb ?? systemMetrics.totalMemoryMb ?? 1;
          const memPercent = systemMetrics.memUsagePercent ?? systemMetrics.memoryUsagePercent ?? 0;
          const cpu = systemMetrics.cpuUsagePercent ?? 0;
          const uptimeHours = Math.floor((systemMetrics.uptimeSeconds || 0) / 3600);
          const uptimeMinutes = Math.floor(((systemMetrics.uptimeSeconds || 0) % 3600) / 60);

          return (
            <div
              className="hidden 2xl:flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-muted/60 border border-border/80 text-[11px] font-mono text-muted-foreground select-none"
              title={`Uso do Sistema:\nCPU: ${cpu}%\nRAM: ${(usedMb / 1024).toFixed(1)} GB / ${(totalMb / 1024).toFixed(1)} GB (${memPercent}%)\nUptime SO: ${uptimeHours}h ${uptimeMinutes}m`}
            >
              <div className="flex items-center space-x-1">
                <Cpu className={`w-3 h-3 ${cpu > 80 ? 'text-rose-400 animate-pulse' : 'text-primary'}`} />
                <span className={cpu > 80 ? 'text-rose-400 font-bold' : 'text-foreground'}>
                  {cpu}%
                </span>
              </div>
              <span className="text-border">|</span>
              <div className="flex items-center space-x-1">
                <span className="text-[10px] text-muted-foreground font-sans font-medium">RAM</span>
                <span className={memPercent > 85 ? 'text-amber-400 font-bold' : 'text-foreground'}>
                  {memPercent}%
                </span>
              </div>
            </div>
          );
        })()}

        {/* Relógio Local */}
        <div className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-muted/60 border border-border/60 text-[11px] font-mono text-muted-foreground">
          <Activity className="w-3 h-3 text-primary" />
          <span className="font-semibold text-foreground">{timeStr}</span>
        </div>

        {/* Seletor de Temas */}
        <ThemeToggle />

        {/* Configurações — fixo, fora do nav central (nunca fica escondido/cortado) */}
        <button
          onClick={() => setActiveTab('settings')}
          className={`p-1.5 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 ${
            activeTab === 'settings'
              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
              : 'text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted border-border/60'
          }`}
          title="Configurações do Sistema e Portas (Alt+8)"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Botão de Atualização Geral */}
        <button
          onClick={onRefreshAll}
          disabled={isRefreshing}
          className="p-1.5 text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted border border-border/60 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary/40"
          title="Recarregar status de serviços, portas e repositórios"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
        </button>
      </div>
    </header>
  );
};

