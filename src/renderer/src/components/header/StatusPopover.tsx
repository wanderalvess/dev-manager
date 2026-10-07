import React from 'react';
import { Activity, Wifi, Check, Copy, Cpu, ChevronDown } from 'lucide-react';
import { NetworkIpInfo, SystemMetrics } from '../../../../shared/types';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';

interface StatusPopoverProps {
  networkIps: NetworkIpInfo | null;
  systemMetrics: SystemMetrics | null;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  statusRef: React.RefObject<HTMLDivElement>;
  onOpenHelp: () => void;
}

export const StatusPopover: React.FC<StatusPopoverProps> = ({
  networkIps,
  systemMetrics,
  isOpen,
  setIsOpen,
  statusRef,
  onOpenHelp
}) => {
  const { copy: copyToClipboard, copiedKey: copiedIp } = useCopyToClipboard(1800);

  return (
    <div className="relative" ref={statusRef}>
      <button
        type="button"
        data-tour="status"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-9 px-2 sm:px-2.5 rounded-lg border transition-all flex items-center space-x-1 sm:space-x-1.5 text-xs select-none cursor-pointer ${
          isOpen
            ? 'bg-card text-foreground border-primary/50 shadow-2xs font-semibold'
            : 'bg-card/50 hover:bg-card border-border/60 hover:border-border text-muted-foreground hover:text-foreground'
        }`}
        title="Clique para ver IPs da máquina (LAN/WSL) e uso de CPU/RAM"
      >
        <Activity className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="hidden xl:inline text-xs font-medium">Status</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
      </button>

      {isOpen && (
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
            <span className="text-2xs font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
              Online
            </span>
          </div>

          {/* Seção de Endereços IP */}
          <div className="space-y-1.5">
            <div className="text-2xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
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
                <div className="text-2xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
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
              onOpenHelp();
              setIsOpen(false);
            }}
            className="w-full py-2 px-2.5 rounded-lg bg-card hover:bg-muted border border-border/60 hover:border-primary/40 text-xs font-semibold text-primary flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <span>Central de Diagnósticos & Ajuda</span>
            <ChevronDown className="w-3 h-3 -rotate-90" />
          </button>
        </div>
      )}
    </div>
  );
};
