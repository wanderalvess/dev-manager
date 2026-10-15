import React from 'react';
import { Database, X } from 'lucide-react';

interface OracleMaintenanceHeaderProps {
  containerName: string;
  onClose: () => void;
}

export const OracleMaintenanceHeader: React.FC<OracleMaintenanceHeaderProps> = ({ containerName, onClose }) => (
  <div className="px-5 py-4 border-b border-border/80 flex items-center justify-between bg-card/60">
    <div className="flex items-center space-x-3">
      <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-500 shadow-2xs">
        <Database className="w-5 h-5" />
      </div>
      <div>
        <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
          Manutenção Oracle WinThor
          <span className="text-2xs font-mono font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
            {containerName}
          </span>
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Utilitários integrados de <code className="text-2xs">INFR-Docker</code> (/home/oracle/tools)
        </p>
      </div>
    </div>

    <button
      onClick={onClose}
      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition cursor-pointer"
    >
      <X className="w-4 h-4" />
    </button>
  </div>
);
