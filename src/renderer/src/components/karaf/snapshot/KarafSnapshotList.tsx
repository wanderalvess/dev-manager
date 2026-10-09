import React from 'react';
import { Camera, Trash2 } from 'lucide-react';
import type { BundleSnapshot } from '../../../../../shared/types';

interface KarafSnapshotListProps {
  snapshots: BundleSnapshot[];
  selectedSnapshot: BundleSnapshot | null;
  onSelect: (snapshot: BundleSnapshot) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

/** Coluna de snapshots salvos. */
export const KarafSnapshotList: React.FC<KarafSnapshotListProps> = ({
  snapshots,
  selectedSnapshot,
  onSelect,
  onDelete
}) => (
  <div className="w-72 border-r border-border bg-card/40 flex flex-col shrink-0 overflow-y-auto p-2.5 space-y-1.5">
    <div className="text-2xs font-bold text-muted-foreground uppercase tracking-wider px-1">
      Snapshots Salvos ({snapshots.length})
    </div>
    {snapshots.length === 0 ? (
      <div className="text-center py-10 px-3 text-xs text-muted-foreground">
        <Camera className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p>Nenhum snapshot criado.</p>
        <p className="text-2xs mt-1 text-muted-foreground/70">
          Clique no botão acima para salvar a foto atual dos bundles.
        </p>
      </div>
    ) : (
      snapshots.map((snap) => {
        const isSelected = selectedSnapshot?.id === snap.id;
        return (
          <div
            key={snap.id}
            onClick={() => onSelect(snap)}
            className={`p-2.5 rounded-xl border cursor-pointer transition flex items-start justify-between group ${
              isSelected
                ? 'border-purple-500/50 bg-purple-500/10'
                : 'border-border/60 hover:bg-muted/50'
            }`}
          >
            <div className="space-y-0.5 min-w-0 pr-2">
              <div className={`text-xs font-bold truncate ${isSelected ? 'text-purple-400' : 'text-foreground'}`}>
                {snap.label}
              </div>
              <div className="text-2xs text-muted-foreground">
                {snap.createdAt} · {snap.bundleCount} bundles
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => onDelete(snap.id, e)}
              className="text-muted-foreground/50 hover:text-rose-400 opacity-0 group-hover:opacity-100 p-1 rounded transition"
              title="Excluir snapshot" aria-label="Excluir snapshot"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })
    )}
  </div>
);
