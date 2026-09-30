import React from 'react';
import {
  Database,
  Globe,
  Key,
  Box,
  ExternalLink,
  Cpu,
  Activity,
  Network,
  Info,
  Square,
  Play,
  Pause,
  RotateCw,
  Terminal,
  Trash2
} from 'lucide-react';
import type {
  DockerContainerInfo,
  DockerContainerStats
} from '../../../../../shared/types';
import {
  extractOraclePort,
  getOracleTnsConfig,
  parsePortLinks
} from '../../../utils/dockerContainerUtils';

export interface ContainerCardProps {
  container: DockerContainerInfo;
  stats?: DockerContainerStats;
  isLoadingAction?: 'start' | 'stop' | 'restart' | 'remove';
  isOpeningTerminal?: boolean;
  isLoadingInspect?: boolean;
  copyFeedback: string | null;
  getStateBadge: (state: string) => React.ReactNode;
  onCopyText: (text: string, key: string) => void;
  onOpenOracleTools: (container: DockerContainerInfo) => void;
  onOpenWtaTools: (container: DockerContainerInfo) => void;
  onOpenWshTools: (container: DockerContainerInfo) => void;
  onInspectContainer: (container: DockerContainerInfo) => void;
  onContainerAction: (container: DockerContainerInfo, action: 'start' | 'stop' | 'restart' | 'remove') => void;
  onTogglePause: (container: DockerContainerInfo) => void;
  onOpenTerminal: (container: DockerContainerInfo) => void;
  onOpenLogs: (container: DockerContainerInfo) => void;
}

