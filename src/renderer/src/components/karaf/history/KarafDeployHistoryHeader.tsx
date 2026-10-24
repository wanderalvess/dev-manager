import React from 'react';
import { History, X, RotateCw } from 'lucide-react';

interface KarafDeployHistoryHeaderProps {
  isLoading: boolean;
  onReload: () => void;
  onClose: () => void;
}

export const KarafDeployHistoryHeader: React.FC<KarafDeployHistoryHeaderProps> = ({
  isLoading,
  onReload,
  onClose
}) => (
  <div className="p-4 border-b border-border/80 bg-card/60 flex items-center justify-between shrink-0">
    <div className="flex items-center space-x-3">
      <div className="p-2.5 rounded-xl bg-info/10 text-info shadow-xs shadow-info/10">
        <History className="w-5 h-5" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-foreground tracking-tight">Histórico & Telemetria de Deploys</h3>
          <span className="text-xs px-2 py-0.5 rounded-md bg-info/10 text-info font-semibold">
            OSGi Audit Rail
          </span>
        </div>
        <p className="text-2xs text-muted-foreground mt-0.5">
          Auditoria de compilações Maven, hot-deploys e ativações em tempo real (UI & MCP Agent).
        </p>
      </div>
    </div>

    <div className="flex items-center space-x-2">
      <button
        type="button"
        onClick={onReload}
        disabled={isLoading}
        className="p-2 bg-muted/80 hover:bg-muted border border-border/80 rounded-xl text-muted-foreground hover:text-foreground transition disabled:opacity-50 cursor-pointer"
        title="Recarregar histórico de deploys" aria-label="Recarregar histórico de deploys"
      >
        <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-info' : ''}`} />
      </button>
      <button
        type="button"
        onClick={onClose}
        className="p-2 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition cursor-pointer"
        title="Fechar histórico" aria-label="Fechar histórico"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  </div>
);
