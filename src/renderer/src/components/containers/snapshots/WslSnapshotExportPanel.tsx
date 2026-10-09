import React from 'react';
import { Archive, Download, RotateCw, Trash2 } from 'lucide-react';
import type { WslDistroInfo } from '../../../../../shared/types';
import { canExportSnapshot } from '../../../utils/wslSnapshotsModalUtils';

interface WslSnapshotExportPanelProps {
  availableDistros: WslDistroInfo[];
  distro: string;
  exportPath: string;
  exporting: boolean;
  unregistering: string | null;
  onDistroChange: (distro: string) => void;
  onExportPathChange: (value: string) => void;
  onExport: () => void;
  onUnregister: (distro: string) => Promise<void> | void;
}

export const WslSnapshotExportPanel: React.FC<WslSnapshotExportPanelProps> = ({
  availableDistros,
  distro,
  exportPath,
  exporting,
  unregistering,
  onDistroChange,
  onExportPathChange,
  onExport,
  onUnregister
}) => (
  <div className="p-4 bg-muted/20 border border-border/80 rounded-xl space-y-3">
    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
      <Archive className="w-3.5 h-3.5 text-amber-500" />
      <span>Exportar Backup ou Desregistrar Distro Existente</span>
    </h4>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="text-2xs font-semibold text-muted-foreground block mb-1">
          Distro de Origem
        </label>
        <select
          value={distro}
          onChange={(e) => onDistroChange(e.target.value)}
          className="w-full bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
        >
          <option value="">Selecione a distro WSL...</option>
          {availableDistros.map((d) => (
            <option key={d.name} value={d.name}>
              {d.name} ({d.state})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-2xs font-semibold text-muted-foreground block mb-1">
          Caminho do .tar de Destino
        </label>
        <input
          type="text"
          value={exportPath}
          onChange={(e) => onExportPathChange(e.target.value)}
          placeholder="Ex: C:\WSL\snapshots\backup.tar"
          className="w-full bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
      </div>
    </div>

    <div className="flex items-center justify-between pt-1">
      {/* Desregistrar */}
      {distro && (
        <button
          onClick={() => onUnregister(distro)}
          disabled={unregistering === distro}
          title="Exclui definitivamente esta distro e seu disco virtual"
          className="flex items-center space-x-1 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{unregistering === distro ? 'Removendo...' : `Desregistrar "${distro}"`}</span>
        </button>
      )}

      {/* Exportar */}
      <button
        onClick={onExport}
        disabled={exporting || !canExportSnapshot(distro, exportPath)}
        className="ml-auto flex items-center space-x-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 active:scale-98"
      >
        {exporting ? (
          <RotateCw className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
        <span>{exporting ? 'Exportando Backup...' : 'Exportar Snapshot (.tar)'}</span>
      </button>
    </div>
  </div>
);
