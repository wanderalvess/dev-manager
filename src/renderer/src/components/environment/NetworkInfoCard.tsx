import React from 'react';
import { Wifi, Cpu, Copy, Check, RefreshCw } from 'lucide-react';
import type { NetworkIpInfo } from '../../../../shared/types';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';

interface NetworkInfoCardProps {
  networkIps: NetworkIpInfo;
  onRefresh: () => void;
}

const COPY_BTN = 'p-1.5 px-2 bg-muted hover:bg-muted/80 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground transition flex items-center gap-1 shrink-0 cursor-pointer';

/** Card de informações de rede (IP local e IP WSL) com cópia rápida. */
export const NetworkInfoCard: React.FC<NetworkInfoCardProps> = ({ networkIps, onRefresh }) => {
  const { copy: copyIp, copiedKey: copiedIp } = useCopyToClipboard();

  return (
    <div className="cockpit-panel rounded-2xl p-3 border border-border flex flex-col space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
          <Wifi className="w-3.5 h-3.5 text-primary" />
          <span>Endereços IP e Conectividade de Rede</span>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          title="Atualizar IPs de rede"
          className="p-1 hover:text-foreground text-muted-foreground rounded hover:bg-muted/50 transition cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        {/* IP Local */}
        <div className="p-2.5 bg-card/60 border border-border/70 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-2.5 truncate">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
              <Wifi className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col truncate">
              <span className="text-2xs font-bold text-muted-foreground uppercase">IP Local (Windows)</span>
              <span className="font-mono text-xs font-bold text-foreground truncate">{networkIps.primaryLocalIp}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => copyIp(networkIps.primaryLocalIp, 'main_lan')}
            className={COPY_BTN}
            title="Copiar IP Local"
          >
            {copiedIp === 'main_lan' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span className="text-2xs">{copiedIp === 'main_lan' ? 'Copiado' : 'Copiar'}</span>
          </button>
        </div>

        {/* IP WSL */}
        <div className="p-2.5 bg-card/60 border border-border/70 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-2.5 truncate">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col truncate">
              <span className="text-2xs font-bold text-muted-foreground uppercase">IP WSL2 / Linux</span>
              <span className="font-mono text-xs font-bold text-foreground truncate">
                {networkIps.wslIp || 'Não detectado / inativo'}
              </span>
            </div>
          </div>
          {networkIps.wslIp && (
            <button
              type="button"
              onClick={() => copyIp(networkIps.wslIp!, 'main_wsl')}
              className={COPY_BTN}
              title="Copiar IP WSL"
            >
              {copiedIp === 'main_wsl' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span className="text-2xs">{copiedIp === 'main_wsl' ? 'Copiado' : 'Copiar'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
