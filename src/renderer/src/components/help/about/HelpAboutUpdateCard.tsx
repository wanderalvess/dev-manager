import React from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { SystemAppInfo, UpdateStatus } from '../../../../../shared/types';

interface HelpAboutUpdateCardProps {
  appInfo: SystemAppInfo | null;
  updateStatus: UpdateStatus | null;
  handleCheckForUpdates: () => void;
}

/** Versão do app + ações de atualização (só aparece quando o preload expõe onUpdateStatus). */
export const HelpAboutUpdateCard: React.FC<HelpAboutUpdateCardProps> = ({
  appInfo,
  updateStatus,
  handleCheckForUpdates
}) => (
  <div className="p-3.5 rounded-xl bg-card/60 border border-border space-y-1.5 shadow-xs">
    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
      Versão do Aplicativo:
    </span>
    <div className="flex items-center justify-between gap-2">
      <span className="font-mono text-foreground text-[11px]">
        v{appInfo?.appVersion || '...'}
        {updateStatus?.status === 'available' && (
          <span className="ml-1.5 text-emerald-500 font-bold">→ v{updateStatus.version}</span>
        )}
      </span>
      {updateStatus?.status === 'downloaded' ? (
        <button
          onClick={() => window.electronAPI?.installUpdate?.()}
          className="flex items-center gap-1 px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
        >
          <Download className="w-3 h-3" /> Instalar e Reiniciar
        </button>
      ) : updateStatus?.status === 'available' ? (
        <button
          onClick={() => window.electronAPI?.downloadUpdate?.()}
          className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded-lg text-[10px] font-bold transition cursor-pointer"
        >
          <Download className="w-3 h-3" /> Baixar
        </button>
      ) : (
        <button
          onClick={handleCheckForUpdates}
          disabled={updateStatus?.status === 'checking' || updateStatus?.status === 'downloading'}
          className="flex items-center gap-1 px-2.5 py-1 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-[10px] font-bold transition disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 ${updateStatus?.status === 'checking' ? 'animate-spin' : ''}`} />
          Verificar
        </button>
      )}
    </div>
    {updateStatus?.status === 'downloading' && (
      <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${Math.round(updateStatus.percent)}%` }}
        />
      </div>
    )}
    {updateStatus?.status === 'not-available' && (
      <p className="text-[10px] text-muted-foreground">Você já está na versão mais recente.</p>
    )}
    {updateStatus?.status === 'error' && (
      <p className="text-[10px] text-rose-500 truncate" title={updateStatus.message}>
        Falha ao verificar: {updateStatus.message}
      </p>
    )}
  </div>
);
