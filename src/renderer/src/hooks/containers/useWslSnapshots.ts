import { useState, useCallback } from 'react';
import type { WslSnapshotFileInfo } from '../../../../shared/types';
import type { DockerDataState } from './useDockerData';

type SnapshotFeedback = { success: boolean; message: string } | null;

/** Modal de snapshots WSL (.tar): listar, importar, exportar e desregistrar distros. */
export function useWslSnapshots(data: DockerDataState) {
  const { loadDockerData } = data;

  const [isSnapshotsModalOpen, setIsSnapshotsModalOpen] = useState<boolean>(false);
  const [snapshotsList, setSnapshotsList] = useState<WslSnapshotFileInfo[]>([]);
  const [snapshotsDirInput, setSnapshotsDirInput] = useState<string>('');
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState<boolean>(false);
  const [snapshotImporting, setSnapshotImporting] = useState<boolean>(false);
  const [snapshotExporting, setSnapshotExporting] = useState<boolean>(false);
  const [snapshotUnregistering, setSnapshotUnregistering] = useState<string | null>(null);
  const [snapshotFeedback, setSnapshotFeedback] = useState<SnapshotFeedback>(null);

  const loadSnapshots = useCallback(
    async (dir?: string) => {
      if (!window.electronAPI?.listWslSnapshots) return;
      setIsLoadingSnapshots(true);
      try {
        if (window.electronAPI.getWslSnapshotsDir && !snapshotsDirInput) {
          const savedDir = await window.electronAPI.getWslSnapshotsDir();
          if (savedDir) setSnapshotsDirInput(savedDir);
        }
        const list = await window.electronAPI.listWslSnapshots(dir || snapshotsDirInput || undefined);
        setSnapshotsList(list || []);
      } catch {
        setSnapshotsList([]);
      } finally {
        setIsLoadingSnapshots(false);
      }
    },
    [snapshotsDirInput]
  );

  const openSnapshotsModal = () => {
    setIsSnapshotsModalOpen(true);
    loadSnapshots();
  };

  const handleSaveSnapshotsDir = async (dir: string) => {
    if (!dir.trim() || !window.electronAPI?.setWslSnapshotsDir) return;
    try {
      await window.electronAPI.setWslSnapshotsDir(dir.trim());
      setSnapshotsDirInput(dir.trim());
      await loadSnapshots(dir.trim());
    } catch (err: any) {
      setSnapshotFeedback({ success: false, message: `Erro ao salvar diretório: ${err?.message || err}` });
    }
  };

  const handleImportSnapshot = async (params: { distroName: string; installDir: string; tarPath: string }) => {
    if (!params.distroName || !params.tarPath || !window.electronAPI?.importWslSnapshot) return;
    setSnapshotImporting(true);
    setSnapshotFeedback(null);
    try {
      const res = await window.electronAPI.importWslSnapshot({
        distroName: params.distroName,
        installDir: params.installDir || `C:\\WSL\\${params.distroName}`,
        tarPath: params.tarPath
      });
      setSnapshotFeedback({ success: res.success, message: res.message || res.error || '' });
      if (res.success) {
        await loadDockerData();
      }
    } catch (err: any) {
      setSnapshotFeedback({ success: false, message: err?.message || String(err) });
    } finally {
      setSnapshotImporting(false);
    }
  };

  const handleExportSnapshot = async (params: { distroName: string; exportPath: string }) => {
    if (!params.distroName || !params.exportPath || !window.electronAPI?.exportWslSnapshot) return;
    setSnapshotExporting(true);
    setSnapshotFeedback(null);
    try {
      const res = await window.electronAPI.exportWslSnapshot({
        distroName: params.distroName,
        outputPath: params.exportPath
      });
      setSnapshotFeedback({ success: res.success, message: res.message || res.error || '' });
      if (res.success) {
        await loadSnapshots();
      }
    } catch (err: any) {
      setSnapshotFeedback({ success: false, message: err?.message || String(err) });
    } finally {
      setSnapshotExporting(false);
    }
  };

  const handleUnregisterDistro = async (distroName: string) => {
    if (!distroName || !window.electronAPI?.unregisterWslDistro) return;
    setSnapshotUnregistering(distroName);
    setSnapshotFeedback(null);
    try {
      const res = await window.electronAPI.unregisterWslDistro(distroName);
      setSnapshotFeedback({ success: res.success, message: res.message || res.error || '' });
      if (res.success) {
        await loadDockerData();
      }
    } catch (err: any) {
      setSnapshotFeedback({ success: false, message: err?.message || String(err) });
    } finally {
      setSnapshotUnregistering(null);
    }
  };

  return {
    isSnapshotsModalOpen,
    closeSnapshotsModal: () => setIsSnapshotsModalOpen(false),
    openSnapshotsModal,
    snapshotsList,
    snapshotsDirInput,
    setSnapshotsDirInput,
    isLoadingSnapshots,
    snapshotImporting,
    snapshotExporting,
    snapshotUnregistering,
    snapshotFeedback,
    setSnapshotFeedback,
    loadSnapshots,
    handleSaveSnapshotsDir,
    handleImportSnapshot,
    handleExportSnapshot,
    handleUnregisterDistro
  };
}

export type WslSnapshotsState = ReturnType<typeof useWslSnapshots>;
