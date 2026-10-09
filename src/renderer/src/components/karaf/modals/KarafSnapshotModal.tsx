import React from 'react';
import { Camera, X } from 'lucide-react';
import { BundleSnapshot, KarafBundleInfo } from '../../../../../shared/types';
import { useKarafSnapshotModal } from '../../../hooks/karaf/useKarafSnapshotModal';
import { KarafSnapshotList } from '../snapshot/KarafSnapshotList';
import { KarafSnapshotDiffPanel } from '../snapshot/KarafSnapshotDiffPanel';
import { Modal } from '../../ui/Modal';

interface KarafSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  bundles: KarafBundleInfo[];
  snapshots: BundleSnapshot[];
  onSnapshotsChange: (snapshots: BundleSnapshot[]) => void;
}

export const KarafSnapshotModal: React.FC<KarafSnapshotModalProps> = ({
  isOpen,
  onClose,
  bundles,
  snapshots,
  onSnapshotsChange
}) => {
  const {
    newSnapshotLabel,
    setNewSnapshotLabel,
    selectedSnapshot,
    setSelectedSnapshot,
    snapshotDiff,
    handleCreateSnapshot,
    handleDeleteSnapshot
  } = useKarafSnapshotModal({ bundles, snapshots, onSnapshotsChange });

  if (!isOpen) return null;

  return (
    <Modal
      open
      onClose={onClose}
      bare
      panelClassName="bg-card border border-border rounded-xl shadow-2xl w-full max-w-6xl xl:max-w-7xl h-[88vh] flex flex-col overflow-hidden animate-fade-in"
      closeOnBackdrop={false}
      closeOnEscape={false}
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">Snapshots & Comparativo de Estado (Diff)</h4>
            <p className="text-2xs text-muted-foreground">
              Grave fotos do estado dos bundles e visualize mudanças de versão, novos componentes ou alterações de estado pós-deploy.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Toolbar de criação */}
      <div className="p-3 border-b border-border bg-card/60 flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={newSnapshotLabel}
          onChange={(e) => setNewSnapshotLabel(e.target.value)}
          placeholder="Rótulo do snapshot (ex: Pré-deploy v1.4.2)..."
          className="flex-1 bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-hidden focus:border-primary"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreateSnapshot();
          }}
        />
        <button
          type="button"
          onClick={handleCreateSnapshot}
          disabled={bundles.length === 0}
          className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50 flex items-center gap-1.5 transition cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Salvar Snapshot Agora ({bundles.length})</span>
        </button>
      </div>

      {/* Conteúdo: Lista à esquerda + Comparativo à direita */}
      <div className="flex-1 flex overflow-hidden">
        <KarafSnapshotList
          snapshots={snapshots}
          selectedSnapshot={selectedSnapshot}
          onSelect={setSelectedSnapshot}
          onDelete={handleDeleteSnapshot}
        />
        <KarafSnapshotDiffPanel
          selectedSnapshot={selectedSnapshot}
          snapshotDiff={snapshotDiff}
          currentCount={bundles.length}
        />
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border bg-muted/20 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 text-xs font-semibold text-foreground bg-muted hover:bg-muted/80 rounded-xl transition cursor-pointer"
        >
          Fechar
        </button>
      </div>
    </Modal>
  );
};
