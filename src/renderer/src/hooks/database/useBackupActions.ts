import { useCallback, useRef, useState } from 'react';
import type {
  AppSettings,
  BackupConfig,
  BackupFileInfo,
  BackupResult,
  DatabaseConnectionConfig
} from '../../../../shared/types';
import { parseOptionalNumber, upsertBackupConfig } from '../../utils/backupModalUtils';
import type { BackupFormState } from './useBackupForm';
import { requestConfirm } from '../../components/ui/confirmService';

interface UseBackupActionsParams {
  activeConnection: DatabaseConnectionConfig | null;
  connections: DatabaseConnectionConfig[];
  form: BackupFormState;
  refreshBackupFiles: (folder: string) => Promise<void>;
  refreshBackupHistory: (connectionId: string) => Promise<void>;
  onSettingsUpdate?: (updater: (prev: AppSettings | null) => AppSettings | null) => void;
}

/** Execução de backup, salvamento de agendamento, restauração e restore drill. */
export function useBackupActions({
  activeConnection,
  connections,
  form,
  refreshBackupFiles,
  refreshBackupHistory,
  onSettingsUpdate
}: UseBackupActionsParams) {
  // Backup em andamento é da conexão que o iniciou: trocar de conexão no meio não trava nem
  // mistura a outra (o resultado de A não aparece em B, nem os arquivos e o histórico de A).
  const [runningBackupConnectionId, setRunningBackupConnectionId] = useState<string | null>(null);
  const isRunningBackup = runningBackupConnectionId !== null && runningBackupConnectionId === activeConnection?.id;
  const activeConnectionIdRef = useRef(activeConnection?.id);
  activeConnectionIdRef.current = activeConnection?.id;
  const isStillActive = (connectionId: string) => activeConnectionIdRef.current === connectionId;
  const [backupResult, setBackupResult] = useState<BackupResult | null>(null);
  const [isSavingSchedule, setIsSavingSchedule] = useState<boolean>(false);
  const [scheduleSaveResult, setScheduleSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const [restoringFilePath, setRestoringFilePath] = useState<string | null>(null);
  const [restoreResult, setRestoreResult] = useState<BackupResult | null>(null);
  const [drillingFilePath, setDrillingFilePath] = useState<string | null>(null);
  const [drillResult, setDrillResult] = useState<BackupResult | null>(null);

  const {
    backupFolder,
    setBackupFolder,
    backupCron,
    backupScheduleEnabled,
    backupRetentionCount,
    backupRetentionDays,
    backupCompress,
    backupOracleDirectory,
    useCustomBackupCommand,
    customBackupCommand,
    drillCron,
    drillScheduleEnabled,
    drillScratchConnectionId,
    scratchConnectionId
  } = form;

  const resetResults = useCallback(() => {
    setBackupResult(null);
    setScheduleSaveResult(null);
    setRestoreResult(null);
    setDrillResult(null);
  }, []);

  const handleSelectBackupFolder = async () => {
    if (!window.electronAPI?.selectDirectory) return;
    const picked = await window.electronAPI.selectDirectory(backupFolder || undefined);
    if (picked) {
      setBackupFolder(picked);
      refreshBackupFiles(picked);
    }
  };

  const handleRunBackup = async () => {
    if (!activeConnection || !backupFolder.trim() || !window.electronAPI?.runDbBackup) return;
    const connectionId = activeConnection.id;
    setRunningBackupConnectionId(connectionId);
    setBackupResult(null);
    try {
      const res = await window.electronAPI.runDbBackup(
        activeConnection,
        backupFolder.trim(),
        activeConnection.type === 'oracle' ? backupOracleDirectory.trim() || undefined : undefined,
        backupCompress,
        useCustomBackupCommand,
        useCustomBackupCommand ? customBackupCommand.trim() : undefined
      );
      if (isStillActive(connectionId)) setBackupResult(res);
      onSettingsUpdate?.((prev) => {
        if (!prev) return prev;
        const existing = prev.backupConfigs || [];
        const previous = existing.find((b) => b.connectionId === activeConnection.id);
        const entry: BackupConfig = {
          ...previous,
          connectionId: activeConnection.id,
          destinationFolder: backupFolder.trim(),
          oracleDirectory: activeConnection.type === 'oracle' ? backupOracleDirectory.trim() || undefined : previous?.oracleDirectory,
          compress: backupCompress,
          useCustomCommand: useCustomBackupCommand,
          customCommand: customBackupCommand.trim() || undefined,
          lastRunAt: new Date().toISOString(),
          lastSuccess: res.success,
          lastMessage: res.message
        };
        return { ...prev, backupConfigs: upsertBackupConfig(existing, entry) };
      });
      if (isStillActive(connectionId)) {
        if (res.success) refreshBackupFiles(backupFolder.trim());
        refreshBackupHistory(connectionId);
      }
    } catch (err: any) {
      if (isStillActive(connectionId)) {
        setBackupResult({ success: false, message: err?.message || 'Erro inesperado ao executar backup.' });
      }
    } finally {
      setRunningBackupConnectionId((current) => (current === connectionId ? null : current));
    }
  };

  const handleSaveBackupSchedule = async () => {
    if (!activeConnection || !backupFolder.trim() || !window.electronAPI?.saveDbBackupConfig) return;
    setIsSavingSchedule(true);
    setScheduleSaveResult(null);
    try {
      const config: BackupConfig = {
        connectionId: activeConnection.id,
        destinationFolder: backupFolder.trim(),
        cronExpression: backupCron.trim() || undefined,
        enabled: backupScheduleEnabled,
        retentionCount: parseOptionalNumber(backupRetentionCount),
        retentionDays: parseOptionalNumber(backupRetentionDays),
        compress: backupCompress,
        oracleDirectory: activeConnection.type === 'oracle' ? backupOracleDirectory.trim() || undefined : undefined,
        useCustomCommand: useCustomBackupCommand,
        customCommand: customBackupCommand.trim() || undefined,
        restoreDrillCronExpression: drillCron.trim() || undefined,
        restoreDrillEnabled: drillScheduleEnabled,
        restoreDrillScratchConnectionId: drillScratchConnectionId || undefined
      };
      const res = await window.electronAPI.saveDbBackupConfig(config);
      setScheduleSaveResult(res);
      if (res.success) {
        onSettingsUpdate?.((prev) => {
          if (!prev) return prev;
          const existing = prev.backupConfigs || [];
          const previous = existing.find((b) => b.connectionId === activeConnection.id);
          const merged = { ...previous, ...config };
          return { ...prev, backupConfigs: upsertBackupConfig(existing, merged) };
        });
      }
    } catch (err: any) {
      setScheduleSaveResult({ success: false, message: err?.message || 'Erro inesperado ao salvar agendamento.' });
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleRestoreBackup = async (file: BackupFileInfo) => {
    if (!activeConnection || !window.electronAPI?.restoreDbBackup) return;

    const confirmed = await requestConfirm({
      title: 'Restaurar backup?',
      message:
        `Restaurar "${file.fileName}" na conexão "${activeConnection.name}"?\n\n` +
        'Isso executa o backup contra o banco de dados AGORA e pode sobrescrever ou duplicar dados existentes. Essa ação não pode ser desfeita pelo Hub Manager.',
      confirmLabel: 'Restaurar',
      tone: 'danger'
    });
    if (!confirmed) return;

    const connectionId = activeConnection.id;
    setRestoringFilePath(file.filePath);
    setRestoreResult(null);
    try {
      const res = await window.electronAPI.restoreDbBackup(activeConnection, file.filePath);
      if (isStillActive(connectionId)) {
        setRestoreResult(res);
        refreshBackupHistory(connectionId);
      }
    } catch (err: any) {
      if (isStillActive(connectionId)) {
        setRestoreResult({ success: false, message: err?.message || 'Erro inesperado ao restaurar backup.' });
      }
    } finally {
      setRestoringFilePath(null);
    }
  };

  const handleRunRestoreDrill = async (file: BackupFileInfo) => {
    if (!activeConnection || !scratchConnectionId || !window.electronAPI?.runDbRestoreDrill) return;
    const scratchConnection = connections.find((c) => c.id === scratchConnectionId);
    if (!scratchConnection || scratchConnection.id === activeConnection.id) return;
    const connectionId = activeConnection.id;

    const confirmed = await requestConfirm({
      title: 'Testar restauração?',
      message:
        `Restaurar "${file.fileName}" na conexão "${scratchConnection.name}" como teste de integridade?\n\n` +
        'Use apenas uma conexão descartável aqui — essa restauração sobrescreve dados na conexão escolhida.',
      confirmLabel: 'Restaurar para testar',
      tone: 'warning'
    });
    if (!confirmed) return;

    setDrillingFilePath(file.filePath);
    setDrillResult(null);
    try {
      // A conexão ativa é a origem do backup: o main recusa o drill sobre ela e grava o resultado no histórico dela.
      const res = await window.electronAPI.runDbRestoreDrill(scratchConnection, file.filePath, connectionId);
      if (isStillActive(connectionId)) {
        setDrillResult(res);
        refreshBackupHistory(connectionId);
      }
    } catch (err: any) {
      if (isStillActive(connectionId)) {
        setDrillResult({ success: false, message: err?.message || 'Erro inesperado ao testar restauração.' });
      }
    } finally {
      setDrillingFilePath(null);
    }
  };

  return {
    isRunningBackup,
    backupResult,
    isSavingSchedule,
    scheduleSaveResult,
    restoringFilePath,
    restoreResult,
    drillingFilePath,
    drillResult,
    resetResults,
    handleSelectBackupFolder,
    handleRunBackup,
    handleSaveBackupSchedule,
    handleRestoreBackup,
    handleRunRestoreDrill
  };
}
