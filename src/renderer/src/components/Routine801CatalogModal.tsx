import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Routine801Header } from './routine801/Routine801Header';
import { Routine801ConfigPanel } from './routine801/Routine801ConfigPanel';
import { Routine801Toolbar } from './routine801/Routine801Toolbar';
import { Routine801Table } from './routine801/Routine801Table';
import { Routine801Inspector } from './routine801/Routine801Inspector';
import { Routine801BatchBar } from './routine801/Routine801BatchBar';
import { Routine801Console } from './routine801/Routine801Console';
import { Routine801Footer } from './routine801/Routine801Footer';
import { Routine801DirectInstallModal } from './routine801/Routine801DirectInstallModal';
import { useRoutine801Catalog } from '../hooks/routine801/useRoutine801Catalog';
import { useRoutine801Console } from '../hooks/routine801/useRoutine801Console';
import { useRoutine801Filters } from '../hooks/routine801/useRoutine801Filters';
import { useRoutine801Selection } from '../hooks/routine801/useRoutine801Selection';
import { useRoutine801Inspector } from '../hooks/routine801/useRoutine801Inspector';
import { useRoutine801Execution } from '../hooks/routine801/useRoutine801Execution';
import { useRoutine801Shortcuts } from '../hooks/routine801/useRoutine801Shortcuts';
import type { Routine801Tab } from '../utils/routine801ModalUtils';

interface Routine801CatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Routine801CatalogModal: React.FC<Routine801CatalogModalProps> = ({ isOpen, onClose }) => {
  // Abas principais: 'updates' (Atualizações) | 'installs' (Instalações)
  const [activeTab, setActiveTab] = useState<Routine801Tab>('updates');

  const catalog = useRoutine801Catalog(isOpen);
  const consoleState = useRoutine801Console();

  const currentCatalog = activeTab === 'updates' ? catalog.updatesCatalog : catalog.installsCatalog;
  const filters = useRoutine801Filters(currentCatalog.funcionalidades);
  const selection = useRoutine801Selection(filters.filteredList);
  const inspector = useRoutine801Inspector(currentCatalog.repositorios);
  const execution = useRoutine801Execution({
    repositorios: currentCatalog.repositorios,
    serverUrlInput: catalog.serverUrlInput,
    fetchCatalogs: catalog.fetchCatalogs,
    setErrorBanner: catalog.setErrorBanner,
    setIsConsoleExpanded: consoleState.setIsConsoleExpanded,
    clearSelection: selection.clearSelection
  });

  useRoutine801Shortcuts({
    isOpen,
    isDirectInstallOpen: execution.isDirectInstallOpen,
    hasInspectedFeature: !!inspector.inspectedFeature,
    isConfigOpen: catalog.isConfigOpen,
    isConsoleExpanded: consoleState.isConsoleExpanded,
    searchInputRef: filters.searchInputRef,
    closeDirectInstall: () => execution.setIsDirectInstallOpen(false),
    closeInspector: () => inspector.setInspectedFeature(null),
    closeConfig: () => catalog.setIsConfigOpen(false),
    closeConsole: () => consoleState.setIsConsoleExpanded(false),
    onClose
  });

  const handleChangeTab = (tab: Routine801Tab) => {
    setActiveTab(tab);
    selection.clearSelection();
  };

  const selectedCount = Object.keys(selection.selectedFeatures).length;
  const batchOverride = selection.batchVersionOverride.trim() || undefined;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="relative flex flex-col w-full max-w-7xl h-[92vh] bg-card text-card-foreground border border-border rounded-lg shadow-2xl overflow-hidden">
        <Routine801Header
          connectionHealth={catalog.connectionHealth}
          serverUrlInput={catalog.serverUrlInput}
          isConfigOpen={catalog.isConfigOpen}
          isLoading={catalog.isLoading}
          isExecuting={execution.isExecuting}
          executeVia={execution.executeVia}
          onToggleConfig={() => catalog.setIsConfigOpen(!catalog.isConfigOpen)}
          onChangeExecuteVia={execution.setExecuteVia}
          onOpenDirectInstall={() => execution.setIsDirectInstallOpen(true)}
          onRefresh={() => catalog.fetchCatalogs()}
          onClose={onClose}
        />

        {catalog.isConfigOpen && (
          <Routine801ConfigPanel
            serverUrlInput={catalog.serverUrlInput}
            isTestingConnection={catalog.isTestingConnection}
            connectionHealth={catalog.connectionHealth}
            onChangeUrl={catalog.setServerUrlInput}
            onTestConnection={catalog.handleTestConnection}
            onSave={catalog.handleSaveServerUrl}
          />
        )}