export const ContainerCard: React.FC<ContainerCardProps> = ({
  container,
  stats,
  isLoadingAction,
  isOpeningTerminal,
  isLoadingInspect,
  copyFeedback,
  getStateBadge,
  onCopyText,
  onOpenOracleTools,
  onOpenWtaTools,
  onOpenWshTools,
  onInspectContainer,
  onContainerAction,
  onTogglePause,
  onOpenTerminal,
  onOpenLogs
}) => {
  const isRunning = container.state === 'running';
  const cleanName = container.names.replace(/^\//, '');

  const isOracle = cleanName.toLowerCase().includes('oracle');
  const isWta = cleanName.toLowerCase().includes('wta') || cleanName.toLowerCase().includes('linux');
  const isWsh = cleanName.toLowerCase().includes('wsh');

  const cpuPercNumber = stats ? parseFloat(stats.cpu.replace('%', '')) || 0 : 0;
  const memPercNumber = stats ? parseFloat(stats.memPerc.replace('%', '')) || 0 : 0;

  return (
    <div
      key={container.id}
      className={`relative overflow-hidden rounded-xl border transition-all duration-200 bg-card ${
        isRunning
          ? isOracle
            ? 'border-orange-500/35 shadow-[0_2px_14px_rgba(234,88,12,0.06)]'
            : isWta
            ? 'border-cyan-500/35 shadow-[0_2px_14px_rgba(6,182,212,0.06)]'
            : isWsh
            ? 'border-violet-500/35 shadow-[0_2px_14px_rgba(139,92,246,0.06)]'
            : 'border-border/80 shadow-sm hover:border-primary/40'
          : 'border-border/60 opacity-80 hover:opacity-100'
      }`}
    >
      {/* Trilho Lateral Indicador de LED */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors ${
          isRunning
            ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)]'
            : container.state === 'paused'
            ? 'bg-amber-500'
            : 'bg-zinc-400 dark:bg-zinc-700'
        }`}
      />

      <div className="p-3.5 pl-4.5 flex flex-col gap-2.5">
        {/* Linha 1: Cabeçalho do Rack com Runtime Tag, Nome e Portas */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {/* Tag Temática de Runtime */}
            {isOracle ? (
              <span className="px-2 py-0.5 rounded bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 text-[10px] font-mono font-bold flex items-center gap-1.5">
                <Database className="w-3 h-3 text-orange-500" />
                ORACLE XE
              </span>
            ) : isWta ? (
              <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 text-[10px] font-mono font-bold flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-cyan-500" />
                WTA KARAF
              </span>
            ) : isWsh ? (
              <span className="px-2 py-0.5 rounded bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30 text-[10px] font-mono font-bold flex items-center gap-1.5">
                <Key className="w-3 h-3 text-violet-500" />
                WSH HUB
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30 text-[10px] font-mono font-bold flex items-center gap-1.5">
                <Box className="w-3 h-3 text-slate-400" />
                DOCKER
              </span>
            )}

            <span className="font-bold text-foreground text-sm tracking-tight font-sans">
              {cleanName}
            </span>

            <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded border border-border/60 select-all">
              {container.id.slice(0, 12)}
            </span>

            {getStateBadge(container.state)}
          </div>

          {/* Portas Mapeadas com Pills Interativas */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {parsePortLinks(container.ports).length > 0 ? (
              parsePortLinks(container.ports).map((p, idx) => (
                <a
                  key={idx}
                  href={`http://localhost:${p.hostPort}`}
                  target="_blank"
                  rel="noreferrer"
                  title={`Abrir http://localhost:${p.hostPort} (${p.containerPort}/${p.protocol})`}
                  className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 transition cursor-pointer"
                >
                  <span>{p.hostPort}→{p.containerPort}</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                </a>
              ))
            ) : container.ports ? (
              <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/60">
                {container.ports}
              </span>
            ) : null}
          </div>
        </div>

        {/* Linha 2: Barra de Imagem e Métricas de Recursos (Micro-Gauges) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 text-xs bg-muted/40 p-2.5 rounded-lg border border-border/70 font-mono">
          <div className="text-[11px] text-muted-foreground truncate max-w-lg flex items-center gap-1.5">
            <span className="text-muted-foreground/60 select-none">IMG:</span>
            <span className="text-foreground/90 truncate">{container.image}</span>
            <span className="text-muted-foreground/40 hidden sm:inline">•</span>
            <span className="text-muted-foreground/70 text-[10px] hidden sm:inline">{container.status}</span>
          </div>

          {/* Medidores de CPU e Memória */}
          {isRunning && stats && (
            <div className="flex items-center gap-4 shrink-0 flex-wrap" data-tour="container-stats">
              {/* CPU Gauge */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-sky-400" /> CPU
                </span>
                <div className="w-16 bg-background/80 h-1.5 rounded-full overflow-hidden border border-border/60">
                  <div
                    className={`h-full transition-all duration-300 ${
                      cpuPercNumber > 80
                        ? 'bg-rose-500'
                        : cpuPercNumber > 50
                        ? 'bg-amber-500'
                        : 'bg-sky-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(4, cpuPercNumber))}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono tabular-nums text-foreground font-semibold min-w-[36px] text-right">
                  {stats.cpu}
                </span>
              </div>

              {/* RAM Gauge */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Activity className="w-3 h-3 text-purple-400" /> MEM
                </span>
                <div className="w-16 bg-background/80 h-1.5 rounded-full overflow-hidden border border-border/60">
                  <div
                    className={`h-full transition-all duration-300 ${
                      memPercNumber > 85
                        ? 'bg-rose-500'
                        : memPercNumber > 60
                        ? 'bg-amber-500'
                        : 'bg-purple-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(4, memPercNumber))}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono tabular-nums text-foreground font-semibold">
                  {stats.mem}
                </span>
              </div>

              {/* Net I/O */}
              {stats.netIO && stats.netIO !== '0B' && (
                <span className="text-[10px] text-muted-foreground/80 hidden xl:inline">
                  NET: {stats.netIO}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Linha 3: Barra de Ações Dividida (Ferramentas de Runtime + Ciclo de Vida) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/60" data-tour="container-actions">
          {/* Lado Esquerdo: Ferramentas do Runtime WinThor */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Ferramentas Oracle */}
            {isOracle && isRunning && (
              <button
                onClick={() => onOpenOracleTools(container)}
                title="Ferramentas Especializadas Oracle (db_health, SQL*Plus, Data Pump, TNS)"
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 shadow-sm"
              >
                <Database className="w-3.5 h-3.5 text-orange-500" />
                <span>Ferramentas Oracle</span>
              </button>
            )}

            {/* Atalho TNS */}
            {isOracle && (
              <button
                onClick={() => {
                  const port = extractOraclePort(container.ports);
                  onCopyText(getOracleTnsConfig(port), `tns-${container.id}`);
                }}
                title="Copiar bloco de conexão do tnsnames.ora para este container"
                className="flex items-center space-x-1 px-2 py-1.5 bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/80 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-95 shadow-sm"
              >
                <Network className="w-3 h-3 text-orange-400" />
                <span>{copyFeedback === `tns-${container.id}` ? 'TNS Copiado!' : 'Copiar TNS'}</span>
              </button>
            )}

            {/* Utilitários WTA */}
            {isWta && (
              <button
                onClick={() => onOpenWtaTools(container)}
                title="Utilitários WTA (Portal, Instalador, Console Karaf, Modo Desenvolvedor)"
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 shadow-sm"
              >
                <Globe className="w-3.5 h-3.5 text-cyan-500" />
                <span>Utilitários WTA</span>
              </button>
            )}

            {/* Utilitários WSH */}
            {isWsh && (
              <button
                onClick={() => onOpenWshTools(container)}
                title="Utilitários Especializados WSH (Gerador MD5, Checagem de /opt, Rotina 2650)"
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 shadow-sm"
              >
                <Key className="w-3.5 h-3.5 text-violet-500" />
                <span>Utilitários WSH</span>
              </button>
            )}
          </div>

          {/* Lado Direito: Controles Táticos de Ciclo de Vida */}
          <div className="flex items-center space-x-1.5 shrink-0 ml-auto">
            {/* Inspecionar */}
            <button
              onClick={() => onInspectContainer(container)}
              disabled={isLoadingInspect}
              title="Inspecionar Detalhes (docker inspect)"
              className="p-1.5 bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/80 rounded-lg transition cursor-pointer active:scale-95"
            >
              <Info className="w-3.5 h-3.5 text-primary" />
            </button>

            {isRunning ? (
              <>
                <button
                  onClick={() => onContainerAction(container, 'stop')}
                  disabled={Boolean(isLoadingAction)}
                  title="Parar Container"
                  className="flex items-center space-x-1 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer active:scale-98"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Parar</span>
                </button>
                <button
                  onClick={() => onTogglePause(container)}
                  title={container.state === 'paused' ? 'Despausar Container' : 'Pausar Container'}
                  className="p-1.5 bg-card hover:bg-muted text-amber-400 border border-amber-500/30 rounded-lg transition cursor-pointer active:scale-98"
                >
                  {container.state === 'paused' ? (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Pause className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={() => onContainerAction(container, 'restart')}
                  disabled={Boolean(isLoadingAction)}
                  title="Reiniciar Container"
                  className="p-1.5 bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/80 rounded-lg transition disabled:opacity-50 cursor-pointer active:scale-98"
                >
                  <RotateCw
                    className={`w-3.5 h-3.5 ${isLoadingAction === 'restart' ? 'animate-spin text-primary' : ''}`}
                  />
                </button>
              </>
            ) : (
              <button
                onClick={() => onContainerAction(container, 'start')}
                disabled={Boolean(isLoadingAction)}
                title="Iniciar Container"
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-2xs disabled:opacity-50 cursor-pointer active:scale-98"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Iniciar</span>
              </button>
            )}

            {/* Terminal */}
            {isRunning && (
              <button
                data-tour="container-terminal"
                onClick={() => onOpenTerminal(container)}
                disabled={Boolean(isOpeningTerminal)}
                title="Abrir terminal interativo do container (bash)"
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-card hover:bg-muted text-sky-400 border border-sky-500/30 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50 active:scale-98"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>{isOpeningTerminal ? 'Abrindo...' : 'Terminal'}</span>
              </button>
            )}

            {/* Logs */}
            <button
              data-tour="container-logs"
              onClick={() => onOpenLogs(container)}
              title="Inspecionar Logs"
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-card hover:bg-muted text-foreground border border-border/80 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-98"
            >
              <Terminal className="w-3.5 h-3.5 text-primary" />
              <span>Logs</span>
            </button>

            {/* Remover */}
            <button
              onClick={() => onContainerAction(container, 'remove')}
              disabled={Boolean(isLoadingAction)}
              title="Remover Container"
              className="p-1.5 hover:text-rose-400 text-muted-foreground rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
