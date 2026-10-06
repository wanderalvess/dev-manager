import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { OnboardingTour } from '../components/onboarding/OnboardingTour';
import { usePageTour } from '../components/onboarding/usePageTour';
import { SETTINGS_TOUR_STEPS, SETTINGS_TOUR_STORAGE_KEY } from '../components/onboarding/pageTours/settingsTour';
import { SettingsTab } from '../components/settings/settingsSearchData';
import { SettingsHeader } from '../components/settings/SettingsHeader';
import { PathStatusBadge } from '../components/settings/PathStatusBadge';
import { SettingsTabsNav } from '../components/settings/SettingsTabsNav';
import { SettingsSearchBar } from '../components/settings/SettingsSearchBar';
import { SetupChecklistCard } from '../components/settings/SetupChecklistCard';
import { DirsTab } from '../components/settings/tabs/DirsTab';
import { KarafTab } from '../components/settings/tabs/KarafTab';
import { AzureTab } from '../components/settings/tabs/AzureTab';
import { ServicesTab } from '../components/settings/tabs/ServicesTab';
import { PortsTab } from '../components/settings/tabs/PortsTab';
import { AutomationTab } from '../components/settings/tabs/AutomationTab';
import { LogsTab } from '../components/settings/tabs/LogsTab';
import { BackupTab } from '../components/settings/tabs/BackupTab';
import { AiTab } from '../components/settings/tabs/AiTab';
import { QualityTab } from '../components/settings/tabs/QualityTab';
import { useSettingsDraft } from '../hooks/settings/useSettingsDraft';
import { usePathValidation } from '../hooks/settings/usePathValidation';
import { useLauncherRows } from '../hooks/settings/useLauncherRows';
import { useTrackedLists } from '../hooks/settings/useTrackedLists';
import { useLlmProviders } from '../hooks/settings/useLlmProviders';
import { useQualitySources } from '../hooks/settings/useQualitySources';
import { useEnvironmentProfiles } from '../hooks/settings/useEnvironmentProfiles';
import { useSettingsImportExport } from '../hooks/settings/useSettingsImportExport';
import { useSettingsSearch } from '../hooks/settings/useSettingsSearch';
import { useSetupChecklist } from '../hooks/settings/useSetupChecklist';
import { DEFAULT_AUTOMATION, DEFAULT_LOG_SOURCES, DEFAULT_PORTS, DEFAULT_PROCESSES, DEFAULT_SERVICES } from '../utils/settingsDefaults';

interface SettingsPageProps {
  onSettingsSaved?: () => void;
  onNavigate?: (tab: string) => void;
}

const BANNER_BASE = 'px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 shadow-sm shrink-0';

/**
 * Orquestra a tela de Configurações: o estado e as regras vivem nos hooks de `hooks/settings`, cada aba fica em
 * `components/settings/tabs`, e aqui só se liga um ao outro.
 */