        {/* Banner de Erro Global */}
        {catalog.errorBanner && (
          <div className="px-5 py-2.5 bg-rose-500/10 border-b border-rose-500/25 flex items-center justify-between text-xs text-rose-400 shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{catalog.errorBanner}</span>
            </div>
            <button
              onClick={() => catalog.setErrorBanner(null)}
              className="text-rose-400 hover:text-rose-300 underline text-xs ml-4"
            >
              Dispensar
            </button>
          </div>
        )}

        <Routine801Toolbar
          activeTab={activeTab}
          updatesCount={catalog.updatesCatalog.funcionalidades.length}
          installsCount={catalog.installsCatalog.funcionalidades.length}
          searchQuery={filters.searchQuery}
          typeFilter={filters.typeFilter}
          statusFilter={filters.statusFilter}
          versionFilter={filters.versionFilter}
          versionFamilies={filters.versionFamilies}
          filteredCount={filters.filteredList.length}
          searchInputRef={filters.searchInputRef}
          onChangeTab={handleChangeTab}
          onChangeSearch={filters.setSearchQuery}
          onChangeType={filters.setTypeFilter}
          onChangeStatus={filters.setStatusFilter}
          onChangeVersion={filters.setVersionFilter}
          onSelectAllFiltered={selection.handleSelectAllFiltered}
        />

        <div className="relative flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <Routine801Table
              filteredList={filters.filteredList}
              selectedFeatures={selection.selectedFeatures}
              inspectedFeature={inspector.inspectedFeature}
              activeTab={activeTab}
              isLoading={catalog.isLoading}
              isExecuting={execution.isExecuting}
              hasActiveFilters={
                !!filters.searchQuery ||
                filters.typeFilter !== 'ALL' ||
                filters.statusFilter !== 'ALL' ||
                filters.versionFilter !== 'ALL'
              }
              onClearFilters={filters.clearFilters}
              onToggleSelectAll={selection.handleToggleSelectAll}
              onToggleSelectItem={selection.handleToggleSelectItem}
              onInspect={inspector.handleInspectFeature}
              onExecute={(features) => execution.handleExecute(features)}
            />
          </div>

          {inspector.inspectedFeature && (
            <Routine801Inspector
              feature={inspector.inspectedFeature}
              effectiveFeature={inspector.inspectedEffectiveFeature}
              customVersion={inspector.inspectedCustomVersion}
              repo={inspector.inspectedRepo}
              commands={inspector.inspectedCommands}
              copiedKey={inspector.copiedKey}
              activeTab={activeTab}
              isExecuting={execution.isExecuting}
              onChangeCustomVersion={inspector.setInspectedCustomVersion}
              onCopy={inspector.handleCopyText}
              onClose={() => inspector.setInspectedFeature(null)}
              onExecute={execution.handleExecute}
            />
          )}
        </div>

        {selectedCount > 0 && (
          <Routine801BatchBar
            selectedCount={selectedCount}
            activeTab={activeTab}
            isExecuting={execution.isExecuting}
            batchVersionOverride={selection.batchVersionOverride}
            onChangeVersionOverride={selection.setBatchVersionOverride}
            onClearSelection={selection.clearSelection}
            onRegisterRepos={() =>
              execution.handleExecute(Object.values(selection.selectedFeatures), 'repo_add_only', batchOverride)
            }
            onInstall={() =>
              execution.handleExecute(Object.values(selection.selectedFeatures), 'install', batchOverride)
            }
          />
        )}

        {consoleState.isConsoleExpanded && (
          <Routine801Console
            isExecuting={execution.isExecuting}
            executingTargetName={execution.executingTargetName}
            consoleLogs={consoleState.consoleLogs}
            displayedLogs={consoleState.displayedLogs}
            logFilter={consoleState.logFilter}
            consoleEndRef={consoleState.consoleEndRef}
            onChangeFilter={consoleState.setLogFilter}
            onClear={() => consoleState.setConsoleLogs([])}
            onCollapse={() => consoleState.setIsConsoleExpanded(false)}
          />
        )}

        <Routine801Footer
          filteredCount={filters.filteredList.length}
          lastResult={execution.lastResult}
          consoleLogCount={consoleState.consoleLogs.length}
          isConsoleExpanded={consoleState.isConsoleExpanded}
          onToggleConsole={() => consoleState.setIsConsoleExpanded(!consoleState.isConsoleExpanded)}
          onClose={onClose}
        />

        {execution.isDirectInstallOpen && (
          <Routine801DirectInstallModal
            nome={execution.directInstallNome}
            versao={execution.directInstallVersao}
            tipo={execution.directInstallTipo}
            action={execution.directInstallAction}
            onChangeNome={execution.setDirectInstallNome}
            onChangeVersao={execution.setDirectInstallVersao}
            onChangeTipo={execution.setDirectInstallTipo}
            onChangeAction={execution.setDirectInstallAction}
            onCancel={() => execution.setIsDirectInstallOpen(false)}
            onExecute={execution.handleDirectInstallExecute}
          />
        )}
      </div>
    </div>
  );
};
