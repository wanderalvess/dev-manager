import { useEffect, useState } from 'react';
import type {
  DocSyncProgress,
  DocSyncResult,
  DocSyncTargetConfig
} from '../../../../shared/types';

interface UseDocsSyncParams {
  syncTargets: DocSyncTargetConfig[];
  setSyncTargets: (targets: DocSyncTargetConfig[]) => void;
  /** Recarrega as configurações para refletir os timestamps de último envio. */
  reloadSettings: () => Promise<void>;
}

/** Estado e ações da sincronização de documentação com destinos de API externos. */
export function useDocsSync({ syncTargets, setSyncTargets, reloadSettings }: UseDocsSyncParams) {
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<DocSyncProgress | null>(null);
  const [syncResults, setSyncResults] = useState<DocSyncResult[] | null>(null);
  const [editingTarget, setEditingTarget] = useState<Partial<DocSyncTargetConfig> | null>(null);

  useEffect(() => {
    const unsubSync = window.electronAPI?.onDocSyncProgress?.(setSyncProgress);
    return () => {
      unsubSync?.();
    };
  }, []);

  const closeSyncModal = () => {
    setShowSyncModal(false);
    setEditingTarget(null);
    setSyncResults(null);
  };

  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTarget?.name || !editingTarget?.endpointUrl) return;

    const targetToSave: DocSyncTargetConfig = {
      id: editingTarget.id || `sync_${Date.now()}`,
      name: editingTarget.name.trim(),
      endpointUrl: editingTarget.endpointUrl.trim(),
      method: editingTarget.method || 'PUT',
      authHeader: editingTarget.authHeader?.trim() || 'X-Api-Key',
      authValue: editingTarget.authValue?.trim() || '',
      batchSize: Number(editingTarget.batchSize) || 50,
      syncMode: editingTarget.syncMode || 'all',
      enabled: editingTarget.enabled !== undefined ? editingTarget.enabled : true,
      lastSyncedAt: editingTarget.lastSyncedAt
    };

    const updated = editingTarget.id
      ? syncTargets.map((t) => (t.id === editingTarget.id ? targetToSave : t))
      : [...syncTargets, targetToSave];

    setSyncTargets(updated);
    await window.electronAPI?.saveSettings({ docSyncTargets: updated });
    setEditingTarget(null);
  };

  const handleDeleteTarget = async (id: string) => {
    const updated = syncTargets.filter((t) => t.id !== id);
    setSyncTargets(updated);
    await window.electronAPI?.saveSettings({ docSyncTargets: updated });
    if (editingTarget?.id === id) {
      setEditingTarget(null);
    }
  };

  const handleToggleTargetEnabled = async (target: DocSyncTargetConfig, enabled: boolean) => {
    const updated = syncTargets.map((t) => (t.id === target.id ? { ...t, enabled } : t));
    setSyncTargets(updated);
    await window.electronAPI?.saveSettings({ docSyncTargets: updated });
  };

  const handleSyncNow = async (targetId?: string) => {
    if (!window.electronAPI) return;
    setIsSyncing(true);
    setSyncProgress(null);
    setSyncResults(null);
    try {
      const res = await window.electronAPI.syncDocs(targetId);
      setSyncResults(res);
      await reloadSettings();
    } catch (err: any) {
      setSyncResults([
        {
          success: false,
          targetId: targetId || 'error',
          targetName: 'Erro de Execução',
          totalChunksSent: 0,
          totalBatches: 0,
          error: err?.message || 'Falha ao executar sincronização.'
        }
      ]);
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    showSyncModal,
    setShowSyncModal,
    closeSyncModal,
    isSyncing,
    syncProgress,
    syncResults,
    editingTarget,
    setEditingTarget,
    handleSaveTarget,
    handleDeleteTarget,
    handleToggleTargetEnabled,
    handleSyncNow
  };
}
