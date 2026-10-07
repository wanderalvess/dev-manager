import React from 'react';
import { Globe, Plus, Radio, Send, X } from 'lucide-react';
import type {
  DocsIndexStatus,
  DocSyncProgress,
  DocSyncResult,
  DocSyncTargetConfig
} from '../../../../../shared/types';
import { DocsSyncFeedback } from './DocsSyncFeedback';
import { DocsSyncTargetForm } from './DocsSyncTargetForm';
import { DocsSyncTargetRow } from './DocsSyncTargetRow';
import { Modal } from '../../ui/Modal';

interface DocsSyncModalProps {
  status: DocsIndexStatus | null;
  hasIndex: boolean;
  syncTargets: DocSyncTargetConfig[];
  isSyncing: boolean;
  syncProgress: DocSyncProgress | null;
  syncResults: DocSyncResult[] | null;
  editingTarget: Partial<DocSyncTargetConfig> | null;
  onEditingTargetChange: (target: Partial<DocSyncTargetConfig> | null) => void;
  onClose: () => void;
  onSyncNow: (targetId?: string) => void;
  onSaveTarget: (e: React.FormEvent) => void;
  onDeleteTarget: (id: string) => void;
  onToggleTargetEnabled: (target: DocSyncTargetConfig, enabled: boolean) => void;
}

const NEW_TARGET_TEMPLATE: Partial<DocSyncTargetConfig> = {
  name: '',
  endpointUrl: '',
  method: 'POST',
  authHeader: 'X-Api-Key',
  authValue: '',
  batchSize: 50,
  enabled: true
};

export const DocsSyncModal: React.FC<DocsSyncModalProps> = ({
  status,
  hasIndex,
  syncTargets,
  isSyncing,
  syncProgress,
  syncResults,
  editingTarget,
  onEditingTargetChange,
  onClose,
  onSyncNow,
  onSaveTarget,
  onDeleteTarget,
  onToggleTargetEnabled
}) => (
  <Modal
    open
    onClose={onClose}
    bare
    panelClassName="bg-card border border-border/80 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95"
    closeOnBackdrop={false}
    closeOnEscape={false}
    ariaLabel="Sincronização de Documentação"
  >
    {/* Cabeçalho do Modal com identidade clara de Cockpit */}
    <div className="p-4 border-b border-border/80 flex items-center justify-between bg-muted/40 shrink-0">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
          <Radio className="w-4 h-4 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground tracking-tight">Sincronização de Documentação</h3>
            <span className="text-2xs bg-primary/15 text-primary px-2 py-0.5 rounded-full font-mono font-bold">
              RAG Agnóstico
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Exporte trechos e vetores locais de 384 dimensões para o Espaço Ágil ou APIs externas sem custos de IA.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
        title="Fechar (Esc)"
      >
        <X className="w-4 h-4" />
      </button>
    </div>

    <div className="p-5 overflow-y-auto space-y-4 flex-1">
      <DocsSyncFeedback isSyncing={isSyncing} syncProgress={syncProgress} syncResults={syncResults} />

      {/* Barra de Status do Índice Local + Ação Geral */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/80">
        <div className="text-xs">
          <span className="font-semibold text-foreground">Base Local:</span>{' '}
          <span className="text-foreground/90 font-mono font-semibold">
            {status?.totalChunks || 0} trechos
          </span>{' '}
          <span className="text-muted-foreground text-[11px]">
            em {status?.totalFiles || 0} arquivos {!status?.isTextOnly && '· Vetorizado'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSyncNow()}
            disabled={isSyncing || !hasIndex || syncTargets.filter((t) => t.enabled).length === 0}
            className="px-3.5 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer active:scale-95"
          >
            <Send className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Transmitindo...' : 'Sincronizar Habilitados'}</span>
          </button>
        </div>
      </div>

      {/* Lista de Destinos Configurados */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-foreground tracking-tight flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-primary" />
            Destinos de API Conectados ({syncTargets.length})
          </h4>
          {!editingTarget && (
            <button
              type="button"
              onClick={() => onEditingTargetChange({ ...NEW_TARGET_TEMPLATE })}
              className="text-xs text-primary hover:text-primary/80 font-semibold flex items-center gap-1 cursor-pointer transition"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar Destino
            </button>
          )}
        </div>

        {syncTargets.length === 0 && !editingTarget && (
          <div className="text-center py-8 px-4 border border-dashed border-border rounded-xl text-xs text-muted-foreground space-y-2 bg-muted/10">
            <Radio className="w-6 h-6 mx-auto text-muted-foreground/60" />
            <p className="font-semibold text-foreground">Nenhum destino de API cadastrado ainda</p>
            <p className="text-[11px] max-w-md mx-auto">
              Cadastre o endpoint do <strong>Espaço Ágil</strong> (ex: <code>https://espacoagil.com.br/api/v1/knowledge/docs</code>) ou o novo backend local na VM para abastecer o chat.
            </p>
          </div>
        )}

        {syncTargets.map((target) => (
          <DocsSyncTargetRow
            key={target.id}
            target={target}
            isSyncing={isSyncing}
            hasIndex={hasIndex}
            onToggleEnabled={onToggleTargetEnabled}
            onSyncNow={onSyncNow}
            onEdit={onEditingTargetChange}
            onDelete={onDeleteTarget}
          />
        ))}
      </div>

      {/* Formulário Elegante de Destino */}
      {editingTarget && (
        <DocsSyncTargetForm
          editingTarget={editingTarget}
          onChange={onEditingTargetChange}
          onCancel={() => onEditingTargetChange(null)}
          onSubmit={onSaveTarget}
        />
      )}
    </div>

    <div className="p-3.5 border-t border-border/80 bg-muted/30 flex justify-end shrink-0">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-xl transition cursor-pointer"
      >
        Fechar
      </button>
    </div>
  </Modal>
);
