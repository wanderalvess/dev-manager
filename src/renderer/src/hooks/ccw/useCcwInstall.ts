import React, { useState } from 'react';
import type { RoutineDownloadResult } from '../../../../shared/types';
import { normalizeRoutineTarget, buildCcwDownloadUrl } from '../../../../shared/ccwRoutineCommon';
import { getPathBaseName } from '../../utils/ccwModalUtils';

interface UseCcwInstallParams {
  onSuccess: () => void;
  setResult: (r: RoutineDownloadResult | null) => void;
  setErrorMsg: (m: string | null) => void;
}

/** Estado e ações das abas "Download CCW" e "Arquivo Local". */
export function useCcwInstall({ onSuccess, setResult, setErrorMsg }: UseCcwInstallParams) {
  // Aba 1: Download Direto
  const [routineInput, setRoutineInput] = useState<string>('');
  const [winthorVersion, setWinthorVersion] = useState<string>('30');
  const [targetModule, setTargetModule] = useState<string>('');
  const [backupExisting, setBackupExisting] = useState<boolean>(true);
  const [customDownloadUrl, setCustomDownloadUrl] = useState<string>('');

  // Aba 2: Arquivo Local
  const [localFilePath, setLocalFilePath] = useState<string>('');
  const [localRoutineName, setLocalRoutineName] = useState<string>('');
  const [localTargetModule, setLocalTargetModule] = useState<string>('');
  const [localBackup, setLocalBackup] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const normalized = normalizeRoutineTarget(routineInput);
  const estimatedDownloadUrl = normalized.baseName
    ? buildCcwDownloadUrl(undefined, normalized.baseName, winthorVersion)
    : '';

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routineInput.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    setResult(null);

    try {
      if (window.electronAPI?.downloadCcwRoutine) {
        const res = await window.electronAPI.downloadCcwRoutine({
          routineCodeOrName: routineInput.trim(),
          winthorVersion: winthorVersion.trim() || '30',
          targetModule: targetModule.trim() || undefined,
          backupExisting,
          customDownloadUrl: customDownloadUrl.trim() || undefined
        });

        if (res.success) {
          setResult(res);
          onSuccess();
        } else {
          setErrorMsg(res.message || res.error || 'Falha ao baixar rotina.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro inesperado durante o download.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectLocalFile = async () => {
    if (!window.electronAPI?.selectFile) return;
    try {
      const file = await window.electronAPI.selectFile({
        filters: [{ name: 'Rotinas WinThor (.EXE, .ZIP)', extensions: ['exe', 'zip'] }]
      });
      if (file) {
        setLocalFilePath(file);
        const norm = normalizeRoutineTarget(getPathBaseName(file));
        if (norm.baseName) {
          setLocalRoutineName(norm.baseName);
        }
      }
    } catch (err: any) {
      console.warn('Erro ao selecionar arquivo:', err);
    }
  };

  const handleInstallLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localFilePath.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    setResult(null);

    try {
      if (window.electronAPI?.installLocalRoutineFile) {
        const res = await window.electronAPI.installLocalRoutineFile(
          localFilePath.trim(),
          localRoutineName.trim() || undefined,
          localTargetModule.trim() || undefined,
          localBackup
        );

        if (res.success) {
          setResult(res);
          onSuccess();
        } else {
          setErrorMsg(res.message || res.error || 'Falha ao instalar arquivo local.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro inesperado ao instalar arquivo local.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    routineInput,
    setRoutineInput,
    winthorVersion,
    setWinthorVersion,
    targetModule,
    setTargetModule,
    backupExisting,
    setBackupExisting,
    customDownloadUrl,
    setCustomDownloadUrl,
    localFilePath,
    localRoutineName,
    setLocalRoutineName,
    localTargetModule,
    setLocalTargetModule,
    localBackup,
    setLocalBackup,
    isSubmitting,
    normalized,
    estimatedDownloadUrl,
    handleDownload,
    handleSelectLocalFile,
    handleInstallLocal
  };
}
