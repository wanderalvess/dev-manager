import React from 'react';
import type { DockerContainerInfo, WslDumpFileInfo } from '../../../../../shared/types';
import { useOracleMaintenanceModal } from '../../../hooks/containers/useOracleMaintenanceModal';
import { OracleMaintenanceHeader } from '../oracle/OracleMaintenanceHeader';
import { OracleMaintenanceTabs } from '../oracle/OracleMaintenanceTabs';
import { OracleHealthTab } from '../oracle/OracleHealthTab';
import { OracleSqlPlusTab } from '../oracle/OracleSqlPlusTab';
import { OracleDataPumpTab } from '../oracle/OracleDataPumpTab';
import { OracleTnsTab } from '../oracle/OracleTnsTab';

export interface OracleMaintenanceModalProps {
  container: DockerContainerInfo | null;
  availableDumps: WslDumpFileInfo[];
  isLoadingDumps: boolean;
  isOpeningDumpsFolder: boolean;
  onRefreshDumps: () => void;
  onOpenDumpsFolder: () => void;
  onClose: () => void;
  onError?: (msg: string) => void;
}

export const OracleMaintenanceModal: React.FC<OracleMaintenanceModalProps> = ({
  container,
  availableDumps,
  isLoadingDumps,
  isOpeningDumpsFolder,
  onRefreshDumps,
  onOpenDumpsFolder,
  onClose,
  onError
}) => {
  const state = useOracleMaintenanceModal({ container, availableDumps, onError });

  if (!container) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl h-[84vh] flex flex-col overflow-hidden animate-fade-in">
        <OracleMaintenanceHeader containerName={state.containerName} onClose={onClose} />

        <OracleMaintenanceTabs
          activeTab={state.activeTab}
          onSelectTab={state.setActiveTab}
          onRefreshDumps={onRefreshDumps}
        />

        {/* Conteúdo da Aba */}
        <div className="flex-1 overflow-auto p-5 space-y-4">
          {state.activeTab === 'health' && (
            <OracleHealthTab health={state.health} copiedKey={state.copiedKey} onCopy={state.copy} />
          )}

          {state.activeTab === 'sqlplus' && <OracleSqlPlusTab sql={state.sql} />}

          {state.activeTab === 'datapump' && (
            <OracleDataPumpTab
              dp={state.dp}
              availableDumps={availableDumps}
              isLoadingDumps={isLoadingDumps}
              isOpeningDumpsFolder={isOpeningDumpsFolder}
              onRefreshDumps={onRefreshDumps}
              onOpenDumpsFolder={onOpenDumpsFolder}
              copiedKey={state.copiedKey}
              onCopy={state.copy}
            />
          )}

          {state.activeTab === 'tns' && (
            <OracleTnsTab ports={container.ports} copiedKey={state.copiedKey} onCopy={state.copy} />
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/80 flex items-center justify-between bg-muted/10">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Comandos executados nativamente via container engine
          </span>

          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-card hover:bg-muted border border-border/80 text-foreground rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
