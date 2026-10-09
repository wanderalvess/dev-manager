import React from 'react';
import {
  Database,
  Globe,
  Key,
  Network,
  Info,
  Square,
  Play,
  Pause,
  RotateCw,
  Terminal,
  Trash2
} from 'lucide-react';
import type { DockerContainerInfo } from '../../../../../shared/types';
import { extractOraclePort, getOracleTnsConfig } from '../../../utils/dockerContainerUtils';
import type { ContainerCardKinds } from '../../../utils/containerCardKind';

interface ContainerCardActionsProps extends ContainerCardKinds {
  container: DockerContainerInfo;
  isRunning: boolean;
  isLoadingAction?: 'start' | 'stop' | 'restart' | 'remove';
  isOpeningTerminal?: boolean;
  isLoadingInspect?: boolean;
  copyFeedback: string | null;
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

/** Linha 3: ferramentas de runtime (esquerda) e controles de ciclo de vida (direita). */
export const ContainerCardActions: React.FC<ContainerCardActionsProps> = ({
  container,
  isRunning,
  isOracle,
  isWta,
  isWsh,
  isLoadingAction,
  isOpeningTerminal,
  isLoadingInspect,
  copyFeedback,
  onCopyText,
  onOpenOracleTools,
  onOpenWtaTools,
  onOpenWshTools,
  onInspectContainer,
  onContainerAction,
  onTogglePause,
  onOpenTerminal,
  onOpenLogs
}) => (
  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/60" data-tour="container-actions">
    {/* Lado Esquerdo: Ferramentas do Runtime WinThor */}
    <div className="flex items-center gap-1.5 flex-wrap">
      {isOracle && isRunning && (
        <button
          onClick={() => onOpenOracleTools(container)}
          title="Ferramentas Especializadas Oracle (db_health, SQL*Plus, Data Pump, TNS)"
          className="flex items-center space-x-1 px-2.5 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 shadow-xs"
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
          className="flex items-center space-x-1 px-2 py-1.5 bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/80 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-95 shadow-xs"
        >
          <Network className="w-3 h-3 text-orange-400" />
          <span>{copyFeedback === `tns-${container.id}` ? 'TNS Copiado!' : 'Copiar TNS'}</span>
        </button>
      )}

      {isWta && (
        <button
          onClick={() => onOpenWtaTools(container)}
          title="Utilitários WTA (Portal, Instalador, Console Karaf, Modo Desenvolvedor)"
          className="flex items-center space-x-1 px-2.5 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 shadow-xs"
        >
          <Globe className="w-3.5 h-3.5 text-cyan-500" />
          <span>Utilitários WTA</span>
        </button>
      )}

      {isWsh && (
        <button
          onClick={() => onOpenWshTools(container)}
          title="Utilitários Especializados WSH (Gerador MD5, Checagem de /opt, Rotina 2650)"
          className="flex items-center space-x-1 px-2.5 py-1.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 shadow-xs"
        >
          <Key className="w-3.5 h-3.5 text-violet-500" />
          <span>Utilitários WSH</span>
        </button>
      )}
    </div>

    {/* Lado Direito: Controles Táticos de Ciclo de Vida */}
    <div className="flex items-center space-x-1.5 shrink-0 ml-auto">
      <button
        onClick={() => onInspectContainer(container)}
        disabled={isLoadingInspect}
        title="Inspecionar Detalhes (docker inspect)" aria-label="Inspecionar Detalhes (docker inspect)"
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
            title="Reiniciar Container" aria-label="Reiniciar Container"
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

      <button
        data-tour="container-logs"
        onClick={() => onOpenLogs(container)}
        title="Inspecionar Logs"
        className="flex items-center space-x-1 px-2.5 py-1.5 bg-card hover:bg-muted text-foreground border border-border/80 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-98"
      >
        <Terminal className="w-3.5 h-3.5 text-primary" />
        <span>Logs</span>
      </button>

      <button
        onClick={() => onContainerAction(container, 'remove')}
        disabled={Boolean(isLoadingAction)}
        title="Remover Container" aria-label="Remover Container"
        className="p-1.5 hover:text-rose-400 text-muted-foreground rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);
