import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useKarafFeaturesManager } from '../hooks/karaf/useKarafFeaturesManager';
import { countInstalledFeatures } from '../utils/karafFeaturesModalUtils';
import { KarafFeaturesManagerHeader } from './karaf/features/KarafFeaturesManagerHeader';
import { KarafFeaturesManagerFeedback } from './karaf/features/KarafFeaturesManagerFeedback';
import { KarafFeaturesManagerFilterBar } from './karaf/features/KarafFeaturesManagerFilterBar';
import { KarafFeaturesManagerAddRepoForm } from './karaf/features/KarafFeaturesManagerAddRepoForm';
import { KarafFeaturesManagerFeatureList } from './karaf/features/KarafFeaturesManagerFeatureList';
import { KarafFeaturesManagerRepoList } from './karaf/features/KarafFeaturesManagerRepoList';
import { KarafFeaturesManagerFooter } from './karaf/features/KarafFeaturesManagerFooter';

interface KarafFeaturesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KarafFeaturesManagerModal: React.FC<KarafFeaturesManagerModalProps> = ({ isOpen, onClose }) => {
  const m = useKarafFeaturesManager(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <KarafFeaturesManagerHeader
          activeTab={m.activeTab}
          featuresCount={m.features.length}
          reposCount={m.repos.length}
          isLoading={m.isLoading}
          onReload={m.loadData}
          onClose={onClose}
          onChangeTab={(tab) => {
            m.setActiveTab(tab);
            m.setSearchQuery('');
          }}
        />

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

        {/* Conteúdo das Listas */}
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
      </div>
    </div>
  );
};
