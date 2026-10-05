import React from 'react';
import { Archive, RotateCw } from 'lucide-react';
import type { WslSnapshotFileInfo } from '../../../../../shared/types';

interface WslSnapshotsListProps {
  snapshotsList: WslSnapshotFileInfo[];
  isLoadingSnapshots: boolean;
  selectedTarPath: string;
  onSelect: (snapshot: WslSnapshotFileInfo) => void;
}

export const WslSnapshotsList: React.FC<WslSnapshotsListProps> = ({
  snapshotsList,
  isLoadingSnapshots,
  selectedTarPath,
  onSelect
}) => (
  <div className="space-y-2.5">
    <div className="flex items-center justify-between px-1">
      <span className="text-xs font-bold text-foreground">
        Snapshots .tar Disponíveis ({snapshotsList.length})
      </span>
      <span className="text-2xs text-muted-foreground">
        Arquivos .tar encontrados nos diretórios do sistema
      </span>
    </div>

    {isLoadingSnapshots ? (
      <div className="p-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <RotateCw className="w-4 h-4 animate-spin text-primary" />
        <span>Buscando arquivos de snapshot...</span>
      </div>
    ) : snapshotsList.length === 0 ? (
      <div className="p-4 bg-muted/20 border border-dashed border-border/80 rounded-xl text-center text-xs text-muted-foreground">
        Nenhum arquivo .tar encontrado nos diretórios configurados.
      </div>
    ) : (
      <div className="space-y-2">
        {snapshotsList.map((snap) => (
          <div
            key={snap.path}
            className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition ${
              selectedTarPath === snap.path
                ? 'bg-primary/10 border-primary/40'
                : 'bg-card border-border/80 hover:border-border'
            }`}
          >
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-center gap-2">
                <Archive className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="font-bold text-xs font-mono text-foreground truncate" title={snap.name}>
                  {snap.name}
                </span>
                <span className="text-2xs font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground shrink-0">
                  {snap.formattedSize}
                </span>
              </div>
              <div className="text-2xs text-muted-foreground font-mono truncate" title={snap.path}>
                {snap.path}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelect(snap)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition cursor-pointer shrink-0 ${
                selectedTarPath === snap.path
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card hover:bg-muted text-foreground border-border/80'
              }`}
            >
              {selectedTarPath === snap.path ? 'Selecionado' : 'Selecionar'}
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
);
