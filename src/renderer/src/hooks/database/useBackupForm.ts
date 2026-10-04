import { useCallback, useMemo, useState } from 'react';
import type { AppSettings, DatabaseConnectionConfig } from '../../../../shared/types';
import { getDefaultBackupCommandTemplate, resolveBackupCommandPreview } from '../../utils/backupCommandPreview';

export type BackupTabId = 'backup' | 'schedule' | 'files' | 'history' | 'webhooks';

/** Campos editáveis do modal (destino, comando, agendamento, retenção e drill). */
export function useBackupForm(activeConnection: DatabaseConnectionConfig | null) {
  const [backupActiveTab, setBackupActiveTab] = useState<BackupTabId>('backup');
  const [backupFolder, setBackupFolder] = useState<string>('');
  const [backupCron, setBackupCron] = useState<string>('');
  const [backupScheduleEnabled, setBackupScheduleEnabled] = useState<boolean>(true);
  const [backupRetentionCount, setBackupRetentionCount] = useState<string>('');
  const [backupRetentionDays, setBackupRetentionDays] = useState<string>('');
  const [backupCompress, setBackupCompress] = useState<boolean>(false);
  const [backupOracleDirectory, setBackupOracleDirectory] = useState<string>('');
  const [useCustomBackupCommand, setUseCustomBackupCommand] = useState<boolean>(false);
  const [customBackupCommand, setCustomBackupCommand] = useState<string>('');
  const [showPasswordInCommandPreview, setShowPasswordInCommandPreview] = useState<boolean>(false);
  const [commandCopied, setCommandCopied] = useState<boolean>(false);
  const [drillCron, setDrillCron] = useState<string>('');
  const [drillScheduleEnabled, setDrillScheduleEnabled] = useState<boolean>(true);
  const [drillScratchConnectionId, setDrillScratchConnectionId] = useState<string>('');
  const [scratchConnectionId, setScratchConnectionId] = useState<string>('');

  // Preview formatado em tempo real do comando de backup
  const previewBackupCommandResolved = useMemo(
    () =>
      resolveBackupCommandPreview(activeConnection, {
        backupFolder,
        backupCompress,
        backupOracleDirectory,
        useCustomBackupCommand,
        customBackupCommand,
        showPassword: showPasswordInCommandPreview
      }),
    [activeConnection, backupFolder, backupCompress, backupOracleDirectory, useCustomBackupCommand, customBackupCommand, showPasswordInCommandPreview]
  );

  const copyCommandPreview = useCallback(() => {
    navigator.clipboard.writeText(previewBackupCommandResolved);
    setCommandCopied(true);
    setTimeout(() => setCommandCopied(false), 2000);
  }, [previewBackupCommandResolved]);

  /** Preenche o formulário a partir da config salva da conexão ao abrir o modal. */
  const resetFormFromSettings = useCallback(
    (connection: DatabaseConnectionConfig, settings: AppSettings | null): string => {
      const saved = settings?.backupConfigs?.find((b) => b.connectionId === connection.id);
      const folder = saved?.destinationFolder || '';
      setBackupFolder(folder);
      setBackupCron(saved?.cronExpression || '');
      setBackupScheduleEnabled(saved?.enabled !== false);
      setBackupRetentionCount(saved?.retentionCount !== undefined ? String(saved.retentionCount) : '');
      setBackupRetentionDays(saved?.retentionDays !== undefined ? String(saved.retentionDays) : '');
      setBackupCompress(Boolean(saved?.compress));
      setBackupOracleDirectory(saved?.oracleDirectory || 'DATA_PUMP_DIR');
      setUseCustomBackupCommand(Boolean(saved?.useCustomCommand));

      setCustomBackupCommand(saved?.customCommand || getDefaultBackupCommandTemplate(connection.type));
      setBackupActiveTab('backup');
      setShowPasswordInCommandPreview(false);
      setCommandCopied(false);
      setDrillCron(saved?.restoreDrillCronExpression || '');
      setDrillScheduleEnabled(saved?.restoreDrillEnabled !== false);
      setDrillScratchConnectionId(saved?.restoreDrillScratchConnectionId || '');
      setScratchConnectionId('');
      return folder;
    },
    []
  );

  return {
    backupActiveTab,
    setBackupActiveTab,
    backupFolder,
    setBackupFolder,
    backupCron,
    setBackupCron,
    backupScheduleEnabled,
    setBackupScheduleEnabled,
    backupRetentionCount,
    setBackupRetentionCount,
    backupRetentionDays,
    setBackupRetentionDays,
    backupCompress,
    setBackupCompress,
    backupOracleDirectory,
    setBackupOracleDirectory,
    useCustomBackupCommand,
    setUseCustomBackupCommand,
    customBackupCommand,
    setCustomBackupCommand,
    showPasswordInCommandPreview,
    setShowPasswordInCommandPreview,
    commandCopied,
    drillCron,
    setDrillCron,
    drillScheduleEnabled,
    setDrillScheduleEnabled,
    drillScratchConnectionId,
    setDrillScratchConnectionId,
    scratchConnectionId,
    setScratchConnectionId,
    previewBackupCommandResolved,
    copyCommandPreview,
    resetFormFromSettings
  };
}

export type BackupFormState = ReturnType<typeof useBackupForm>;
