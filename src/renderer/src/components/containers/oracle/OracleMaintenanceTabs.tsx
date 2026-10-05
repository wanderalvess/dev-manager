import React from 'react';
import { Activity, Terminal, FileText, Network } from 'lucide-react';
import type { OracleMaintenanceTab } from '../../../utils/oracleMaintenanceUtils';

interface OracleMaintenanceTabsProps {
  activeTab: OracleMaintenanceTab;
  onSelectTab: (tab: OracleMaintenanceTab) => void;
  onRefreshDumps: () => void;
}

const tabClass = (active: boolean) =>
  `px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition cursor-pointer ${
    active
      ? 'border-primary text-primary bg-card shadow-2xs'
      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
  }`;

export const OracleMaintenanceTabs: React.FC<OracleMaintenanceTabsProps> = ({
  activeTab,
  onSelectTab,
  onRefreshDumps
}) => (
  <div className="flex border-b border-border/70 px-5 gap-1 bg-muted/25 pt-2">
    <button onClick={() => onSelectTab('health')} className={tabClass(activeTab === 'health')}>
      <Activity className="w-3.5 h-3.5" />
      <span>Saúde & Cura (db_health)</span>
    </button>

    <button onClick={() => onSelectTab('sqlplus')} className={tabClass(activeTab === 'sqlplus')}>
      <Terminal className="w-3.5 h-3.5" />
      <span>SQL*Plus Assistido</span>
    </button>

    <button
      onClick={() => {
        onSelectTab('datapump');
        onRefreshDumps();
      }}
      className={tabClass(activeTab === 'datapump')}
    >
      <FileText className="w-3.5 h-3.5" />
      <span>Importar Dump (Data Pump)</span>
    </button>

    <button onClick={() => onSelectTab('tns')} className={tabClass(activeTab === 'tns')}>
      <Network className="w-3.5 h-3.5" />
      <span>Conexão TNS (tnsnames.ora)</span>
    </button>
  </div>
);
