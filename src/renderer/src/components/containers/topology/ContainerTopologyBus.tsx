import React from 'react';
import {
  AlertCircle,
  Clock,
  X,
  Terminal,
  Database,
  Globe,
  Key,
  ExternalLink
} from 'lucide-react';
import type {
  DockerContainerInfo,
  DockerDaemonStatus
} from '../../../../../shared/types';
import {
  computeStackTopology,
  getOracleTnsConfig
} from '../../../utils/dockerContainerUtils';

export interface ContainerTopologyBusProps {
  showTopologyBus: boolean;
  onClose: () => void;
  stackTopology: ReturnType<typeof computeStackTopology>;
  selectedDistro?: string;
  daemonStatus: DockerDaemonStatus | null;
  onOpenWslTerminal: () => void;
  onOpenOracleTools: (container: DockerContainerInfo) => void;
  onOpenWtaTools: (container: DockerContainerInfo) => void;
  onOpenWshTools: (container: DockerContainerInfo | null, tab?: 'md5' | 'files' | 'rotina2650') => void;
  copyFeedback: string | null;
  onCopyText: (text: string, key: string) => void;
  containers: DockerContainerInfo[];
}

export const ContainerTopologyBus: React.FC<ContainerTopologyBusProps> = ({
  showTopologyBus,
  onClose,
  stackTopology,
  selectedDistro,
  daemonStatus,
  onOpenWslTerminal,
  onOpenOracleTools,
  onOpenWtaTools,
  onOpenWshTools,
  copyFeedback,
  onCopyText,
  containers
}) => {
  if (!showTopologyBus) return null;

  return (
    <div className="mx-4 mt-3 bg-card border border-border/80 rounded-xl p-3.5 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <span>Topologia do Ambiente WinThor</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/60 font-normal">
              WSL2 &amp; Containers
            </span>
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {stackTopology.isStackComplete ? (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              STACK TOTALMENTE OPERACIONAL
            </span>
          ) : stackTopology.hasMissingDependency ? (
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-sm">
              <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
              ALERTA: ORACLE OFFLINE COM SERVIÇOS ATIVOS
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-sm">
              <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              STACK PARCIALMENTE ATIVA
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
            title="Ocultar Barramento de Topologia"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Nós Interconectados da Topologia */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-stretch relative">
        {/* Nó 1: WSL2 Runtime Host */}
        <div className="bg-muted/30 dark:bg-muted/15 border border-border/80 rounded-lg p-3 flex flex-col justify-between space-y-2 relative group hover:border-sky-500/40 transition shadow-2xs">
          <div className="flex items-start justify-between gap-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                <Terminal className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                  Host Runtime
                </div>
                <div className="text-xs font-bold text-foreground font-mono truncate max-w-[120px]">
                  {selectedDistro || daemonStatus?.wslDistro || 'WSL2 Nativo'}
                </div>
              </div>
            </div>
            <span
              className={`w-2 h-2 rounded-full mt-1 ${
                daemonStatus?.running ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]' : 'bg-rose-500'
              }`}
              title={daemonStatus?.running ? 'Docker Engine Ativo' : 'Docker Engine Offline'}
            />
          </div>

          <div className="pt-1 flex items-center justify-between gap-1 text-[10px] font-mono">
            {daemonStatus?.wslIp ? (
              <span className="text-sky-700 dark:text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                IP: {daemonStatus.wslIp}
              </span>
            ) : (
              <span className="text-muted-foreground">IP Local</span>
            )}
            <button
              type="button"
              onClick={onOpenWslTerminal}
              className="text-[10px] text-muted-foreground hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              <Terminal className="w-2.5 h-2.5" /> Terminal
            </button>
          </div>
        </div>

        {/* Nó 2: Oracle XE 11g */}
        <div
          className={`bg-muted/30 dark:bg-muted/15 border rounded-lg p-3 flex flex-col justify-between space-y-2 relative transition ${
            stackTopology.oracle.running
              ? 'border-orange-500/40 hover:border-orange-500/60 shadow-xs'
              : 'border-border/80 opacity-75 hover:opacity-100'
          }`}
        >
          <div className="flex items-start justify-between gap-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                <Database className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-orange-600 dark:text-orange-400 font-bold">
                  Oracle XE 11g
                </div>
                <div className="text-xs font-bold text-foreground font-mono truncate max-w-[120px]">
                  {stackTopology.oracle.name}
                </div>
              </div>
            </div>
            <span
              className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                stackTopology.oracle.running
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-muted text-muted-foreground border-border/70'
              }`}
            >
              {stackTopology.oracle.running ? `:${stackTopology.oracle.port}` : 'OFF'}
            </span>
          </div>

          <div className="pt-1 flex items-center justify-between gap-1 text-[10px]">
            <button
              type="button"
              onClick={() => {
                onCopyText(getOracleTnsConfig(stackTopology.oracle.port), 'topo-tns');
              }}
              className="px-1.5 py-0.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 dark:text-orange-400 rounded border border-orange-500/30 font-semibold cursor-pointer transition"
            >
              {copyFeedback === 'topo-tns' ? 'Copiado!' : 'Copiar TNS'}
            </button>
            {stackTopology.oracle.container && (
              <button
                type="button"
                onClick={() => onOpenOracleTools(stackTopology.oracle.container!)}
                className="text-muted-foreground hover:text-orange-600 dark:hover:text-orange-400 hover:underline cursor-pointer font-medium"
              >
                Ferramentas
              </button>
            )}
          </div>
        </div>

        {/* Nó 3: WTA (Apache Karaf) */}
        <div
          className={`bg-muted/30 dark:bg-muted/15 border rounded-lg p-3 flex flex-col justify-between space-y-2 relative transition ${
            stackTopology.wta.running
              ? 'border-cyan-500/40 hover:border-cyan-500/60 shadow-xs'
              : 'border-border/80 opacity-75 hover:opacity-100'
          }`}
        >
          <div className="flex items-start justify-between gap-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                <Globe className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-bold">
                  WTA (Karaf)
                </div>
                <div className="text-xs font-bold text-foreground font-mono truncate max-w-[120px]">
                  {stackTopology.wta.name}
                </div>
              </div>
            </div>
            <span
              className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                stackTopology.wta.running
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-muted text-muted-foreground border-border/70'
              }`}
            >
              {stackTopology.wta.running ? `:${stackTopology.wta.port}` : 'OFF'}
            </span>
          </div>

          <div className="pt-1 flex items-center justify-between gap-1 text-[10px]">
            {stackTopology.wta.running ? (
              <button
                type="button"
                onClick={() =>
                  window.electronAPI?.openExternal?.(`http://localhost:${stackTopology.wta.port}/wta/`)
                }
                className="px-1.5 py-0.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 rounded border border-cyan-500/30 font-semibold cursor-pointer transition flex items-center gap-1"
              >
                <span>Abrir Portal</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </button>
            ) : (
              <span className="text-muted-foreground text-[10px] font-mono">Porta 8080</span>
            )}
            {stackTopology.wta.container && (
              <button
                type="button"
                onClick={() => onOpenWtaTools(stackTopology.wta.container!)}
                className="text-muted-foreground hover:text-cyan-600 dark:hover:text-cyan-400 hover:underline cursor-pointer font-medium"
              >
                Karaf
              </button>
            )}
          </div>
        </div>

        {/* Nó 4: WSH (Smart Hub) */}
        <div
          className={`bg-muted/30 dark:bg-muted/15 border rounded-lg p-3 flex flex-col justify-between space-y-2 relative transition ${
            stackTopology.wsh.running
              ? 'border-violet-500/40 hover:border-violet-500/60 shadow-xs'
              : 'border-border/80 opacity-75 hover:opacity-100'
          }`}
        >
          <div className="flex items-start justify-between gap-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-violet-500/10 border border-violet-500/25 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                <Key className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-violet-600 dark:text-violet-400 font-bold">
                  WinThor Hub (WSH)
                </div>
                <div className="text-xs font-bold text-foreground font-mono truncate max-w-[120px]">
                  {stackTopology.wsh.name}
                </div>
              </div>
            </div>
            <span
              className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                stackTopology.wsh.running
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-muted text-muted-foreground border-border/70'
              }`}
            >
              {stackTopology.wsh.running ? ':8080' : 'OFF'}
            </span>
          </div>

          <div className="pt-1 flex items-center justify-between gap-1 text-[10px]">
            <button
              type="button"
              onClick={() => {
                onOpenWshTools(stackTopology.wsh.container || (containers[0] ?? null), 'md5');
              }}
              className="px-1.5 py-0.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-700 dark:text-violet-400 rounded border border-violet-500/30 font-semibold cursor-pointer transition"
            >
              Gerador MD5
            </button>
            <button
              type="button"
              onClick={() => {
                onOpenWshTools(stackTopology.wsh.container || (containers[0] ?? null), 'rotina2650');
              }}
              className="text-muted-foreground hover:text-violet-600 dark:hover:text-violet-400 hover:underline cursor-pointer font-medium"
            >
              Rotina 2650
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
