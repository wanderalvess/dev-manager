import React from 'react';
import {
  Box,
  Compass,
  AlertCircle,
  Network,
  Copy,
  RotateCw,
  Terminal,
  Power,
  Trash2,
  Play,
  FolderPlus,
  Archive,
  Sliders,
  Search,
  RefreshCw
} from 'lucide-react';
import type {
  DockerDaemonStatus,
  WslDistroInfo,
  ContainerEnvironment
} from '../../../../shared/types';

export interface ContainersHeaderProps {
  daemonStatus: DockerDaemonStatus | null;
  selectedDistro: string;
  availableDistros: WslDistroInfo[];
  isSwitchingDistro: boolean;
  isOpeningWslTerminal: boolean;
  isTerminatingDistro: boolean;
  onSelectDistro: (distro: string) => void;
  onOpenWslTerminal: (distro?: string) => void;
  onTerminateDistro: (distro?: string) => void;
  onStartDockerDaemon: (distro?: string) => void;
  isStartingDaemon: boolean;
  environments: ContainerEnvironment[];
  selectedEnvId: string;
  onSelectEnvId: (id: string) => void;
  onStartEnvironment: (env: ContainerEnvironment) => void;
  onDeleteEnvironmentClick: (env: ContainerEnvironment) => void;
  onStartWinThorSequence: () => void;
  sequenceProgress: {
    running: boolean;
    currentName?: string;
    index?: number;
    total?: number;
    waitingSeconds?: number;
  };
  containersCount: number;
  onOpenSaveEnvModal: () => void;
  onOpenSnapshotsModal: () => void;
  onOpenInfrModal: () => void;
  showTopologyBus: boolean;
  onToggleTopologyBus: () => void;
  filter: string;
  onFilterChange: (value: string) => void;
  isLoading: boolean;
  onRefreshData: () => void;
  onOpenTour: () => void;
  copyWslIp: (text: string, key: string) => void;
  wslIpFeedback: string | null;
}

