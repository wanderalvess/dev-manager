import React from 'react';
import type { BackupResult, DatabaseConnectionConfig } from '../../../../../shared/types';
import type { BackupFormState } from '../../../hooks/database/useBackupForm';
import { BackupDestinationSection } from './BackupDestinationSection';
import { BackupCommandModeSection } from './BackupCommandModeSection';
import { BackupRunSection } from './BackupRunSection';

interface BackupRunTabProps {
  activeConnection: DatabaseConnectionConfig;
  form: BackupFormState;
  isRunningBackup: boolean;
  backupResult: BackupResult | null;
  copyFeedback: string | null;
  onCopyHash: (text: string, key: string) => void;
  onSelectFolder: () => void;
  onRun: () => void;
}

export const BackupRunTab: React.FC<BackupRunTabProps> = ({
  activeConnection,
  form,
  isRunningBackup,
  backupResult,
  copyFeedback,
  onCopyHash,
  onSelectFolder,
  onRun
}) => (
  <div className="space-y-4 animate-fade-in">
    <BackupDestinationSection activeConnection={activeConnection} form={form} onSelectFolder={onSelectFolder} />
    <BackupCommandModeSection activeConnection={activeConnection} form={form} />
    <BackupRunSection
      isRunningBackup={isRunningBackup}
      backupFolder={form.backupFolder}
      useCustomBackupCommand={form.useCustomBackupCommand}
      customBackupCommand={form.customBackupCommand}
      backupResult={backupResult}
      copyFeedback={copyFeedback}
      onCopyHash={onCopyHash}
      onRun={onRun}
    />
  </div>
);
