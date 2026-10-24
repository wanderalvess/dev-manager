import React from 'react';
import { Copy, Check, RefreshCw } from 'lucide-react';
import type { NetworkIpInfo } from '../../../../shared/types';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';

interface NetworkInfoCardProps {
  networkIps: NetworkIpInfo;
  onRefresh: () => void;
}

const COPY_BTN = 'h-7 px-2.5 bg-card hover:bg-muted border border-border rounded-lg text-[13px] font-medium text-foreground transition flex items-center gap-1.5 shrink-0 cursor-pointer';

/** Card de informações de rede (IP local e IP WSL) com cópia rápida. */
export const NetworkInfoCard: React.FC<NetworkInfoCardProps> = ({ networkIps, onRefresh }) => {
  const { copy: copyIp, copiedKey: copiedIp } = useCopyToClipboard();

  return (
    <div className="bg-card border border-border rounded-[14px] shadow-xs">
      <div className="flex items-center justify-between px-5 pt-4">
        <h2 className="text-base font-semibold text-foreground">Rede</h2>
        <button
          type="button"
          onClick={onRefresh}
          title="Atualizar IPs de rede" aria-label="Atualizar IPs de rede"
          className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <ul className="px-5 pb-3 pt-1">
        <li className="flex items-center gap-3 py-2.5">
          <span className="text-[13px] text-muted-foreground flex-1">IP local (Windows)</span>
          <span className="font-mono text-[13px] text-foreground truncate">{networkIps.primaryLocalIp}</span>
          <button type="button" onClick={() => copyIp(networkIps.primaryLocalIp, 'main_lan')} className={COPY_BTN} title="Copiar IP Local">
            {copiedIp === 'main_lan' ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
            <span>{copiedIp === 'main_lan' ? 'Copiado' : 'Copiar'}</span>
          </button>
        </li>

        <li className="flex items-center gap-3 py-2.5 border-t border-border">
          <span className="text-[13px] text-muted-foreground flex-1">IP WSL2 / Linux</span>
          <span className={`text-[13px] truncate ${networkIps.wslIp ? 'font-mono text-foreground' : 'text-muted-foreground'}`}>
            {networkIps.wslIp || 'Não detectado'}
          </span>
          {networkIps.wslIp && (
            <button type="button" onClick={() => copyIp(networkIps.wslIp!, 'main_wsl')} className={COPY_BTN} title="Copiar IP WSL">
              {copiedIp === 'main_wsl' ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
              <span>{copiedIp === 'main_wsl' ? 'Copiado' : 'Copiar'}</span>
            </button>
          )}
        </li>
      </ul>
    </div>
  );
};
