import React, { useEffect, useState } from 'react';
import { MarkdownReader } from '../components/MarkdownReader';
import { DocSettingsModal } from '../components/DocSettingsModal';
import { OnboardingTour } from '../components/onboarding/OnboardingTour';
import { usePageTour } from '../components/onboarding/usePageTour';
import { DOCS_TOUR_STEPS, DOCS_TOUR_STORAGE_KEY } from '../components/onboarding/pageTours/docsTour';
import { DocsHeaderPanel } from '../components/docs/DocsHeaderPanel';
import { DocsSearchBar } from '../components/docs/DocsSearchBar';
import { DocsEmptyIndex } from '../components/docs/DocsEmptyIndex';
import { DocsSearchResults } from '../components/docs/DocsSearchResults';
import { DocsCatalog } from '../components/docs/DocsCatalog';
import { DocsModelHelpModal } from '../components/docs/modals/DocsModelHelpModal';
import { DocsSyncModal } from '../components/docs/modals/DocsSyncModal';
import { useDocsIndex } from '../hooks/docs/useDocsIndex';
import { useDocsSettings } from '../hooks/docs/useDocsSettings';
import { useDocsSync } from '../hooks/docs/useDocsSync';
import { useDocsSearch } from '../hooks/docs/useDocsSearch';
import { filterDocFiles } from '../utils/docsPageUtils';
import { resolveActiveLlmProvider } from '../utils/llmProviderUtils';

interface DocsPageProps {
  onNavigateToSettings?: () => void;
  settingsVersion?: number;
}