export const ContainersHeader: React.FC<ContainersHeaderProps> = ({
  daemonStatus,
  selectedDistro,
  availableDistros,
  isSwitchingDistro,
  isOpeningWslTerminal,
  isTerminatingDistro,
  onSelectDistro,
  onOpenWslTerminal,
  onTerminateDistro,
  onStartDockerDaemon,
  isStartingDaemon,
  environments,
  selectedEnvId,
  onSelectEnvId,
  onStartEnvironment,
  onDeleteEnvironmentClick,
  onStartWinThorSequence,
  sequenceProgress,
  containersCount,
  onOpenSaveEnvModal,
  onOpenSnapshotsModal,
  onOpenInfrModal,
  showTopologyBus,
  onToggleTopologyBus,
  filter,
  onFilterChange,
  isLoading,
  onRefreshData,
  onOpenTour,
  copyWslIp,
  wslIpFeedback
}) => {
  return (
    <>
      {/* Topo / Header da Página */}
      <header
        className="px-4 py-3 bg-card/85 backdrop-blur border-b border-border/80 flex flex-wrap items-center justify-between gap-3 shrink-0"
        data-tour="page-header"
      >
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary shrink-0 shadow-xs">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-base font-bold text-foreground tracking-tight">Containers & WSL</h2>
              <button
                type="button"
                onClick={onOpenTour}
                className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted transition cursor-pointer"
                title="Rever o tour guiado desta página"
              >
                <Compass className="w-3.5 h-3.5" />
              </button>
              {daemonStatus &&
                (daemonStatus.running ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                      {daemonStatus.isWsl
                        ? `WSL • ${daemonStatus.wslDistro || 'Docker Ativo'}`
                        : daemonStatus.engine === 'podman'
                        ? 'Podman Nativo'
                        : 'Docker Host'}
                    </span>
                    {daemonStatus.wslIp && (
                      <button
                        type="button"
                        onClick={() => copyWslIp(daemonStatus.wslIp!, 'wsl-ip')}
                        title="IP do WSL no Host (Clique para copiar)"
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/25 text-[10px] font-mono transition cursor-pointer"
                      >
                        <Network className="w-3 h-3 text-sky-500" />
                        <span>{daemonStatus.wslIp}</span>
                        <Copy className="w-2.5 h-2.5 opacity-70" />
                        {wslIpFeedback === 'wsl-ip' && (
                          <span className="text-[9px] font-bold text-emerald-500 ml-0.5">Copiado!</span>
                        )}
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3" /> Offline
                  </span>
                ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Orquestração de microsserviços, distros WSL2 e isolamento de runtime
            </p>
          </div>
        </div>

        {/* Controles Agrupados Semanticamente */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Grupo 1: Contexto de Execução (Runtime WSL & Ambiente) */}
          <div className="flex items-center bg-muted/50 border border-border/80 rounded-xl p-1 gap-1.5 shadow-2xs">
            {/* Seletor WSL */}
            <div className="flex items-center px-2 py-0.5 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1.5">
                Runtime
              </span>
              <select
                value={selectedDistro}
                onChange={(e) => onSelectDistro(e.target.value)}
                disabled={isSwitchingDistro}
                className="bg-transparent text-foreground font-semibold text-xs focus:outline-none cursor-pointer pr-1"
              >
                <option value="" className="bg-card text-foreground">
                  Windows Host (Nativo)
                </option>
                {availableDistros.map((d) => (
                  <option key={d.name} value={d.name} className="bg-card text-foreground">
                    WSL: {d.name} {d.state === 'Running' ? '●' : '○'}
                  </option>
                ))}
              </select>
              {isSwitchingDistro && <RotateCw className="w-3 h-3 animate-spin text-primary ml-1" />}

              {selectedDistro && (
                <div className="flex items-center gap-1 ml-1 pl-1 border-l border-border/60">
                  <button
                    type="button"
                    onClick={() => onOpenWslTerminal()}
                    disabled={isOpeningWslTerminal}
                    title={`Abrir terminal WSL na distro ${selectedDistro}`}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                  >
                    <Terminal className="w-3 h-3 text-sky-500" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onTerminateDistro()}
                    disabled={isTerminatingDistro}
                    title={`Desligar distro ${selectedDistro} (wsl --terminate)`}
                    className="p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                  >
                    <Power className={`w-3 h-3 ${isTerminatingDistro ? 'animate-spin text-rose-500' : ''}`} />
                  </button>
                </div>
              )}
            </div>

            {/* Separador vertical sutil */}
            {environments.length > 0 && <div className="h-4 w-[1px] bg-border/80" />}

            {/* Seletor de Ambientes */}
            {environments.length > 0 && (
              <div className="flex items-center px-2 py-0.5 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1.5">
                  Grupo
                </span>
                <select
                  value={selectedEnvId}
                  onChange={(e) => {
                    const id = e.target.value;
                    onSelectEnvId(id);
                    const found = environments.find((env) => env.id === id);
                    if (found) onStartEnvironment(found);
                  }}
                  disabled={sequenceProgress.running}
                  className="bg-transparent text-foreground font-semibold text-xs focus:outline-none cursor-pointer pr-1"
                >
                  <option value="" className="bg-card text-foreground">
                    Escolher...
                  </option>
                  {environments.map((env) => (
                    <option key={env.id} value={env.id} className="bg-card text-foreground">
                      {env.name}
                    </option>
                  ))}
                </select>
                {selectedEnvId && (
                  <button
                    type="button"
                    onClick={() => {
                      const found = environments.find((env) => env.id === selectedEnvId);
                      if (found) onDeleteEnvironmentClick(found);
                    }}
                    disabled={sequenceProgress.running}
                    title="Excluir grupo salvo"
                    className="p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Grupo 2: Ações de Execução & Utilitários */}
          <div className="flex items-center gap-2">
            {/* Botão de Orquestração WinThor */}
            <button
              onClick={onStartWinThorSequence}
              disabled={sequenceProgress.running || containersCount === 0}
              title="Inicia sequencialmente Oracle XE -> WTA -> WSH"
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer active:scale-98"
            >
              {sequenceProgress.running ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>Subir WinThor</span>
            </button>

            {/* Criar / Salvar Grupo */}
            <button
              onClick={onOpenSaveEnvModal}
              disabled={containersCount === 0}
              title="Criar novo grupo de containers ou salvar seleção"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-card hover:bg-muted border border-border/80 text-foreground rounded-lg text-xs font-semibold transition shadow-2xs cursor-pointer active:scale-98"
            >
              <FolderPlus className="w-3.5 h-3.5 text-primary" />
              <span className="hidden lg:inline">Novo Grupo</span>
            </button>

            {/* Snapshots WSL */}
            <button
              onClick={onOpenSnapshotsModal}
              title="Gerenciamento de Snapshots .tar do WSL (Importar / Exportar / Remover)"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-card hover:bg-muted border border-border/80 text-foreground rounded-lg text-xs font-semibold transition shadow-2xs cursor-pointer active:scale-98"
            >
              <Archive className="w-3.5 h-3.5 text-primary" />
              <span className="hidden lg:inline">Snapshots WSL</span>
            </button>

            {/* Assistente de Bootstrap INFR-Docker */}
            <button
              onClick={onOpenInfrModal}
              title="Assistente de Bootstrap INFR-Docker (Setup Oracle XE, WTA, WSH)"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-card hover:bg-muted border border-border/80 text-foreground rounded-lg text-xs font-semibold transition shadow-xs cursor-pointer active:scale-95"
            >
              <Sliders className="w-3.5 h-3.5 text-orange-500" />
              <span className="hidden lg:inline">Assistente INFR</span>
            </button>

            {/* Alternar Barramento de Topologia */}
            <button
              type="button"
              onClick={onToggleTopologyBus}
              title={showTopologyBus ? 'Ocultar barramento de topologia WinThor' : 'Exibir barramento de topologia WinThor'}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 border rounded-lg text-xs font-semibold transition shadow-xs cursor-pointer active:scale-95 ${
                showTopologyBus
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-card hover:bg-muted text-muted-foreground border-border/80'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">{showTopologyBus ? 'Topologia ON' : 'Topologia OFF'}</span>
            </button>

            {/* Campo de Busca */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <input
                type="text"
                value={filter}
                onChange={(e) => onFilterChange(e.target.value)}
                placeholder="Buscar..."
                className="bg-card border border-border/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-36 transition"
              />
            </div>

            {/* Botão Atualizar */}
            <button
              onClick={onRefreshData}
              disabled={isLoading}
              title="Atualizar lista de containers"
              className="p-1.5 bg-card hover:bg-muted border border-border/80 text-muted-foreground hover:text-foreground rounded-lg text-xs transition shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Banner de Progresso da Sequência WinThor */}
      {sequenceProgress.running && (
        <div className="p-3.5 mx-4 mt-3 bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-transparent border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 shadow-xs">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
              <RotateCw className="w-4 h-4 animate-spin text-emerald-500" />
            </div>
            <div>
              <div className="font-bold flex items-center gap-2">
                <span>Orquestrando Ambiente WinThor</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 font-mono">
                  Etapa {sequenceProgress.index} de {sequenceProgress.total}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Iniciando <strong className="font-mono text-foreground">{sequenceProgress.currentName}</strong>
                {sequenceProgress.waitingSeconds !== undefined && sequenceProgress.waitingSeconds > 0 && (
                  <span className="ml-2 font-semibold text-emerald-600 dark:text-emerald-400">
                    — aguardando warm-up ({sequenceProgress.waitingSeconds}s restantes)...
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Alerta Preventivo caso Docker Engine não esteja rodando */}
      {daemonStatus && !daemonStatus.running && (
        <div className="p-3 mx-4 mt-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 shadow-2xs">
          <div className="flex items-start sm:items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <div className="leading-snug">
              <span className="font-bold block sm:inline mr-1">Docker Engine offline:</span>
              <span>
                {daemonStatus.error ||
                  `O daemon do Docker está inativo${selectedDistro ? ` na distro WSL "${selectedDistro}"` : ''}. Inicie o serviço para gerenciar containers.`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {selectedDistro && (
              <>
                <button
                  type="button"
                  onClick={() => onStartDockerDaemon(selectedDistro)}
                  disabled={isStartingDaemon}
                  className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50 active:scale-98"
                >
                  {isStartingDaemon ? (
                    <RotateCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Power className="w-3 h-3" />
                  )}
                  <span>{isStartingDaemon ? 'Iniciando Docker...' : 'Iniciar Docker no WSL'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenWslTerminal(selectedDistro)}
                  className="px-2.5 py-1 bg-card hover:bg-muted text-foreground border border-border/80 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Abrir Terminal WSL
                </button>
              </>
            )}
            <button
              onClick={onRefreshData}
              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 border border-amber-500/35 rounded-lg font-semibold transition cursor-pointer shrink-0"
            >
              Recarregar
            </button>
          </div>
        </div>
      )}
    </>
  );
};
