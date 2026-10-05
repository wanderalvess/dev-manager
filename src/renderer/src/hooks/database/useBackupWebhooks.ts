import React, { useCallback, useState } from 'react';
import type { AppSettings, BackupWebhookConfig } from '../../../../shared/types';
import { normalizeWebhook, upsertWebhook } from '../../utils/backupModalUtils';

interface UseBackupWebhooksParams {
  onSettingsUpdate?: (updater: (prev: AppSettings | null) => AppSettings | null) => void;
}

/** CRUD e teste dos webhooks de notificação de backup. */
export function useBackupWebhooks({ onSettingsUpdate }: UseBackupWebhooksParams) {
  const [backupWebhooks, setBackupWebhooks] = useState<BackupWebhookConfig[]>([]);
  const [editingWebhook, setEditingWebhook] = useState<Partial<BackupWebhookConfig> | null>(null);
  const [isTestingWebhookId, setIsTestingWebhookId] = useState<string | null>(null);
  const [webhookTestResults, setWebhookTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  const persistWebhooks = async (updated: BackupWebhookConfig[]) => {
    setBackupWebhooks(updated);
    await window.electronAPI?.saveSettings({ backupWebhooks: updated });
    onSettingsUpdate?.((prev) => (prev ? { ...prev, backupWebhooks: updated } : prev));
  };

  const loadWebhooks = useCallback((webhooks: BackupWebhookConfig[]) => setBackupWebhooks(webhooks), []);

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWebhook?.name || !editingWebhook?.endpointUrl) return;

    const webhookToSave = normalizeWebhook(editingWebhook, Date.now());
    const updated = upsertWebhook(backupWebhooks, webhookToSave, Boolean(editingWebhook.id));

    setBackupWebhooks(updated);
    await window.electronAPI?.saveSettings({ backupWebhooks: updated });
    onSettingsUpdate?.((prev) => (prev ? { ...prev, backupWebhooks: updated } : prev));
    setEditingWebhook(null);
  };

  const handleDeleteWebhook = async (id: string) => {
    const updated = backupWebhooks.filter((w) => w.id !== id);
    await persistWebhooks(updated);
    if (editingWebhook?.id === id) setEditingWebhook(null);
  };

  const handleToggleWebhookEnabled = async (webhook: BackupWebhookConfig, enabled: boolean) => {
    const updated = backupWebhooks.map((w) => (w.id === webhook.id ? { ...w, enabled } : w));
    await persistWebhooks(updated);
  };

  const handleTestWebhook = async (webhook: BackupWebhookConfig) => {
    if (!window.electronAPI?.testBackupWebhook) return;
    setIsTestingWebhookId(webhook.id);
    try {
      const res = await window.electronAPI.testBackupWebhook(webhook);
      setWebhookTestResults((prev) => ({ ...prev, [webhook.id]: res }));
    } catch (err: any) {
      setWebhookTestResults((prev) => ({
        ...prev,
        [webhook.id]: { success: false, message: err?.message || 'Falha ao testar webhook.' }
      }));
    } finally {
      setIsTestingWebhookId(null);
    }
  };

  return {
    backupWebhooks,
    editingWebhook,
    setEditingWebhook,
    isTestingWebhookId,
    webhookTestResults,
    loadWebhooks,
    handleSaveWebhook,
    handleDeleteWebhook,
    handleToggleWebhookEnabled,
    handleTestWebhook
  };
}
