import React from 'react';
import { Webhook, Plus, Edit2, Trash2, RotateCw } from 'lucide-react';
import type { BackupWebhookConfig } from '../../../../../shared/types';
import { webhookPlatformBadgeClass } from '../../../utils/backupModalUtils';
import { BackupWebhookForm } from './BackupWebhookForm';

interface BackupWebhooksTabProps {
  backupWebhooks: BackupWebhookConfig[];
  editingWebhook: Partial<BackupWebhookConfig> | null;
  setEditingWebhook: (webhook: Partial<BackupWebhookConfig> | null) => void;
  isTestingWebhookId: string | null;
  webhookTestResults: Record<string, { success: boolean; message: string }>;
  onSave: (e: React.FormEvent) => void;
  onDelete: (id: string) => void;
  onToggleEnabled: (webhook: BackupWebhookConfig, enabled: boolean) => void;
  onTest: (webhook: BackupWebhookConfig) => void;
}

export const BackupWebhooksTab: React.FC<BackupWebhooksTabProps> = ({
  backupWebhooks,
  editingWebhook,
  setEditingWebhook,
  isTestingWebhookId,
  webhookTestResults,
  onSave,
  onDelete,
  onToggleEnabled,
  onTest
}) => (
  <div className="space-y-4 animate-fade-in">
    <div className="flex items-center justify-between p-3.5 bg-muted/40 border border-border/70 rounded-xl">
      <div>
        <span className="font-bold text-foreground text-xs">Webhooks de Notificação</span>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Disparados ao concluir backups, restaurações ou drills (manual ou agendado).
        </p>
      </div>
      <button
        type="button"
        onClick={() => setEditingWebhook({ method: 'POST', enabled: true })}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/90 transition shadow-2xs cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" /> Novo Webhook
      </button>
    </div>

    {backupWebhooks.length === 0 && !editingWebhook && (
      <div className="text-center py-10 text-muted-foreground bg-muted/20 border border-border/60 rounded-xl space-y-1">
        <Webhook className="w-8 h-8 mx-auto opacity-40 text-muted-foreground mb-2" />
        <p className="font-semibold text-xs text-foreground">Nenhum webhook configurado</p>
        <p className="text-[11px]">Configure canais no Slack, Discord, Microsoft Teams ou HTTP genérico.</p>
      </div>
    )}

    <div className="space-y-2">
      {backupWebhooks.map((w) => (
        <div key={w.id} className="p-3.5 bg-background/70 border border-border/70 rounded-xl space-y-2 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={w.enabled}
                    onChange={(e) => onToggleEnabled(w, e.target.checked)}
                    className="text-primary focus:ring-0 rounded"
                  />
                </label>
                <span className="font-bold text-xs text-foreground truncate">{w.name}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-muted border border-border/60 text-muted-foreground shrink-0">
                  {w.method || 'POST'}
                </span>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase font-bold shrink-0 ${webhookPlatformBadgeClass(w.platform)}`}
                >
                  {w.platform || 'generic'}
                </span>
              </div>
              <div className="font-mono text-[10px] text-muted-foreground truncate mt-1" title={w.endpointUrl}>
                {w.endpointUrl}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onTest(w)}
                disabled={isTestingWebhookId === w.id}
                className="px-2.5 py-1 bg-muted hover:bg-muted/80 text-foreground rounded-md text-xs font-semibold transition disabled:opacity-50 border border-border/60 shadow-2xs cursor-pointer"
                title="Enviar payload de teste"
              >
                {isTestingWebhookId === w.id ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  'Testar'
                )}
              </button>
              <button
                type="button"
                onClick={() => setEditingWebhook(w)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                title="Editar"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(w.id)}
                className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition cursor-pointer"
                title="Remover"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {webhookTestResults[w.id] && (
            <div
              className={`text-[10px] px-2.5 py-1.5 rounded-lg border ${
                webhookTestResults[w.id].success
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
              }`}
            >
              {webhookTestResults[w.id].message}
            </div>
          )}
        </div>
      ))}
    </div>

    {editingWebhook && (
      <BackupWebhookForm
        editingWebhook={editingWebhook}
        onChange={setEditingWebhook}
        onCancel={() => setEditingWebhook(null)}
        onSubmit={onSave}
      />
    )}
  </div>
);
