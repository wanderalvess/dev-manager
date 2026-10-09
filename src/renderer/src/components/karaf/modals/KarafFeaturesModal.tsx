import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useKarafFeaturesManager } from '../../../hooks/karaf/useKarafFeaturesManager';
import { useKarafInstalledFeatures } from '../../../hooks/karaf/useKarafInstalledFeatures';
import { countInstalledFeatures } from '../../../utils/karafFeaturesModalUtils';
import { KarafFeaturesManagerHeader } from '../features/KarafFeaturesManagerHeader';
import { KarafFeaturesManagerFeedback } from '../features/KarafFeaturesManagerFeedback';
import { KarafFeaturesManagerFilterBar } from '../features/KarafFeaturesManagerFilterBar';
import { KarafFeaturesManagerAddRepoForm } from '../features/KarafFeaturesManagerAddRepoForm';
import { KarafFeaturesManagerFeatureList } from '../features/KarafFeaturesManagerFeatureList';
import { KarafFeaturesManagerRepoList } from '../features/KarafFeaturesManagerRepoList';
import { KarafFeaturesManagerFooter } from '../features/KarafFeaturesManagerFooter';
import { KarafFeaturesInstalledTab } from '../features/KarafFeaturesInstalledTab';
import { Modal } from '../../ui/Modal';

interface KarafFeaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Chamado depois de instalar/desinstalar uma feature, para a tela de origem recarregar seus bundles */
  onBundlesChanged?: () => Promise<void> | void;
}

const noopChanged = () => {};

/** Features e repositórios Maven do Karaf: abas Instaladas, Catálogo e Repositórios. */
export const KarafFeaturesModal: React.FC<KarafFeaturesModalProps> = ({ isOpen, onClose, onBundlesChanged }) => {
  const m = useKarafFeaturesManager(isOpen);
  const installed = useKarafInstalledFeatures(isOpen && m.activeTab === 'installed', onBundlesChanged ?? noopChanged);

  if (!isOpen) return null;

  const isInstalledTab = m.activeTab === 'installed';

  return (
    <Modal
      open
      onClose={onClose}
      bare
      panelClassName="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
      closeOnBackdrop={false}
      closeOnEscape={!installed.uninstallTarget}
      ariaLabel="Gerenciador de features e repositórios"
    >
      <KarafFeaturesManagerHeader
        activeTab={m.activeTab}
        installedCount={installed.features.length}
        featuresCount={m.features.length}
        reposCount={m.repos.length}
        isLoading={isInstalledTab ? installed.isLoading : m.isLoading}
        onReload={isInstalledTab ? installed.fetchFeatures : m.loadData}
        onClose={onClose}
        onChangeTab={(tab) => {
          m.setActiveTab(tab);
          m.setSearchQuery('');
        }}
      />

      {isInstalledTab ? (
        <KarafFeaturesInstalledTab installed={installed} />
      ) : (
        <>
          {m.feedback && (
            <KarafFeaturesManagerFeedback feedback={m.feedback} onDismiss={() => m.setFeedback(null)} />
          )}

          <KarafFeaturesManagerFilterBar
            activeTab={m.activeTab}
            searchQuery={m.searchQuery}
            onSearchChange={m.setSearchQuery}
            featureFilterMode={m.featureFilterMode}
            onFilterModeChange={m.setFeatureFilterMode}
            featuresCount={m.features.length}
            actionInProgress={m.actionInProgress}
            onRefreshAll={() => m.handleRefreshRepo()}
            onToggleAddRepo={() => m.setIsAddRepoOpen((prev) => !prev)}
          />

          {m.activeTab === 'repos' && m.isAddRepoOpen && (
            <KarafFeaturesManagerAddRepoForm
              newRepoUrl={m.newRepoUrl}
              onUrlChange={m.setNewRepoUrl}
              isSubmitting={m.actionInProgress === 'add_repo'}
              onSubmit={m.handleAddRepo}
              onClose={() => m.setIsAddRepoOpen(false)}
            />
          )}

          <div className="flex-1 overflow-y-auto p-3.5 space-y-2">
            {m.isLoading && (
              <div className="p-8 flex flex-col items-center justify-center text-muted-foreground text-xs font-mono">
                <RefreshCw className="w-5 h-5 animate-spin mb-2 text-primary" />
                <span>Consultando Karaf OSGi...</span>
              </div>
            )}

            {!m.isLoading && m.activeTab === 'features' && (
              <KarafFeaturesManagerFeatureList
                features={m.filteredFeatures}
                actionInProgress={m.actionInProgress}
                onToggleInstall={m.handleToggleInstallFeature}
              />
            )}

            {!m.isLoading && m.activeTab === 'repos' && (
              <KarafFeaturesManagerRepoList
                repos={m.filteredRepos}
                actionInProgress={m.actionInProgress}
                onRefresh={m.handleRefreshRepo}
                onRemove={m.handleRemoveRepo}
              />
            )}
          </div>

          <KarafFeaturesManagerFooter
            total={m.features.length}
            installed={countInstalledFeatures(m.features)}
            reposCount={m.repos.length}
            onClose={onClose}
          />
        </>
      )}
    </Modal>
  );
};
