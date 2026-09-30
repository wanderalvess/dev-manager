import React, { useState, useMemo } from 'react';
import {
  Camera,
  X,
  Trash2,
  GitCompare,
  RotateCw,
  ArrowRight,
  Play,
  UploadCloud,
  CheckCircle2
} from 'lucide-react';
import { BundleSnapshot, BundleSnapshotDiff, KarafBundleInfo } from '../../../../../shared/types';
import { computeSnapshotDiff } from '../../../utils/karafBundleUtils';

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
  const [newSnapshotLabel, setNewSnapshotLabel] = useState('');
  const [selectedSnapshot, setSelectedSnapshot] = useState<BundleSnapshot | null>(null);

  const handleCreateSnapshot = () => {
    if (bundles.length === 0) return;
    const snap: BundleSnapshot = {
      id: `snap_${Date.now()}`,
      label: newSnapshotLabel.trim() || `Snapshot #${snapshots.length + 1} (${new Date().toLocaleTimeString('pt-BR')})`,
      createdAt: new Date().toLocaleString('pt-BR'),
      bundleCount: bundles.length,
      bundles: bundles.map((b) => ({
        id: b.id,
        name: b.name,
        version: b.version,
        state: b.state,
        symbolicName: b.symbolicName,
        location: b.location
      }))
    };
    const updated = [snap, ...snapshots];
    onSnapshotsChange(updated);
    try {
      localStorage.setItem('devManager:bundleSnapshots', JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
    setNewSnapshotLabel('');
    setSelectedSnapshot(snap);
  };

  const handleDeleteSnapshot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = snapshots.filter((s) => s.id !== id);
    onSnapshotsChange(updated);
    if (selectedSnapshot?.id === id) setSelectedSnapshot(null);
    try {
      localStorage.setItem('devManager:bundleSnapshots', JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  };

  const snapshotDiff = useMemo<BundleSnapshotDiff | null>(
    () => computeSnapshotDiff(bundles, selectedSnapshot),
    [selectedSnapshot, bundles]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-6xl xl:max-w-7xl h-[88vh] flex flex-col overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">Snapshots & Comparativo de Estado (Diff)</h4>
              <p className="text-[11px] text-muted-foreground">
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
            className="flex-1 bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
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
          {/* Coluna de snapshots salvos */}
          <div className="w-72 border-r border-border bg-card/40 flex flex-col shrink-0 overflow-y-auto p-2.5 space-y-1.5">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">
              Snapshots Salvos ({snapshots.length})
            </div>
            {snapshots.length === 0 ? (
              <div className="text-center py-10 px-3 text-xs text-muted-foreground">
                <Camera className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p>Nenhum snapshot criado.</p>
                <p className="text-[11px] mt-1 text-muted-foreground/70">
                  Clique no botão acima para salvar a foto atual dos bundles.
                </p>
              </div>
            ) : (
              snapshots.map((snap) => {
                const isSelected = selectedSnapshot?.id === snap.id;
                return (
                  <div
                    key={snap.id}
                    onClick={() => setSelectedSnapshot(snap)}
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
                      <div className="text-[10px] text-muted-foreground">
                        {snap.createdAt} · {snap.bundleCount} bundles
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSnapshot(snap.id, e)}
                      className="text-muted-foreground/50 hover:text-rose-400 opacity-0 group-hover:opacity-100 p-1 rounded transition"
                      title="Excluir snapshot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Coluna de comparação Diff */}
          <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-4">
            {!selectedSnapshot ? (
              <div className="h-full flex flex-col items-center justify-center text-xs text-muted-foreground space-y-2">
                <GitCompare className="w-10 h-10 text-muted-foreground/30" />
                <p>Selecione um snapshot à esquerda para comparar com o estado em execução no Karaf.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div>
                    <span className="text-xs font-bold text-foreground">Comparando com: </span>
                    <span className="text-xs font-mono text-purple-400 font-bold">{selectedSnapshot.label}</span>
                    <span className="text-[10px] text-muted-foreground ml-2">({selectedSnapshot.createdAt})</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Snapshot: {selectedSnapshot.bundleCount} | Atual: {bundles.length}
                  </span>
                </div>

                {/* Resumo com badges */}
                <div className="flex flex-wrap gap-2 text-xs font-mono">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                    {snapshotDiff?.unchanged.length || 0} inalterados
                  </span>
                  {(snapshotDiff?.versionChanged.length || 0) > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-bold">
                      {snapshotDiff?.versionChanged.length} versões alteradas
                    </span>
                  )}
                  {(snapshotDiff?.stateChanged.length || 0) > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 font-bold">
                      {snapshotDiff?.stateChanged.length} estados alterados
                    </span>
                  )}
                  {(snapshotDiff?.added.length || 0) > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-bold">
                      +{snapshotDiff?.added.length} novos
                    </span>
                  )}
                  {(snapshotDiff?.removed.length || 0) > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 font-bold">
                      -{snapshotDiff?.removed.length} ausentes
                    </span>
                  )}
                </div>

                {/* Se nenhuma diferença */}
                {snapshotDiff &&
                  snapshotDiff.versionChanged.length === 0 &&
                  snapshotDiff.stateChanged.length === 0 &&
                  snapshotDiff.added.length === 0 &&
                  snapshotDiff.removed.length === 0 && (
                    <div className="p-4 bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-center text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                      <CheckCircle2 className="w-6 h-6 mx-auto mb-1.5 text-emerald-600 dark:text-emerald-400" />
                      Todos os bundles estão idênticos ao snapshot em versão e estado!
                    </div>
                  )}

                {/* Versões alteradas */}
                {snapshotDiff && snapshotDiff.versionChanged.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <RotateCw className="w-3.5 h-3.5" />
                      Versões Atualizadas ({snapshotDiff.versionChanged.length})
                    </div>
                    <div className="space-y-1.5">
                      {snapshotDiff.versionChanged.map(({ snapshot, current }) => (
                        <div
                          key={current.id}
                          className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-mono font-bold text-foreground">[{current.id}] </span>
                            <span className="text-foreground font-medium">{current.name}</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[11px]">
                            <span className="text-muted-foreground line-through">{snapshot.version}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span className="text-amber-700 dark:text-amber-400 font-bold">{current.version}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Estados alterados */}
                {snapshotDiff && snapshotDiff.stateChanged.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5" />
                      Estados Alterados ({snapshotDiff.stateChanged.length})
                    </div>
                    <div className="space-y-1.5">
                      {snapshotDiff.stateChanged.map(({ snapshot, current }) => (
                        <div
                          key={current.id}
                          className="p-2.5 rounded-xl border border-blue-500/30 bg-blue-500/5 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-mono font-bold text-foreground">[{current.id}] </span>
                            <span className="text-foreground font-medium">{current.name}</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[11px]">
                            <span className="text-muted-foreground">{snapshot.state}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span className="text-blue-700 dark:text-blue-400 font-bold">{current.state}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Novos bundles adicionados */}
                {snapshotDiff && snapshotDiff.added.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <UploadCloud className="w-3.5 h-3.5" />
                      Novos Bundles Instalados (+{snapshotDiff.added.length})
                    </div>
                    <div className="space-y-1.5">
                      {snapshotDiff.added.map((b) => (
                        <div
                          key={b.id}
                          className="p-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between text-xs"
                        >
                          <div className="truncate pr-2">
                            <span className="font-mono font-bold text-foreground">[{b.id}] </span>
                            <span className="text-foreground">{b.name}</span>
                          </div>
                          <div className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400 font-bold shrink-0">
                            v{b.version} · {b.state}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bundles removidos */}
                {snapshotDiff && snapshotDiff.removed.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5" />
                      Bundles Removidos / Ausentes (-{snapshotDiff.removed.length})
                    </div>
                    <div className="space-y-1.5">
                      {snapshotDiff.removed.map((b) => (
                        <div
                          key={b.id}
                          className="p-2 rounded-xl border border-rose-500/30 bg-rose-500/5 flex items-center justify-between text-xs"
                        >
                          <div className="truncate pr-2">
                            <span className="font-mono font-bold text-foreground">[{b.id}] </span>
                            <span className="text-muted-foreground line-through">{b.name}</span>
                          </div>
                          <div className="font-mono text-[10px] text-rose-700 dark:text-rose-400 font-bold shrink-0">
                            v{b.version} (era {b.state})
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
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
      </div>
    </div>
  );
};
