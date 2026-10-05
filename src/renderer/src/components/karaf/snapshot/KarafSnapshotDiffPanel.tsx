import React from 'react';
import { CheckCircle2, GitCompare } from 'lucide-react';
import type { BundleSnapshot, BundleSnapshotDiff } from '../../../../../shared/types';
import { isDiffEmpty } from '../../../utils/karafSnapshotModalUtils';
import { KarafSnapshotDiffSections } from './KarafSnapshotDiffSections';

interface KarafSnapshotDiffPanelProps {
  selectedSnapshot: BundleSnapshot | null;
  snapshotDiff: BundleSnapshotDiff | null;
  currentCount: number;
}

/** Coluna de comparação: cabeçalho, badges de resumo e detalhes do diff. */
export const KarafSnapshotDiffPanel: React.FC<KarafSnapshotDiffPanelProps> = ({
  selectedSnapshot,
  snapshotDiff,
  currentCount
}) => (
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
            <span className="text-2xs text-muted-foreground ml-2">({selectedSnapshot.createdAt})</span>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">
            Snapshot: {selectedSnapshot.bundleCount} | Atual: {currentCount}
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
        {isDiffEmpty(snapshotDiff) && (
          <div className="p-4 bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-center text-xs text-emerald-800 dark:text-emerald-300 font-medium">
            <CheckCircle2 className="w-6 h-6 mx-auto mb-1.5 text-emerald-600 dark:text-emerald-400" />
            Todos os bundles estão idênticos ao snapshot em versão e estado!
          </div>
        )}

        {snapshotDiff && <KarafSnapshotDiffSections diff={snapshotDiff} />}
      </>
    )}
  </div>
);
