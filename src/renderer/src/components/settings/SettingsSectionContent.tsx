import React from 'react';
import type { AppSettings } from '../../../../shared/types';
import type { SettingsTab } from './settingsSections';
import type { SectionStatus } from '../../utils/settingsSectionStatus';
import { PathStatusBadge } from './PathStatusBadge';
import { AutoDetectResult } from './AutoDetectResult';
import { SettingsOverview } from './overview/SettingsOverview';
import { ThemeSettingsCard } from './appearance/ThemeSettingsCard';
import { DirsTab } from './tabs/DirsTab';
import { KarafTab } from './tabs/KarafTab';
import { RoutinesTab } from './tabs/RoutinesTab';
import { AzureTab } from './tabs/AzureTab';
import { ServicesTab } from './tabs/ServicesTab';
import { PortsTab } from './tabs/PortsTab';
import { AutomationTab } from './tabs/AutomationTab';
import { LogsTab } from './tabs/LogsTab';
import { BackupTab } from './tabs/BackupTab';
import { AiTab } from './tabs/AiTab';
import { QualityTab } from './tabs/QualityTab';
import { IntegrationTab } from './tabs/IntegrationTab';
import { UsageTab } from './tabs/UsageTab';
import { ModulesTab } from './tabs/ModulesTab';
import type { usePathValidation } from '../../hooks/settings/usePathValidation';
import type { useLauncherRows } from '../../hooks/settings/useLauncherRows';
import type { useTrackedLists } from '../../hooks/settings/useTrackedLists';
import type { useLlmProviders } from '../../hooks/settings/useLlmProviders';
import type { useQualitySources } from '../../hooks/settings/useQualitySources';
import type { useEnvironmentProfiles } from '../../hooks/settings/useEnvironmentProfiles';
import type { useSettingsImportExport } from '../../hooks/settings/useSettingsImportExport';
import type { useSetupChecklist } from '../../hooks/settings/useSetupChecklist';
import { DEFAULT_AUTOMATION, DEFAULT_LOG_SOURCES, DEFAULT_PORTS, DEFAULT_PROCESSES, DEFAULT_SERVICES } from '../../utils/settingsDefaults';

export interface SettingsSectionContentProps {
  tab: SettingsTab;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  paths: ReturnType<typeof usePathValidation>;
  launcher: ReturnType<typeof useLauncherRows>;
  lists: ReturnType<typeof useTrackedLists>;
  llm: ReturnType<typeof useLlmProviders>;
  quality: ReturnType<typeof useQualitySources>;
  envProfiles: ReturnType<typeof useEnvironmentProfiles>;
  importExport: ReturnType<typeof useSettingsImportExport>;
  setup: ReturnType<typeof useSetupChecklist>;
  statuses: Partial<Record<SettingsTab, SectionStatus>>;
  onOpenSection: (tab: SettingsTab) => void;
  onNavigate?: (page: string) => void;
}

/** Corpo da seção ativa: liga cada seção aos hooks de `hooks/settings` (Preparação do debug e Navegação juntam duas abas antigas). */
export const SettingsSectionContent: React.FC<SettingsSectionContentProps> = (props) => {
  const { tab, settings, setSettings, paths, launcher, lists, llm, quality, envProfiles, onOpenSection } = props;
  const [showPassword, setShowPassword] = React.useState(false);
  const [showWtaPassword, setShowWtaPassword] = React.useState(false);
  const renderPathStatusBadge = (fieldKey: string) => <PathStatusBadge status={paths.pathStatuses[fieldKey]} />;
  const pathProps = { renderPathStatusBadge, validateSinglePath: paths.validateSinglePath, handleBrowseDirectory: paths.handleBrowseDirectory };

  switch (tab) {
    case 'overview':
      return (
        <SettingsOverview
          settings={settings}
          checklist={props.setup.checklist}
          statuses={props.statuses}
          onOpenSection={onOpenSection}
          importExport={props.importExport}
        />
      );
    case 'dirs':
      return (
        <div className="space-y-4">
          <AutoDetectResult result={paths.lastDetection} onDismiss={paths.dismissDetection} />
          <DirsTab
            settings={settings}
            setSettings={setSettings}
            {...pathProps}
            handleBrowseFile={paths.handleBrowseFile}
            handleActivateEnvironmentProfile={envProfiles.handleActivateEnvironmentProfile}
            handleDeleteEnvironmentProfile={envProfiles.handleDeleteEnvironmentProfile}
            newEnvironmentProfileLabel={envProfiles.newEnvironmentProfileLabel}
            setNewEnvironmentProfileLabel={envProfiles.setNewEnvironmentProfileLabel}
            handleSaveCurrentAsEnvironmentProfile={envProfiles.handleSaveCurrentAsEnvironmentProfile}
          />
        </div>
      );
    case 'routines':
      return (
        <RoutinesTab
          settings={settings}
          setSettings={setSettings}
          {...pathProps}
          launcherRows={launcher.launcherRows}
          handleAddLauncherRow={launcher.handleAddLauncherRow}
          handleUpdateLauncherRow={launcher.handleUpdateLauncherRow}
          handleRemoveLauncherRow={launcher.handleRemoveLauncherRow}
          handleBrowseLauncherPath={launcher.handleBrowseLauncherPath}
          showWtaPassword={showWtaPassword}
          setShowWtaPassword={setShowWtaPassword}
        />
      );
    case 'karaf':
      return (
        <KarafTab
          settings={settings}
          setSettings={setSettings}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          {...pathProps}
          handleBrowseFile={paths.handleBrowseFile}
        />
      );
    case 'azure':
      return <AzureTab settings={settings} setSettings={setSettings} renderPathStatusBadge={renderPathStatusBadge} onGoToDirs={() => onOpenSection('dirs')} />;
    case 'debug':
      return (
        <div className="space-y-4">
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
          <AutomationTab settings={settings} setSettings={setSettings} defaultAutomation={DEFAULT_AUTOMATION} />
        </div>
      );
    case 'ports':
      return (
        <PortsTab
          settings={settings}
          setSettings={setSettings}
          defaultPorts={DEFAULT_PORTS}
          handleResetPorts={lists.handleResetPorts}
          handleAddPort={lists.handleAddPort}
          handleUpdatePort={lists.handleUpdatePort}
          handleRemovePort={lists.handleRemovePort}
          onGoToKaraf={() => onOpenSection('karaf')}
          onOpenApm={() => props.onNavigate?.('apm')}
        />
      );
    case 'logs':
      return (
        <LogsTab
          settings={settings}
          defaultLogSources={DEFAULT_LOG_SOURCES}
          handleResetLogSources={lists.handleResetLogSources}
          handleAddLogSource={lists.handleAddLogSource}
          handleUpdateLogSource={lists.handleUpdateLogSource}
          handleRemoveLogSource={lists.handleRemoveLogSource}
          handleBrowseLogPath={lists.handleBrowseLogPath}
        />
      );
    case 'backup':
      return <BackupTab settings={settings} setSettings={setSettings} handleBrowseFile={paths.handleBrowseFile} />;
    case 'ai':
      return <AiTab settings={settings} setSettings={setSettings} {...llm} />;
    case 'quality':
      return (
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
          {...pathProps}
        />
      );
    case 'integration':
      return <IntegrationTab settings={settings} setSettings={setSettings} />;
    case 'appearance':
      return (
        <div className="space-y-4">
          <ModulesTab settings={settings} setSettings={setSettings} />
          <ThemeSettingsCard />
        </div>
      );
    case 'usage':
      return <UsageTab settings={settings} setSettings={setSettings} />;
  }
};