export const DocsPage: React.FC<DocsPageProps> = ({ onNavigateToSettings, settingsVersion }) => {
  const tour = usePageTour(DOCS_TOUR_STORAGE_KEY);
  const [showModelHelp, setShowModelHelp] = useState<boolean>(false);
  const [showDocSettingsModal, setShowDocSettingsModal] = useState<boolean>(false);
  const [fileFilter, setFileFilter] = useState<string>('');

  const index = useDocsIndex();
  const settings = useDocsSettings();
  const sync = useDocsSync({
    syncTargets: settings.syncTargets,
    setSyncTargets: settings.setSyncTargets,
    reloadSettings: settings.loadDocSettings
  });
  const activeLlmProvider = resolveActiveLlmProvider(settings.llmProviders, settings.activeLlmProviderId);
  const search = useDocsSearch(activeLlmProvider);

  const { loadStatus } = index;
  const { loadDocSettings } = settings;

  useEffect(() => {
    loadStatus();
    loadDocSettings();
  }, [loadStatus, loadDocSettings]);

  useEffect(() => {
    if (settingsVersion && settingsVersion > 0) {
      loadDocSettings();
      loadStatus();
    }
  }, [settingsVersion, loadDocSettings, loadStatus]);

  const { status } = index;
  const hasIndex = !!status && status.totalChunks > 0;
  const filteredFiles = filterDocFiles(status?.files || [], search.sourceFilter, fileFilter);
  const openModelHelp = () => setShowModelHelp(true);

  return (
    <div className="h-full flex flex-col p-4 md:p-5 space-y-4 overflow-hidden">
      <DocsHeaderPanel
        status={status}
        hasIndex={hasIndex}
        isIndexing={index.isIndexing}
        progress={index.progress}
        indexError={index.indexError}
        settingsCount={settings.docFolders.length + settings.confluenceSources.length + settings.jiraSources.length}
        enabledSyncTargetsCount={settings.syncTargets.filter((t) => t.enabled).length}
        activeLlmProvider={activeLlmProvider}
        onOpenTour={tour.open}
        onOpenSettings={() => setShowDocSettingsModal(true)}
        onOpenSync={() => sync.setShowSyncModal(true)}
        onReindex={index.handleReindex}
        onOpenModelHelp={openModelHelp}
      />

      <DocsSearchBar
        status={status}
        query={search.query}
        sourceFilter={search.sourceFilter}
        hasIndex={hasIndex}
        hasSearched={search.hasSearched}
        isSearching={search.isSearching}
        isAskingLlm={search.isAskingLlm}
        activeLlmProvider={activeLlmProvider}
        onQueryChange={search.setQuery}
        onSourceFilterChange={search.setSourceFilter}
        onSearch={search.handleSearch}
        onAskLlm={() => search.handleAskLlm()}
      />

      {/* Resultados e Catálogo de Documentos */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
        {!hasIndex && !index.isIndexing && (
          <DocsEmptyIndex hasFolders={settings.docFolders.length > 0} onNavigateToSettings={onNavigateToSettings} />
        )}

        {/* MODO BUSCA ATIVA */}
        {hasIndex && search.hasSearched && search.query.trim() && (
          <DocsSearchResults
            query={search.query}
            results={search.results}
            isSearching={search.isSearching}
            catalogCount={filteredFiles.length}
            isAskingLlm={search.isAskingLlm}
            llmAnswer={search.llmAnswer}
            llmError={search.llmError}
            llmSources={search.llmSources}
            activeLlmProvider={activeLlmProvider}
            onAskLlm={search.handleAskLlm}
            onClearSearch={search.clearSearch}
            onNavigateToSettings={onNavigateToSettings}
            onOpenPreview={search.handleOpenPreview}
            onOpenInEditor={search.handleOpenInEditor}
            onOpenInFolder={search.handleOpenInFolder}
          />
        )}

        {/* MODO CATÁLOGO DE DOCUMENTOS (Quando não está buscando ativamente) */}
        {hasIndex && (!search.hasSearched || !search.query.trim()) && (
          <DocsCatalog
            files={filteredFiles}
            fileFilter={fileFilter}
            onFileFilterChange={setFileFilter}
            onOpenPreview={search.handleOpenPreview}
            onOpenInEditor={search.handleOpenInEditor}
            onOpenInFolder={search.handleOpenInFolder}
          />
        )}
      </div>

      {/* Modal de Leitura / Prévia Estilizada Markdown */}
      {search.previewFile && (
        <MarkdownReader
          title={search.previewFile.title}
          filePath={search.previewFile.path}
          content={search.previewContent}
          isLoading={search.isLoadingPreview}
          onClose={() => search.setPreviewFile(null)}
          onOpenInEditor={search.handleOpenInEditor}
          onOpenInFolder={search.handleOpenInFolder}
        />
      )}

      {showModelHelp && <DocsModelHelpModal onClose={() => setShowModelHelp(false)} />}

      {sync.showSyncModal && (
        <DocsSyncModal
          status={status}
          hasIndex={hasIndex}
          syncTargets={settings.syncTargets}
          isSyncing={sync.isSyncing}
          syncProgress={sync.syncProgress}
          syncResults={sync.syncResults}
          editingTarget={sync.editingTarget}
          onEditingTargetChange={sync.setEditingTarget}
          onClose={sync.closeSyncModal}
          onSyncNow={sync.handleSyncNow}
          onSaveTarget={sync.handleSaveTarget}
          onDeleteTarget={sync.handleDeleteTarget}
          onToggleTargetEnabled={sync.handleToggleTargetEnabled}
        />
      )}

      {/* Modal de Configurações de Documentação & LLM */}
      <DocSettingsModal
        isOpen={showDocSettingsModal}
        onClose={() => setShowDocSettingsModal(false)}
        status={status}
        onOpenModelHelp={openModelHelp}
        docFolders={settings.docFolders}
        indexProjectsDocs={settings.indexProjectsDocs}
        autoReindexOnChange={settings.autoReindexOnChange}
        isAddingFolder={settings.isAddingFolder}
        onToggleIndexProjects={settings.handleToggleIndexProjects}
        onToggleAutoReindex={settings.handleToggleAutoReindex}
        onAddFolder={settings.handleAddFolder}
        onRemoveFolder={settings.handleRemoveFolder}
        confluenceSources={settings.confluenceSources}
        onSaveConfluenceSource={settings.handleSaveConfluenceSource}
        onDeleteConfluenceSource={settings.handleDeleteConfluenceSource}
        onToggleConfluenceEnabled={settings.handleToggleConfluenceEnabled}
        onTestConfluenceConnection={settings.handleTestConfluenceConnection}
        jiraSources={settings.jiraSources}
        onSaveJiraSource={settings.handleSaveJiraSource}
        onDeleteJiraSource={settings.handleDeleteJiraSource}
        onToggleJiraEnabled={settings.handleToggleJiraEnabled}
        onTestJiraConnection={settings.handleTestJiraConnection}
        llmProviders={settings.llmProviders}
        activeLlmProviderId={settings.activeLlmProviderId}
        onSaveLlmProvider={settings.handleSaveLlmProvider}
        onDeleteLlmProvider={settings.handleDeleteLlmProvider}
        onSetActiveLlmProvider={settings.handleSetActiveLlmProvider}
        onTestLlmConnection={settings.handleTestLlmConnection}
      />

      <OnboardingTour
        steps={DOCS_TOUR_STEPS}
        isOpen={tour.isOpen}
        onClose={tour.close}
        storageKey={DOCS_TOUR_STORAGE_KEY}
      />
    </div>
  );
};
