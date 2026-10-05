import React from 'react';
import { GitFork } from 'lucide-react';
import type { KarafBundleDetails } from '../../../../../shared/types';
import { getDetailsTabClass, type KarafDetailsTab } from '../../../utils/karafDetailsModalUtils';

interface KarafDetailsTabBarProps {
  bundleDetails: KarafBundleDetails | null;
  detailsTab: KarafDetailsTab;
  onChange: (tab: KarafDetailsTab) => void;
}

export const KarafDetailsTabBar: React.FC<KarafDetailsTabBarProps> = ({ bundleDetails, detailsTab, onChange }) => (
  <div className="flex border-b border-border bg-card/60 px-4 gap-2 shrink-0">
    <button type="button" onClick={() => onChange('dependents')} className={getDetailsTabClass('dependents', detailsTab)}>
      Dependentes Wired ({bundleDetails?.dependentBundles.length || 0})
    </button>
    <button type="button" onClick={() => onChange('tree')} className={getDetailsTabClass('tree', detailsTab)}>
      <GitFork className="w-3.5 h-3.5" />
      Árvore Hierárquica
    </button>
    <button type="button" onClick={() => onChange('exports')} className={getDetailsTabClass('exports', detailsTab)}>
      Export-Package ({bundleDetails?.exportedPackages.length || 0})
    </button>
    <button type="button" onClick={() => onChange('imports')} className={getDetailsTabClass('imports', detailsTab)}>
      Import-Package ({bundleDetails?.importedPackages.length || 0})
    </button>
    <button type="button" onClick={() => onChange('headers')} className={getDetailsTabClass('headers', detailsTab)}>
      Headers Manifest
    </button>
    {bundleDetails?.diag && (
      <button type="button" onClick={() => onChange('diag')} className={getDetailsTabClass('diag', detailsTab)}>
        Diagnóstico Diag
      </button>
    )}
  </div>
);
