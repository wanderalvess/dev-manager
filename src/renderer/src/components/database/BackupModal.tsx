import React from 'react';
import type { DatabaseConnectionConfig, AppSettings } from '../../../../shared/types';
import { useBackupModal } from '../../hooks/database/useBackupModal';
import { BackupModalHeader } from './backup/BackupModalHeader';
import { BackupTabNav } from './backup/BackupTabNav';
import { BackupRunTab } from './backup/BackupRunTab';
import { BackupScheduleTab } from './backup/BackupScheduleTab';
import { BackupFilesTab } from './backup/BackupFilesTab';
import { BackupHistoryTab } from './backup/BackupHistoryTab';
import { BackupWebhooksTab } from './backup/BackupWebhooksTab';
import { Modal } from '../ui/Modal';

export interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeConnection: DatabaseConnectionConfig | null;
  connections: DatabaseConnectionConfig[];
  settings: AppSettings | null;
  onSettingsUpdate?: (updater: (prev: AppSettings | null) => AppSettings | null) => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  activeConnection,
  connections,
  settings,
  onSettingsUpdate
}) => {
  const { form, data, webhooks, actions, copyCellToClipboard, copyFeedback, handleExportBackupHistoryCsv } =
    useBackupModal({ isOpen, activeConnection, connections, settings, onSettingsUpdate });

  if (!isOpen || !activeConnection) return null;

  const { backupActiveTab } = form;

  return (
    <Modal
      open
      onClose={onClose}
      bare
      panelClassName="bg-card border border-border/80 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-fade-in flex flex-col max-h-[92vh]"
      closeOnBackdrop={false}
      closeOnEscape={false}
    >
      <BackupModalHeader activeConnection={activeConnection} onClose={onClose} />

      <BackupTabNav
        activeTab={backupActiveTab}
        onChange={form.setBackupActiveTab}
        scheduleActive={Boolean(form.backupCron && form.backupScheduleEnabled)}
        filesCount={data.backupFiles.length}
        historyCount={data.backupHistory.length}
        webhooksCount={webhooks.backupWebhooks.length}
      />

      {/* Tab Body */}
      <div className="p-6 overflow-y-auto flex-1 text-xs space-y-4">
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
            connections={connections}
            form={form}
            isSavingSchedule={actions.isSavingSchedule}
            scheduleSaveResult={actions.scheduleSaveResult}
            onSave={actions.handleSaveBackupSchedule}
          />
        )}

        {backupActiveTab === 'files' && (
          <BackupFilesTab
            connections={connections}
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
    </Modal>
  );
};
