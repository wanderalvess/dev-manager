import React from 'react';
import type { BackupWebhookConfig } from '../../../../../shared/types';
import { toggleWebhookEvent } from '../../../utils/backupModalUtils';

interface BackupWebhookFormProps {
  editingWebhook: Partial<BackupWebhookConfig>;
  onChange: (webhook: Partial<BackupWebhookConfig>) => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const BackupWebhookForm: React.FC<BackupWebhookFormProps> = ({
  editingWebhook,
  onChange,
  onCancel,
  onSubmit
}) => (
  <form onSubmit={onSubmit} className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-foreground">
        {editingWebhook.id ? 'Editar Webhook' : 'Novo Webhook'}
      </span>
      <button
        type="button"
        onClick={onCancel}
        className="text-xs text-muted-foreground hover:text-foreground transition cursor-pointer"
      >
        Cancelar
      </button>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
      <div className="sm:col-span-2 space-y-1">
        <label className="text-2xs font-bold text-foreground">Nome</label>
        <input
          type="text"
          required
          placeholder="Ex: Slack #backups-winthor"
          value={editingWebhook.name || ''}
          onChange={(e) => onChange({ ...editingWebhook, name: e.target.value })}
          className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
        />
      </div>
      <div className="space-y-1">
        <label className="text-2xs font-bold text-foreground">Método</label>
        <select
          value={editingWebhook.method || 'POST'}
          onChange={(e) => onChange({ ...editingWebhook, method: e.target.value as 'POST' | 'PUT' })}
          className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
        >
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
        </select>
      </div>
    </div>

    <div className="space-y-1">
      <label className="text-2xs font-bold text-foreground">URL do Webhook</label>
      <input
        type="url"
        required
        placeholder="https://hooks.slack.com/services/..."
        value={editingWebhook.endpointUrl || ''}
        onChange={(e) => onChange({ ...editingWebhook, endpointUrl: e.target.value })}
        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
      />
    </div>

    <div className="space-y-1">
      <label className="text-2xs font-bold text-foreground">Plataforma</label>
      <select
        value={editingWebhook.platform || 'generic'}
        onChange={(e) =>
          onChange({
            ...editingWebhook,
            platform: e.target.value as 'generic' | 'slack' | 'discord' | 'teams'
          })
        }
        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
      >
        <option value="generic">Genérico (Payload JSON padrão)</option>
        <option value="slack">Slack</option>
        <option value="discord">Discord</option>
        <option value="teams">Microsoft Teams</option>
      </select>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      <div className="space-y-1">
        <label className="text-2xs font-bold text-foreground">Cabeçalho de Autenticação</label>
        <input
          type="text"
          placeholder="Authorization (opcional)"
          value={editingWebhook.authHeader || ''}
          onChange={(e) => onChange({ ...editingWebhook, authHeader: e.target.value })}
          className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
        />
      </div>
      <div className="space-y-1">
        <label className="text-2xs font-bold text-foreground">Valor do Token / Chave</label>
        <input
          type="password"
          placeholder="Bearer ... (opcional)"
          value={editingWebhook.authValue || ''}
          onChange={(e) => onChange({ ...editingWebhook, authValue: e.target.value })}
          className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
        />
      </div>
    </div>

    <div className="flex items-center gap-3 text-xs">
      <span className="font-bold text-foreground">Disparar em:</span>
      {(['success', 'failure'] as const).map((ev) => {
        const checked = !editingWebhook.events || editingWebhook.events.includes(ev);
        return (
          <label key={ev} className="flex items-center gap-1.5 cursor-pointer text-muted-foreground select-none">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) =>
                onChange({ ...editingWebhook, events: toggleWebhookEvent(editingWebhook.events, ev, e.target.checked) })
              }
              className="text-primary focus:ring-0 rounded"
            />
            <span className="text-foreground">{ev === 'success' ? 'Sucesso' : 'Falha'}</span>
          </label>
        );
      })}
    </div>

    <button
      type="submit"
      className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition text-xs shadow-xs cursor-pointer"
    >
      Salvar Webhook
    </button>
  </form>
);
