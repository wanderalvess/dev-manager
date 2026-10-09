import React from 'react';
import { Info } from 'lucide-react';
import type { useKarafInstalledFeatures } from '../../../hooks/karaf/useKarafInstalledFeatures';
import { KarafFeaturesToolbar } from './KarafFeaturesToolbar';
import { KarafFeaturesInstallDrawer } from './KarafFeaturesInstallDrawer';
import { KarafFeaturesTable } from './KarafFeaturesTable';
import { KarafFeaturesLogDrawer } from './KarafFeaturesLogDrawer';
import { KarafFeatureUninstallModal } from './KarafFeatureUninstallModal';

interface KarafFeaturesInstalledTabProps {
  installed: ReturnType<typeof useKarafInstalledFeatures>;
}

/** Aba "Instaladas": tabela de `feature:list -i`, instalação manual por nome e desinstalação com purga (-r). */
export const KarafFeaturesInstalledTab: React.FC<KarafFeaturesInstalledTabProps> = ({ installed: s }) => (
  <>
    <KarafFeaturesToolbar
      searchQuery={s.searchQuery}
      onSearchChange={s.setSearchQuery}
      scopeFilter={s.scopeFilter}
      onScopeFilterChange={s.setScopeFilter}
      isInstallDrawerOpen={s.isInstallDrawerOpen}
      onToggleInstallDrawer={s.toggleInstallDrawer}
      onRefresh={s.fetchFeatures}
      isLoading={s.isLoading}
      totalCount={s.features.length}
      winthorCount={s.winthorCount}
      systemCount={s.systemCount}
      filteredCount={s.filteredFeatures.length}
    />

    <KarafFeaturesInstallDrawer
      isOpen={s.isInstallDrawerOpen}
      onClose={s.closeInstallDrawer}
      onInstall={s.installFeature}
      isInstalling={s.actionInProgress === 'installing'}
    />

    <div className="flex-1 overflow-y-auto">
      <KarafFeaturesTable
        features={s.filteredFeatures}
        isLoading={s.isLoading}
        searchQuery={s.searchQuery}
        actionInProgress={s.actionInProgress}
        onRequestUninstall={s.setUninstallTarget}
      />
    </div>

    <KarafFeaturesLogDrawer logs={s.executionLogs} onClear={s.clearLogs} />

    <div className="px-5 py-2.5 border-t border-border bg-muted/20 text-2xs text-muted-foreground font-mono flex items-center gap-2 shrink-0">
      <Info className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
      <span>
        Desinstalar com <code className="text-rose-700 dark:text-rose-400 font-bold">-r</code> purga a feature e seus bundles associados do container Karaf permanentemente.
      </span>
    </div>

    <KarafFeatureUninstallModal
      feature={s.uninstallTarget}
      onClose={() => s.setUninstallTarget(null)}
      onConfirm={s.confirmUninstall}
      isProcessing={s.actionInProgress === s.uninstallTarget?.name}
    />
  </>
);
