import React from 'react';
import { X, DownloadCloud } from 'lucide-react';
import { DEFAULT_CCW_APP_PATH } from '../../utils/ccwModalUtils';

interface CcwModalHeaderProps {
  appPath: string;
  onClose: () => void;
}

export const CcwModalHeader: React.FC<CcwModalHeaderProps> = ({ appPath, onClose }) => (
  <div className="flex items-center justify-between px-4 py-3 border-b border-border/80 bg-card/80 backdrop-blur-xs">
    <div className="flex items-center gap-2.5">
      <DownloadCloud className="w-4 h-4 text-primary shrink-0" />
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-foreground tracking-tight">
            Central de Controle WinThor
          </h3>
          <span className="text-2xs font-mono font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30 uppercase tracking-wider">
            CCW
          </span>
        </div>
        <p className="text-2xs text-muted-foreground font-mono mt-0.5 flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Destino:</span>
          <span className="text-foreground font-semibold font-mono">{appPath || DEFAULT_CCW_APP_PATH}</span>
        </p>
      </div>
    </div>
    <button
      type="button"
      onClick={onClose}
      className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
      title="Fechar"
    >
      <X className="w-4 h-4" />
    </button>
  </div>
);
