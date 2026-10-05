import React from 'react';
import type { KarafBundleInfo } from '../../../../../shared/types';
import { getBundleStateBadgeClass, getBundleStateDotClass } from '../../../utils/karafUninstallModalUtils';

interface KarafUninstallBundleInfoProps {
  target: KarafBundleInfo;
}

export const KarafUninstallBundleInfo: React.FC<KarafUninstallBundleInfoProps> = ({ target }) => (
  <div className="p-3 bg-muted/30 border border-border rounded-xl flex items-center justify-between">
    <div>
      <div className="text-xs font-bold text-foreground">{target.name}</div>
      <div className="text-2xs text-muted-foreground font-mono">
        ID: {target.id} · Versão: {target.version}
      </div>
    </div>
    <span
      className={`px-2.5 py-1 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 font-mono ${getBundleStateBadgeClass(target.state)}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${getBundleStateDotClass(target.state)}`} />
      {target.state}
    </span>
  </div>
);
