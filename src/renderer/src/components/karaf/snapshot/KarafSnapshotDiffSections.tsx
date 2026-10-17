import React from 'react';
import { ArrowRight, Play, RotateCw, Trash2, UploadCloud } from 'lucide-react';
import type { BundleSnapshotDiff } from '../../../../../shared/types';

interface KarafSnapshotDiffSectionsProps {
  diff: BundleSnapshotDiff;
}

/** Listas detalhadas do diff: versões, estados, novos e ausentes. */
export const KarafSnapshotDiffSections: React.FC<KarafSnapshotDiffSectionsProps> = ({ diff: snapshotDiff }) => (
  <>
    {/* Versões alteradas */}
    {snapshotDiff.versionChanged.length > 0 && (
      <div className="space-y-2">
        <div className="text-xs font-bold text-warning flex items-center gap-1.5">
          <RotateCw className="w-3.5 h-3.5" />
          Versões Atualizadas ({snapshotDiff.versionChanged.length})
        </div>
        <div className="space-y-1.5">
          {snapshotDiff.versionChanged.map(({ snapshot, current }) => (
            <div
              key={current.id}
              className="p-2.5 rounded-xl border border-warning/30 bg-warning/5 flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-mono font-bold text-foreground">[{current.id}] </span>
                <span className="text-foreground font-medium">{current.name}</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-2xs">
                <span className="text-muted-foreground line-through">{snapshot.version}</span>
                <ArrowRight className="w-3.5 h-3.5 text-warning" />
                <span className="text-warning font-bold">{current.version}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Estados alterados */}
    {snapshotDiff.stateChanged.length > 0 && (
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
              <div className="flex items-center gap-2 font-mono text-2xs">
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
    {snapshotDiff.added.length > 0 && (
      <div className="space-y-2">
        <div className="text-xs font-bold text-success flex items-center gap-1.5">
          <UploadCloud className="w-3.5 h-3.5" />
          Novos Bundles Instalados (+{snapshotDiff.added.length})
        </div>
        <div className="space-y-1.5">
          {snapshotDiff.added.map((b) => (
            <div
              key={b.id}
              className="p-2 rounded-xl border border-success/30 bg-success/5 flex items-center justify-between text-xs"
            >
              <div className="truncate pr-2">
                <span className="font-mono font-bold text-foreground">[{b.id}] </span>
                <span className="text-foreground">{b.name}</span>
              </div>
              <div className="font-mono text-2xs text-success font-bold shrink-0">
                v{b.version} · {b.state}
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Bundles removidos */}
    {snapshotDiff.removed.length > 0 && (
      <div className="space-y-2">
        <div className="text-xs font-bold text-danger flex items-center gap-1.5">
          <Trash2 className="w-3.5 h-3.5" />
          Bundles Removidos / Ausentes (-{snapshotDiff.removed.length})
        </div>
        <div className="space-y-1.5">
          {snapshotDiff.removed.map((b) => (
            <div
              key={b.id}
              className="p-2 rounded-xl border border-danger/30 bg-danger/5 flex items-center justify-between text-xs"
            >
              <div className="truncate pr-2">
                <span className="font-mono font-bold text-foreground">[{b.id}] </span>
                <span className="text-muted-foreground line-through">{b.name}</span>
              </div>
              <div className="font-mono text-2xs text-danger font-bold shrink-0">
                v{b.version} (era {b.state})
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </>
);
