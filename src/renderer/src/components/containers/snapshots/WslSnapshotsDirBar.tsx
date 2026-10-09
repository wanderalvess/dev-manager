import React from 'react';
import { FolderOpen, RefreshCw } from 'lucide-react';

interface WslSnapshotsDirBarProps {
  snapshotsDirInput: string;
  isLoadingSnapshots: boolean;
  onDirChange: (dir: string) => void;
  onLoadSnapshots: () => void;
  onSaveSnapshotsDir: (dir: string) => void;
}

export const WslSnapshotsDirBar: React.FC<WslSnapshotsDirBarProps> = ({
  snapshotsDirInput,
  isLoadingSnapshots,
  onDirChange,
  onLoadSnapshots,
  onSaveSnapshotsDir
}) => (
  <div className="p-3 bg-muted/30 border border-border/80 rounded-xl space-y-2.5">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
        <FolderOpen className="w-3.5 h-3.5 text-primary" />
        <span>Diretório de Snapshots (.tar)</span>
      </span>
      <button
        onClick={onLoadSnapshots}
        disabled={isLoadingSnapshots}
        className="text-2xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
      >
        <RefreshCw className={`w-3 h-3 ${isLoadingSnapshots ? 'animate-spin text-primary' : ''}`} />
        <span>Atualizar Lista</span>
      </button>
    </div>

    <div className="flex items-center gap-2">
      <input
        type="text"
        value={snapshotsDirInput}
        onChange={(e) => onDirChange(e.target.value)}
        placeholder="Ex: C:\Projetos\snapshots ou C:\Docker"
        className="flex-1 bg-background border border-border/80 rounded-lg px-3 py-1.5 text-xs text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
      />
      <button
        onClick={() => onSaveSnapshotsDir(snapshotsDirInput)}
        className="px-3 py-1.5 bg-card hover:bg-muted text-foreground border border-border/80 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-98 shrink-0"
      >
        Salvar Pasta
      </button>
    </div>
  </div>
);
