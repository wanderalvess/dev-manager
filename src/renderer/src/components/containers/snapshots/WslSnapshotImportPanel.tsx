import React from 'react';
import { Play, RotateCw } from 'lucide-react';
import { canImportSnapshot } from '../../../utils/wslSnapshotsModalUtils';

interface WslSnapshotImportPanelProps {
  name: string;
  installDir: string;
  tarPath: string;
  importing: boolean;
  onNameChange: (value: string) => void;
  onInstallDirChange: (value: string) => void;
  onTarPathChange: (value: string) => void;
  onImport: () => void;
}

const INPUT_CLASS =
  'w-full bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary';

export const WslSnapshotImportPanel: React.FC<WslSnapshotImportPanelProps> = ({
  name,
  installDir,
  tarPath,
  importing,
  onNameChange,
  onInstallDirChange,
  onTarPathChange,
  onImport
}) => (
  <div className="p-4 bg-muted/20 border border-border/80 rounded-xl space-y-3">
    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
      <Play className="w-3.5 h-3.5 text-emerald-500 fill-current" />
      <span>Importar Snapshot Selecionado (wsl --import)</span>
    </h4>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="text-2xs font-semibold text-muted-foreground block mb-1">
          Nome da Distro a Criar
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Ex: ubuntu2604-winthor"
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label className="text-2xs font-semibold text-muted-foreground block mb-1">
          Diretório de Instalação (VHDX)
        </label>
        <input
          type="text"
          value={installDir}
          onChange={(e) => onInstallDirChange(e.target.value)}
          placeholder="Ex: C:\WSL\ubuntu2604-winthor"
          className={INPUT_CLASS}
        />
      </div>
    </div>

    <div>
      <label className="text-2xs font-semibold text-muted-foreground block mb-1">
        Caminho do Arquivo .tar
      </label>
      <input
        type="text"
        value={tarPath}
        onChange={(e) => onTarPathChange(e.target.value)}
        placeholder="Selecione na lista acima ou informe o caminho completo"
        className={INPUT_CLASS}
      />
    </div>

    <div className="pt-1 flex items-center justify-between">
      <span className="text-2xs text-muted-foreground">
        Executa <code className="text-foreground font-mono">wsl --shutdown</code> e em seguida <code className="text-foreground font-mono">wsl --import</code>
      </span>

      <button
        onClick={onImport}
        disabled={importing || !canImportSnapshot(tarPath, name)}
        className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 active:scale-98"
      >
        {importing ? (
          <RotateCw className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Play className="w-3.5 h-3.5 fill-current" />
        )}
        <span>{importing ? 'Importando Snapshot (Aguarde)...' : 'Importar Distro WSL'}</span>
      </button>
    </div>
  </div>
);
