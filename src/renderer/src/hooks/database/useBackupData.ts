import { useCallback, useRef, useState } from 'react';
import type { BackupFileInfo, BackupHistoryEntry } from '../../../../shared/types';

/** Arquivos existentes na pasta de destino e histórico persistido de backups da conexão. */
export function useBackupData() {
  const [backupFiles, setBackupFiles] = useState<BackupFileInfo[]>([]);
  const [isLoadingBackupFiles, setIsLoadingBackupFiles] = useState<boolean>(false);
  const [backupHistory, setBackupHistory] = useState<BackupHistoryEntry[]>([]);
  const [isLoadingBackupHistory, setIsLoadingBackupHistory] = useState<boolean>(false);
  // Só a resposta do pedido mais recente vale: trocando de conexão rápido, a da anterior pode chegar por último.
  const filesRequest = useRef(0);
  const historyRequest = useRef(0);

  // Carregar arquivos de backup já existentes na pasta de destino
  const refreshBackupFiles = useCallback(async (folder: string) => {
    const request = ++filesRequest.current;
    if (!folder || !window.electronAPI?.listDbBackups) {
      setBackupFiles([]);
      return;
    }
    setIsLoadingBackupFiles(true);
    try {
      const files = await window.electronAPI.listDbBackups(folder);
      if (request === filesRequest.current) setBackupFiles(files || []);
    } catch (err) {
      console.error('Erro ao listar backups:', err);
    } finally {
      if (request === filesRequest.current) setIsLoadingBackupFiles(false);
    }
  }, []);

  // Carregar histórico persistido de backups/restaurações da conexão ativa
  const refreshBackupHistory = useCallback(async (connectionId: string) => {
    const request = ++historyRequest.current;
    if (!window.electronAPI?.listDbBackupHistory) {
      setBackupHistory([]);
      return;
    }
    setIsLoadingBackupHistory(true);
    try {
      const history = await window.electronAPI.listDbBackupHistory(connectionId);
      if (request === historyRequest.current) setBackupHistory(history || []);
    } catch (err) {
      console.error('Erro ao carregar histórico de backups:', err);
    } finally {
      if (request === historyRequest.current) setIsLoadingBackupHistory(false);
    }
  }, []);

  const clearBackupFiles = useCallback(() => {
    filesRequest.current++;
    setBackupFiles([]);
    setIsLoadingBackupFiles(false);
  }, []);

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