export const SettingsPage: React.FC<SettingsPageProps> = ({ onSettingsSaved, onNavigate }) => {
  const tour = usePageTour(SETTINGS_TOUR_STORAGE_KEY);
  const [activeTab, setActiveTab] = useState<SettingsTab>('dirs');
  const [showPassword, setShowPassword] = useState(false);
  const [showWtaPassword, setShowWtaPassword] = useState(false);

  const draft = useSettingsDraft(onSettingsSaved);
  const { settings, setSettings, loadedSettings } = draft;
  const paths = usePathValidation(settings, setSettings);
  const launcher = useLauncherRows(setSettings);
  const lists = useTrackedLists(settings, setSettings);
  const llm = useLlmProviders(setSettings);
  const quality = useQualitySources(setSettings);
  const envProfiles = useEnvironmentProfiles(settings, setSettings, paths.validateAllPaths);
  const importExport = useSettingsImportExport(draft.reload, onSettingsSaved);
  const search = useSettingsSearch(activeTab, setActiveTab);
  const setup = useSetupChecklist(settings, paths.pathStatuses, setActiveTab, onNavigate);

  // A cada (re)carga do disco: valida os caminhos e remonta o editor de launchers a partir do que foi salvo
  const { validateAllPaths } = paths;
  const { resetRows } = launcher;
  useEffect(() => {
    if (!loadedSettings) return;
    resetRows(loadedSettings.routineLauncherMap);
    void validateAllPaths(loadedSettings);
  }, [loadedSettings, resetRows, validateAllPaths]);

  const renderPathStatusBadge = (fieldKey: string) => <PathStatusBadge status={paths.pathStatuses[fieldKey]} />;

  return (
    <div className="h-full w-full flex flex-col p-4 md:p-5 space-y-4 overflow-hidden">
      <SettingsHeader
        onOpenTour={tour.open}
        importExport={importExport}
        isDetecting={paths.isDetecting}
        onAutoDetect={paths.handleAutoDetect}
        hasUnsavedChanges={draft.hasUnsavedChanges}
        isSaving={draft.isSaving}
        savedSuccess={draft.savedSuccess}
        onSave={draft.handleSave}
      />

      <SettingsSearchBar
        query={search.query}
        onQueryChange={search.setQuery}
        isOpen={search.isOpen}
        onOpenChange={search.setIsOpen}
        results={search.results}
        onSelectResult={search.selectResult}
      />

      {importExport.statusMessage && (
        <div role="status" className={`${BANNER_BASE} bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300 animate-in fade-in duration-200`}>
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{importExport.statusMessage}</span>
        </div>
      )}

      {draft.saveError && (
        <div role="alert" className={`${BANNER_BASE} bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-300`}>
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>Não foi possível salvar as configurações: {draft.saveError}</span>
        </div>
      )}

      <SetupChecklistCard checklist={setup.checklist} pendingCount={setup.pendingCount} />

      <SettingsTabsNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={{
          services: (settings.trackedServices || []).length,
          ports: (settings.monitoredPorts || []).length,
          logs: (settings.realtimeLogSources || DEFAULT_LOG_SOURCES).length,
          ai: (settings.llmProviders || []).length,
          quality: (settings.qualitySources || []).length
        }}
      />

      {/* Área rolável: apenas o conteúdo da aba ativa rola, cabeçalho e abas ficam fixos */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1 flex flex-col">
        {activeTab === 'dirs' && (
          <DirsTab
            settings={settings}
            setSettings={setSettings}
            renderPathStatusBadge={renderPathStatusBadge}
            validateSinglePath={paths.validateSinglePath}
            handleBrowseDirectory={paths.handleBrowseDirectory}
            handleBrowseFile={paths.handleBrowseFile}
            handleActivateEnvironmentProfile={envProfiles.handleActivateEnvironmentProfile}
            handleDeleteEnvironmentProfile={envProfiles.handleDeleteEnvironmentProfile}
            newEnvironmentProfileLabel={envProfiles.newEnvironmentProfileLabel}
            setNewEnvironmentProfileLabel={envProfiles.setNewEnvironmentProfileLabel}
            handleSaveCurrentAsEnvironmentProfile={envProfiles.handleSaveCurrentAsEnvironmentProfile}
            launcherRows={launcher.launcherRows}
            handleAddLauncherRow={launcher.handleAddLauncherRow}
            handleUpdateLauncherRow={launcher.handleUpdateLauncherRow}
            handleRemoveLauncherRow={launcher.handleRemoveLauncherRow}
            handleBrowseLauncherPath={launcher.handleBrowseLauncherPath}
            showWtaPassword={showWtaPassword}
            setShowWtaPassword={setShowWtaPassword}
          />
        )}

        {activeTab === 'karaf' && (
          <KarafTab settings={settings} setSettings={setSettings} showPassword={showPassword} setShowPassword={setShowPassword} />
        )}

        {activeTab === 'azure' && (
          <AzureTab
            settings={settings}
            setSettings={setSettings}
            renderPathStatusBadge={renderPathStatusBadge}
            validateSinglePath={paths.validateSinglePath}
            handleBrowseDirectory={paths.handleBrowseDirectory}
          />
        )}

        {activeTab === 'services' && (
          <ServicesTab
            settings={settings}
            defaultServices={DEFAULT_SERVICES}
            defaultProcesses={DEFAULT_PROCESSES}
            handleResetServices={lists.handleResetServices}
            handleAddService={lists.handleAddService}
            handleUpdateService={lists.handleUpdateService}
            handleRemoveService={lists.handleRemoveService}
            handleResetProcesses={lists.handleResetProcesses}
            handleAddProcess={lists.handleAddProcess}
            handleUpdateProcess={lists.handleUpdateProcess}
            handleRemoveProcess={lists.handleRemoveProcess}
          />
        )}

        {activeTab === 'ports' && (
          <PortsTab
            settings={settings}
            setSettings={setSettings}
            defaultPorts={DEFAULT_PORTS}
            handleResetPorts={lists.handleResetPorts}
            handleAddPort={lists.handleAddPort}
            handleUpdatePort={lists.handleUpdatePort}
            handleRemovePort={lists.handleRemovePort}
          />
        )}

        {activeTab === 'automation' && (
          <AutomationTab settings={settings} setSettings={setSettings} defaultAutomation={DEFAULT_AUTOMATION} />
        )}

        {activeTab === 'logs' && (
          <LogsTab
            settings={settings}
            defaultLogSources={DEFAULT_LOG_SOURCES}
            handleResetLogSources={lists.handleResetLogSources}
            handleAddLogSource={lists.handleAddLogSource}
            handleUpdateLogSource={lists.handleUpdateLogSource}
            handleRemoveLogSource={lists.handleRemoveLogSource}
            handleBrowseLogPath={lists.handleBrowseLogPath}
          />
        )}

        {activeTab === 'backup' && (
          <BackupTab settings={settings} setSettings={setSettings} handleBrowseFile={paths.handleBrowseFile} />
        )}

        {activeTab === 'ai' && <AiTab settings={settings} setSettings={setSettings} {...llm} />}

        {activeTab === 'quality' && (
          <QualityTab
            settings={settings}
            setSettings={setSettings}
            editingQualitySource={quality.editingQualitySource}
            setEditingQualitySource={quality.setEditingQualitySource}
            showQualityToken={quality.showQualityToken}
            setShowQualityToken={quality.setShowQualityToken}
            handleApplyQualityTemplate={quality.handleApplyQualityTemplate}
            handleSaveQualitySource={quality.handleSaveQualitySource}
            handleDeleteQualitySource={quality.handleDeleteQualitySource}
            handleToggleQualitySource={quality.handleToggleQualitySource}
            handleSetActiveQualitySource={quality.handleSetActiveQualitySource}
            handleTestQualityConnection={quality.handleTestQualityConnection}
            testingQualityId={quality.testingQualityId}
            testResults={quality.qualityTestResults}
          />
        )}
      </div>

      <OnboardingTour
        steps={SETTINGS_TOUR_STEPS}
        isOpen={tour.isOpen}
        onClose={tour.close}
        storageKey={SETTINGS_TOUR_STORAGE_KEY}
      />
    </div>
  );
};
