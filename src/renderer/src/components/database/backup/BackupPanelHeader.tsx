import React from 'react';
import { HardDriveDownload } from 'lucide-react';
import type { DatabaseConnectionConfig, DatabaseType } from '../../../../../shared/types';
import { getDefaultDbPort } from '../../../utils/backupModalUtils';

const getDbBadge = (type: DatabaseType) => {
  switch (type) {
    case 'oracle':
      return <span className="text-2xs px-1.5 py-0.5 rounded font-mono font-bold bg-danger/10 text-danger">ORACLE</span>;
    case 'mysql':
      return <span className="text-2xs px-1.5 py-0.5 rounded font-mono font-bold bg-warning/10 text-warning">MYSQL</span>;
    case 'postgres':
      return <span className="text-2xs px-1.5 py-0.5 rounded font-mono font-bold bg-info/10 text-info">POSTGRES</span>;
  }
};

interface BackupPanelHeaderProps {
  activeConnection: DatabaseConnectionConfig;
}

export const BackupPanelHeader: React.FC<BackupPanelHeaderProps> = ({ activeConnection }) => (
  <div className="px-6 xl:px-8 py-4 border-b border-border flex items-center shrink-0">
    <div className="flex items-center gap-3.5 min-w-0">
      <div className="w-10 h-10 rounded-[11px] bg-muted text-muted-foreground flex items-center justify-center shrink-0">
        <HardDriveDownload className="w-5 h-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground tracking-tight">
            Backup & Restauração
          </h3>
          <span
            className="text-[13px] font-medium px-2.5 py-0.5 rounded-full bg-muted text-foreground truncate max-w-full"
            title={activeConnection.name}
          >
            {activeConnection.name}
          </span>
          {getDbBadge(activeConnection.type)}
        </div>
        <p className="text-[13px] text-muted-foreground font-mono mt-0.5 flex items-center gap-1.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-success inline-block shrink-0" aria-hidden="true" />
          <span className="truncate" title={`${activeConnection.user}@${activeConnection.host}/${activeConnection.database}`}>
            {activeConnection.user}@{activeConnection.host}:{activeConnection.port || getDefaultDbPort(activeConnection.type)}
            <span className="text-border"> / </span>
            <span className="text-foreground/80 font-semibold">{activeConnection.database}</span>
          </span>
        </p>
      </div>
    </div>
  </div>
);
