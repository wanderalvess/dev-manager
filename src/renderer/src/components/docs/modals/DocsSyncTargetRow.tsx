import React from 'react';
import { Send, Settings, Trash2 } from 'lucide-react';
import type { DocSyncTargetConfig } from '../../../../../shared/types';

interface DocsSyncTargetRowProps {
  target: DocSyncTargetConfig;
  isSyncing: boolean;
  hasIndex: boolean;
  onToggleEnabled: (target: DocSyncTargetConfig, enabled: boolean) => void;
  onSyncNow: (targetId: string) => void;
  onEdit: (target: DocSyncTargetConfig) => void;
  onDelete: (id: string) => void;
}

export const DocsSyncTargetRow: React.FC<DocsSyncTargetRowProps> = ({
  target,
  isSyncing,
  hasIndex,
  onToggleEnabled,
  onSyncNow,
  onEdit,
  onDelete
}) => (
  <div className="p-3.5 rounded-xl border border-border/80 bg-card hover:border-primary/40 transition-all flex items-center justify-between gap-3 text-xs shadow-xs">
    <div className="flex items-start gap-3 min-w-0 flex-1">
      <input
        type="checkbox"
        checked={target.enabled}
        onChange={(e) => onToggleEnabled(target, e.target.checked)}
        className="rounded border-border mt-1 accent-primary cursor-pointer"
        title="Ativar/desativar sincronização com este destino"
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="font-bold text-foreground flex items-center gap-2">
          <span className="truncate">{target.name}</span>
          <span className="text-[10px] font-mono bg-muted/80 border border-border/60 px-1.5 py-0.5 rounded font-bold text-foreground">
            {target.method || 'POST'}
          </span>
          <span
            className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${
              target.syncMode === 'articles'
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-700 dark:text-indigo-400'
                : target.syncMode === 'chunks'
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-700 dark:text-cyan-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
            }`}
          >
            {target.syncMode === 'articles'
              ? 'Artigos KB'
              : target.syncMode === 'chunks'
              ? 'Chunks RAG'
              : 'Artigos + Chunks'}
          </span>
        </div>
        <div className="font-mono text-[11px] text-muted-foreground truncate" title={target.endpointUrl}>
          {target.endpointUrl}
        </div>
        <div className="text-[10px] text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
          <span>Lote: <strong>{target.batchSize || 50}</strong></span>
          {target.authHeader && (
            <span>Auth: <strong>{target.authHeader}</strong> ({target.authValue ? 'definida' : 'sem chave'})</span>
          )}
          {target.lastSyncedAt && (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              Último envio: {new Date(target.lastSyncedAt).toLocaleString('pt-BR')}
            </span>
          )}
        </div>
      </div>
    </div>

    <div className="flex items-center gap-1.5 shrink-0">
      <button
        type="button"
        onClick={() => onSyncNow(target.id)}
        disabled={isSyncing || !hasIndex}
        className="px-3 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50 active:scale-95"
        title="Enviar para este destino agora"
      >
        <Send className="w-3 h-3" /> Enviar
      </button>
      <button
        type="button"
        onClick={() => onEdit(target)}
        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
        title="Editar configuração"
      >
        <Settings className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(target.id)}
        className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition cursor-pointer"
        title="Remover destino"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);
