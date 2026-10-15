import React from 'react';
import { HardDriveDownload, X } from 'lucide-react';
import type { DatabaseConnectionConfig, DatabaseType } from '../../../../../shared/types';
import { getDefaultDbPort } from '../../../utils/backupModalUtils';

const getDbBadge = (type: DatabaseType) => {
  switch (type) {
    case 'oracle':
      return <span className="text-2xs px-1.5 py-0.5 rounded font-mono font-bold bg-danger/10 text-danger border border-danger/30">ORACLE</span>;
    case 'mysql':
      return <span className="text-2xs px-1.5 py-0.5 rounded font-mono font-bold bg-warning/10 text-warning border border-warning/30">MYSQL</span>;
    case 'postgres':
      return <span className="text-2xs px-1.5 py-0.5 rounded font-mono font-bold bg-info/10 text-info border border-info/30">POSTGRES</span>;
  }
};

interface BackupModalHeaderProps {
  activeConnection: DatabaseConnectionConfig;
  onClose: () => void;
}

export const BackupModalHeader: React.FC<BackupModalHeaderProps> = ({ activeConnection, onClose }) => (
  <div className="px-6 py-4 border-b border-border/80 flex items-center justify-between bg-muted/40 shrink-0">
    <div className="flex items-center space-x-3.5">
      <div className="w-10 h-10 rounded-xl bg-info/10 text-info border border-info/20 flex items-center justify-center shadow-2xs shrink-0">
        <HardDriveDownload className="w-5 h-5" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-foreground tracking-tight">
            Backup & Restauração
          </h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-muted border border-border text-foreground">
            {activeConnection.name}
          </span>
          {getDbBadge(activeConnection.type)}
        </div>
        <p className="text-2xs text-muted-foreground font-mono mt-0.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
          <span>{activeConnection.user}@{activeConnection.host}:{activeConnection.port || getDefaultDbPort(activeConnection.type)}</span>
          <span className="text-border">/</span>
          <span className="text-foreground/80 font-semibold">{activeConnection.database}</span>
        </p>
      </div>
    </div>
    <button
      type="button"
      onClick={onClose}
      className="text-muted-foreground hover:text-foreground p-2 rounded-xl hover:bg-muted/80 transition-colors cursor-pointer"
      title="Fechar" aria-label="Fechar"
    >
      <X className="w-4 h-4" />
    </button>
  </div>
);
