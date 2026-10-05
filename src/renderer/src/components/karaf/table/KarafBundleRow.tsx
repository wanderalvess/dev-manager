import React from 'react';
import type { KarafBundleInfo } from '../../../../../shared/types';
import { getBundleRowClass } from '../../../utils/karafBundleTableView';
import { KarafBundleNameCell, KarafBundleStateCell } from './KarafBundleRowCells';
import { KarafBundleRowActions } from './KarafBundleRowActions';

interface KarafBundleRowProps {
  bundle: KarafBundleInfo;
  isSelected: boolean;
  isWorkspace: boolean;
  isRowLoading: boolean;
  isRebuilding: boolean;
  onToggleSelectBundle: (id: string) => void;
  onOpenInlineDiag: (bundle: KarafBundleInfo) => void;
  onOneClickRebuild: (bundle: KarafBundleInfo) => void;
  onBasicAction: (action: 'start' | 'stop' | 'restart' | 'refresh' | 'resolve', bundleId: string) => void;
  onOpenReinstall: (bundle: KarafBundleInfo) => void;
  onOpenInstall: (bundle: KarafBundleInfo) => void;
  onOpenDetails: (bundle: KarafBundleInfo) => void;
  onOpenUninstall: (bundle: KarafBundleInfo) => void;
}

export const KarafBundleRow: React.FC<KarafBundleRowProps> = ({
  bundle,
  isSelected,
  isWorkspace,
  isRowLoading,
  isRebuilding,
  onToggleSelectBundle,
  onOpenInlineDiag,
  ...actions
}) => (
  <tr className={getBundleRowClass(isSelected)}>
    <td className="px-4 py-3 border-b border-border/40">
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onToggleSelectBundle(bundle.id)}
        className="rounded border-border text-primary focus:ring-primary cursor-pointer w-4 h-4"
      />
    </td>
    <td className="px-4 py-3 border-b border-border/40 text-primary font-bold text-sm tabular-nums">{bundle.id}</td>
    <KarafBundleStateCell bundle={bundle} onOpenInlineDiag={onOpenInlineDiag} />
    <KarafBundleNameCell bundle={bundle} isWorkspace={isWorkspace} />
    <td className="px-4 py-3 border-b border-border/40 text-muted-foreground font-mono text-xs tabular-nums font-semibold">{bundle.version || '-'}</td>
    <KarafBundleRowActions
      bundle={bundle}
      isWorkspace={isWorkspace}
      isRowLoading={isRowLoading}
      isRebuilding={isRebuilding}
      {...actions}
    />
  </tr>
);
