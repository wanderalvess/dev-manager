import React from 'react';
import type { DatabaseConnectionConfig, AppSettings } from '../../../../shared/types';
import { useBackupPanel } from '../../hooks/database/useBackupPanel';
import { BackupPanelHeader } from './backup/BackupPanelHeader';
import { BackupTabNav } from './backup/BackupTabNav';
import { BackupRunTab } from './backup/BackupRunTab';
import { BackupScheduleTab } from './backup/BackupScheduleTab';
import { BackupFilesTab } from './backup/BackupFilesTab';
import { BackupHistoryTab } from './backup/BackupHistoryTab';
import { BackupWebhooksTab } from './backup/BackupWebhooksTab';


export interface BackupPanelProps {
  isActive: boolean;
  activeConnection: DatabaseConnectionConfig | null;
  connections: DatabaseConnectionConfig[];
  settings: AppSettings | null;
  onSettingsUpdate?: (updater: (prev: AppSettings | null) => AppSettings | null) => void;
}

export const BackupPanel: React.FC<BackupPanelProps> = ({
  isActive,
  activeConnection,
  connections,
  settings,
  onSettingsUpdate
}) => {
  const { form, data, webhooks, actions, copyCellToClipboard, copyFeedback, handleExportBackupHistoryCsv } =
    useBackupPanel({ isActive, activeConnection, connections, settings, onSettingsUpdate });

  if (!activeConnection) return null;

  const { backupActiveTab } = form;
  // O teste de restauração sobrescreve o destino: só bancos do mesmo tipo, fora de produção e nunca a própria conexão.
  const scratchCandidates = connections.filter(
    (c) => c.id !== activeConnection.id && c.type === activeConnection.type && !c.isProduction
  );

  return (
    <div className="bg-card border border-border rounded-[14px] shadow-xs w-full overflow-hidden flex flex-col">
      <BackupPanelHeader activeConnection={activeConnection} />

      <BackupTabNav
        activeTab={backupActiveTab}
        onChange={form.setBackupActiveTab}
        scheduleActive={Boolean(form.backupCron && form.backupScheduleEnabled)}
        filesCount={data.backupFiles.length}
        historyCount={data.backupHistory.length}
        webhooksCount={webhooks.backupWebhooks.length}
      />

      {/* Tab Body */}
      <div className="p-6 xl:p-8 overflow-y-auto flex-1 text-sm space-y-4">
        {backupActiveTab === 'backup' && (
          <BackupRunTab
            activeConnection={activeConnection}
            form={form}
            isRunningBackup={actions.isRunningBackup}
            backupResult={actions.backupResult}
            copyFeedback={copyFeedback}
            onCopyHash={copyCellToClipboard}
            onSelectFolder={actions.handleSelectBackupFolder}
            onRun={actions.handleRunBackup}
          />
        )}

        {backupActiveTab === 'schedule' && (
          <BackupScheduleTab
            connections={scratchCandidates}
            form={form}
            isSavingSchedule={actions.isSavingSchedule}
            scheduleSaveResult={actions.scheduleSaveResult}
            onSave={actions.handleSaveBackupSchedule}
          />
        )}

        {backupActiveTab === 'files' && (
          <BackupFilesTab
            connections={scratchCandidates}
            backupFolder={form.backupFolder}
            backupFiles={data.backupFiles}
            isLoadingBackupFiles={data.isLoadingBackupFiles}
            scratchConnectionId={form.scratchConnectionId}
            onScratchConnectionChange={form.setScratchConnectionId}
            restoreResult={actions.restoreResult}
            drillResult={actions.drillResult}
            restoringFilePath={actions.restoringFilePath}
            drillingFilePath={actions.drillingFilePath}
            onRefresh={() => data.refreshBackupFiles(form.backupFolder)}
            onRestore={actions.handleRestoreBackup}
            onRestoreDrill={actions.handleRunRestoreDrill}
          />
        )}

        {backupActiveTab === 'history' && (
          <BackupHistoryTab
            backupHistory={data.backupHistory}
            isLoadingBackupHistory={data.isLoadingBackupHistory}
            copyFeedback={copyFeedback}
            onCopyHash={copyCellToClipboard}
            onExportCsv={handleExportBackupHistoryCsv}
            onRefresh={() => data.refreshBackupHistory(activeConnection.id)}
          />
        )}

        {backupActiveTab === 'webhooks' && (
          <BackupWebhooksTab
            backupWebhooks={webhooks.backupWebhooks}
            editingWebhook={webhooks.editingWebhook}
            setEditingWebhook={webhooks.setEditingWebhook}
            isTestingWebhookId={webhooks.isTestingWebhookId}
            webhookTestResults={webhooks.webhookTestResults}
            onSave={webhooks.handleSaveWebhook}
            onDelete={webhooks.handleDeleteWebhook}
            onToggleEnabled={webhooks.handleToggleWebhookEnabled}
            onTest={webhooks.handleTestWebhook}
          />
        )}
      </div>
    </div>
  );
};
