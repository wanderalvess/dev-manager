import React, { useState } from 'react';
import { SlidersHorizontal, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import type { ProcessStatus, ServiceStatus } from '../../../../shared/types';

interface DiagnosticsPanelProps {
  services: ServiceStatus[];
  processes: ProcessStatus[];
  isCheckingProcesses: boolean;
  actionLoading: string | null;
  onStartService: (name: string) => void;
  onStopService: (name: string) => void;
  onBatchStart: () => void;
  onBatchStop: () => void;
  onKillProcess: (name: string) => void;
}

/** Seção colapsável: diagnósticos do sistema (serviços Windows e processos conflitantes). */
export const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({
  services,
  processes,
  isCheckingProcesses,
  actionLoading,
  onStartService,
  onStopService,
  onBatchStart,
  onBatchStop,
  onKillProcess
}) => {
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const runningServicesCount = services.filter((s) => s.state === 'RUNNING').length;
  const runningProcessesCount = processes.filter((p) => p.isRunning).length;

  return (
    <div className="bg-card border border-border rounded-[14px] shadow-xs px-5 py-4 flex flex-col space-y-2">
      <button
        type="button"
        onClick={() => setShowDiagnostics(!showDiagnostics)}
        className="flex items-center justify-between text-base font-semibold text-foreground cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          <span>Serviços Windows e travas <span className="text-muted-foreground font-normal">({services.length})</span></span>
        </div>
        {showDiagnostics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {showDiagnostics && (
        <div className="space-y-3 pt-2 border-t border-border/50 animate-fade-in">
          {/* Ações Rápidas de Parada de Serviços */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-2xs text-muted-foreground font-mono">
              {runningServicesCount} rodando • {runningProcessesCount} travas
            </span>
            <div className="flex items-center space-x-1.5">
              {runningServicesCount > 0 && (
                <button
                  onClick={onBatchStop}
                  disabled={actionLoading === 'batch-stop-srv'}
                  className="px-2 py-1 bg-danger/10 hover:bg-danger/20 text-danger border border-danger/30 rounded-lg text-2xs font-bold"
                >
                  Parar Serviços
                </button>
              )}
              {runningServicesCount < services.length && (
                <button
                  onClick={onBatchStart}
                  disabled={actionLoading === 'batch-start-srv'}
                  className="px-2 py-1 bg-success/10 hover:bg-success/20 text-success border border-success/30 rounded-lg text-2xs font-bold"
                >
                  Iniciar Serviços
                </button>
              )}
            </div>
          </div>

          {/* Lista compacta de Serviços Windows */}
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {services.map((srv) => (
              <div
                key={srv.name}
                className="p-2 bg-card/60 border border-border/60 rounded-lg flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-2 truncate">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      srv.state === 'RUNNING' ? 'bg-success animate-pulse' : 'bg-muted-foreground/40'
                    }`}
                  />
                  <span className="font-semibold text-foreground truncate">{srv.displayName || srv.name}</span>
                </div>
                <div>
                  {srv.state === 'RUNNING' ? (
                    <button
                      onClick={() => onStopService(srv.name)}
                      disabled={actionLoading === `stop-${srv.name}`}
                      className="px-2 py-0.5 bg-danger/10 text-danger border border-danger/20 rounded text-2xs font-bold"
                    >
                      Parar
                    </button>
                  ) : (
                    <button
                      onClick={() => onStartService(srv.name)}
                      disabled={actionLoading === `start-${srv.name}`}
                      className="px-2 py-0.5 bg-success/10 text-success border border-success/20 rounded text-2xs font-bold"
                    >
                      Iniciar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Processos com travas */}
          {processes.length > 0 && (
            <div className="pt-2 border-t border-border/40">
              <span className="text-2xs font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                <RefreshCw className={`w-3 h-3 ${isCheckingProcesses ? 'animate-spin text-primary' : ''}`} />
                Processos Conflitantes:
              </span>
              <div className="space-y-1">
                {processes.map((p) => (
                  <div
                    key={p.name}
                    className="p-1.5 bg-card/40 border border-border/40 rounded flex items-center justify-between text-xs"
                  >
                    <span className="text-2xs truncate text-foreground">{p.displayName || p.name}</span>
                    {p.isRunning ? (
                      <button
                        onClick={() => onKillProcess(p.name)}
                        className="px-1.5 py-0.5 bg-destructive text-destructive-foreground rounded text-2xs font-bold"
                      >
                        Matar
                      </button>
                    ) : (
                      <span className="text-2xs text-muted-foreground font-mono">Inativo</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
