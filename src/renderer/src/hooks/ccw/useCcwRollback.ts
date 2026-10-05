import { useState, useCallback } from 'react';
import type { RoutineBackupEntry } from '../../../../shared/types';
import { getBackupPath, getRestoredVersionSuffix } from '../../utils/ccwModalUtils';

interface UseCcwRollbackParams {
  initialRoutineName: string;
  onSuccess: () => void;
  setErrorMsg: (m: string | null) => void;
}

/** Estado e ações da aba "Histórico & Rollback" (.bak). */
export function useCcwRollback({ initialRoutineName, onSuccess, setErrorMsg }: UseCcwRollbackParams) {
  const [rollbackRoutine, setRollbackRoutine] = useState<string>(initialRoutineName || '');
  const [backups, setBackups] = useState<RoutineBackupEntry[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState<boolean>(false);
  const [restoringBackupPath, setRestoringBackupPath] = useState<string | null>(null);
  const [deletingBackupPath, setDeletingBackupPath] = useState<string | null>(null);
  const [confirmingRestorePath, setConfirmingRestorePath] = useState<string | null>(null);
  const [confirmingDeletePath, setConfirmingDeletePath] = useState<string | null>(null);
  const [rollbackSuccessMsg, setRollbackSuccessMsg] = useState<string | null>(null);

  const fetchBackups = useCallback(async (routineNameOrCode: string) => {
    if (!routineNameOrCode.trim() || !window.electronAPI?.listRoutineBackups) {
      setBackups([]);
      return;
    }
    setIsLoadingBackups(true);
    setRollbackSuccessMsg(null);
    setConfirmingRestorePath(null);
    setConfirmingDeletePath(null);
    try {
      const items = await window.electronAPI.listRoutineBackups(routineNameOrCode.trim());
      setBackups(items || []);
    } catch (err: any) {
      console.warn('Erro ao listar backups:', err);
      setBackups([]);
    } finally {
      setIsLoadingBackups(false);
    }
  }, []);

  const handleRestoreBackup = async (entry: RoutineBackupEntry) => {
    if (!window.electronAPI?.restoreRoutineBackup) return;
    const backupPath = getBackupPath(entry);
    const targetPath = entry.targetRoutinePath;
    if (!backupPath || !targetPath) return;

    // Primeiro clique só pede confirmação; o segundo executa.
    if (confirmingRestorePath !== backupPath) {
      setConfirmingRestorePath(backupPath);
      setConfirmingDeletePath(null);
      return;
    }

    setConfirmingRestorePath(null);
    setRestoringBackupPath(backupPath);
    setRollbackSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await window.electronAPI.restoreRoutineBackup(backupPath, targetPath);
      if (res.success) {
        const verStr = getRestoredVersionSuffix(res.restoredVersion);
        setRollbackSuccessMsg(`Versão restaurada com sucesso${verStr}! Cópia pré-rollback salva como segurança.`);
        onSuccess();
        await fetchBackups(rollbackRoutine);
      } else {
        setErrorMsg(res.message || 'Falha ao restaurar versão do backup.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro inesperado ao restaurar backup.');
    } finally {
      setRestoringBackupPath(null);
    }
  };

  const handleDeleteBackup = async (entry: RoutineBackupEntry) => {
    if (!window.electronAPI?.deleteRoutineBackup) return;
    const backupPath = getBackupPath(entry);
    if (!backupPath) return;

    if (confirmingDeletePath !== backupPath) {
      setConfirmingDeletePath(backupPath);
      setConfirmingRestorePath(null);
      return;
    }

    setConfirmingDeletePath(null);
    setDeletingBackupPath(backupPath);
    try {
      const res = await window.electronAPI.deleteRoutineBackup(backupPath);
      if (res.success) {
        await fetchBackups(rollbackRoutine);
      } else {
        setErrorMsg(res.error || 'Falha ao excluir backup.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao excluir backup.');
    } finally {
      setDeletingBackupPath(null);
    }
  };

  return {
    rollbackRoutine,
    setRollbackRoutine,
    backups,
    isLoadingBackups,
    restoringBackupPath,
    deletingBackupPath,
    confirmingRestorePath,
    setConfirmingRestorePath,
    confirmingDeletePath,
    setConfirmingDeletePath,
    rollbackSuccessMsg,
    setRollbackSuccessMsg,
    fetchBackups,
    handleRestoreBackup,
    handleDeleteBackup
  };
}
