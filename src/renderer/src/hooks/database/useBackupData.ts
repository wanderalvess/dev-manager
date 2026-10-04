import { useCallback, useState } from 'react';
import type { BackupFileInfo, BackupHistoryEntry } from '../../../../shared/types';

/** Arquivos existentes na pasta de destino e histórico persistido de backups da conexão. */
export function useBackupData() {
  const [backupFiles, setBackupFiles] = useState<BackupFileInfo[]>([]);
  const [isLoadingBackupFiles, setIsLoadingBackupFiles] = useState<boolean>(false);
  const [backupHistory, setBackupHistory] = useState<BackupHistoryEntry[]>([]);
  const [isLoadingBackupHistory, setIsLoadingBackupHistory] = useState<boolean>(false);

  // Carregar arquivos de backup já existentes na pasta de destino
  const refreshBackupFiles = useCallback(async (folder: string) => {
    if (!folder || !window.electronAPI?.listDbBackups) {
      setBackupFiles([]);
      return;
    }
    setIsLoadingBackupFiles(true);
    try {
      const files = await window.electronAPI.listDbBackups(folder);
      setBackupFiles(files || []);
    } catch (err) {
      console.error('Erro ao listar backups:', err);
    } finally {
      setIsLoadingBackupFiles(false);
    }
  }, []);

  // Carregar histórico persistido de backups/restaurações da conexão ativa
  const refreshBackupHistory = useCallback(async (connectionId: string) => {
    if (!window.electronAPI?.listDbBackupHistory) {
      setBackupHistory([]);
      return;
    }
    setIsLoadingBackupHistory(true);
    try {
      const history = await window.electronAPI.listDbBackupHistory(connectionId);
      setBackupHistory(history || []);
    } catch (err) {
      console.error('Erro ao carregar histórico de backups:', err);
    } finally {
      setIsLoadingBackupHistory(false);
    }
  }, []);

  const clearBackupFiles = useCallback(() => setBackupFiles([]), []);

  return {
    backupFiles,
    isLoadingBackupFiles,
    backupHistory,
    isLoadingBackupHistory,
    refreshBackupFiles,
    refreshBackupHistory,
    clearBackupFiles
  };
}
