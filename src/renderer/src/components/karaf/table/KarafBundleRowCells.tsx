import React from 'react';
import { Sparkles } from 'lucide-react';
import type { KarafBundleInfo } from '../../../../../shared/types';
import {
  getBundleStateBadgeClass,
  getBundleStateDotClass,
  shouldShowSymbolicName
} from '../../../utils/karafBundleTableView';

interface KarafBundleStateCellProps {
  bundle: KarafBundleInfo;
  onOpenInlineDiag: (bundle: KarafBundleInfo) => void;
}

export const KarafBundleStateCell: React.FC<KarafBundleStateCellProps> = ({ bundle, onOpenInlineDiag }) => (
  <td className="px-4 py-3 border-b border-border/40">
    <div className="flex items-center gap-1.5">
      <span
        className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border inline-flex items-center gap-1.5 ${getBundleStateBadgeClass(bundle.state)}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${getBundleStateDotClass(bundle.state)}`} />
        {bundle.state}
      </span>
      {bundle.state !== 'Active' && (
        <button
          type="button"
          onClick={() => onOpenInlineDiag(bundle)}
          className="px-1.5 py-0.5 rounded text-2xs font-mono font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
          title="Ver diagnóstico do Karaf para este bundle (bundle:diag)"
        >
          Diag
        </button>
      )}
    </div>
  </td>
);

interface KarafBundleNameCellProps {
  bundle: KarafBundleInfo;
  isWorkspace: boolean;
}

export const KarafBundleNameCell: React.FC<KarafBundleNameCellProps> = ({ bundle, isWorkspace }) => (
  <td className="px-4 py-3 border-b border-border/40 text-foreground font-medium" title={bundle.name}>
    <div className="min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-foreground font-bold text-xs">{bundle.name}</span>
        {isWorkspace && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-2xs font-semibold bg-primary/15 text-primary border border-primary/30">
            <Sparkles className="w-2.5 h-2.5" /> Workspace
          </span>
        )}
      </div>
      {shouldShowSymbolicName(bundle) && (
        <span className="block text-[11px] text-muted-foreground font-mono mt-0.5 truncate max-w-xl">
          {bundle.symbolicName}
        </span>
      )}
    </div>
  </td>
);
