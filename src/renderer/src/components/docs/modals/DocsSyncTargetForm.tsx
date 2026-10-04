import React from 'react';
import { BookOpen, Cpu, Layers } from 'lucide-react';
import type { DocSyncTargetConfig } from '../../../../../shared/types';

type SyncMode = NonNullable<DocSyncTargetConfig['syncMode']>;

interface DocsSyncTargetFormProps {
  editingTarget: Partial<DocSyncTargetConfig>;
  onChange: (target: Partial<DocSyncTargetConfig>) => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

const INPUT_BASE =
  'w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary';

const modeButtonClass = (active: boolean) =>
  `p-2.5 rounded-xl border text-left transition flex flex-col justify-between gap-1.5 cursor-pointer ${
    active ? 'bg-primary/10 border-primary shadow-xs' : 'bg-background/60 border-border hover:border-primary/40'
  }`;

export const DocsSyncTargetForm: React.FC<DocsSyncTargetFormProps> = ({
  editingTarget,
  onChange,
  onCancel,
  onSubmit
}) => {
  const setMode = (syncMode: SyncMode) => onChange({ ...editingTarget, syncMode });

  return (
    <form onSubmit={onSubmit} className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3.5 shadow-xs">
      <div className="flex items-center justify-between border-b border-primary/15 pb-2.5">
        <h5 className="text-xs font-bold text-foreground">
          {editingTarget.id ? 'Editar Destino de API' : 'Novo Destino de API'}
        </h5>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          Cancelar
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 space-y-1">
          <label className="text-[11px] font-bold text-foreground">Nome Identificador</label>
          <input
            type="text"
            required
            placeholder="Ex: Espaço Ágil Legado ou Backend VM"
            value={editingTarget.name || ''}
            onChange={(e) => onChange({ ...editingTarget, name: e.target.value })}
            className={INPUT_BASE}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-foreground">Método HTTP</label>
          <select
            value={editingTarget.method || 'POST'}
            onChange={(e) => onChange({ ...editingTarget, method: e.target.value as 'POST' | 'PUT' })}
            className={INPUT_BASE}
          >
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-bold text-foreground">URL do Endpoint de Ingestão</label>
        <input
          type="url"
          required
          placeholder="Ex: https://espacoagil.com.br/api/v1/knowledge/docs"
          value={editingTarget.endpointUrl || ''}
          onChange={(e) => onChange({ ...editingTarget, endpointUrl: e.target.value })}
          className={`${INPUT_BASE} font-mono`}
        />
      </div>

      {/* Seletor Visual de Modo de Sincronização (Cockpit Card Radio) */}
      <div className="space-y-1.5 pt-0.5">
        <label className="text-[11px] font-bold text-foreground flex items-center justify-between">
          <span>Modo de Sincronização</span>
          <span className="text-[10px] text-muted-foreground font-normal">Define o destino dos dados</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setMode('all')}
            className={modeButtonClass((editingTarget.syncMode || 'all') === 'all')}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span>Ambos</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                Recomendado
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Artigos completos na Base de Conhecimento vinculados aos Chunks para RAG.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMode('articles')}
            className={modeButtonClass(editingTarget.syncMode === 'articles')}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
              <span>Artigos KB</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Apenas documentos completos para leitura e catálogo no Espaço Ágil.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMode('chunks')}
            className={modeButtonClass(editingTarget.syncMode === 'chunks')}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Cpu className="w-3.5 h-3.5 text-cyan-500" />
              <span>Chunks RAG</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Apenas trechos vetorizados para busca semântica do assistente neural.
            </p>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-foreground">Cabeçalho de Autenticação</label>
          <input
            type="text"
            placeholder="X-Api-Key ou Authorization"
            value={editingTarget.authHeader || 'X-Api-Key'}
            onChange={(e) => onChange({ ...editingTarget, authHeader: e.target.value })}
            className={`${INPUT_BASE} font-mono`}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-foreground">Token / API Key</label>
          <input
            type="password"
            placeholder="Insira o segredo ou API key"
            value={editingTarget.authValue || ''}
            onChange={(e) => onChange({ ...editingTarget, authValue: e.target.value })}
            className={`${INPUT_BASE} font-mono`}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-foreground">Tamanho do Lote</label>
          <input
            type="number"
            min={1}
            max={200}
            value={editingTarget.batchSize || 50}
            onChange={(e) => onChange({ ...editingTarget, batchSize: Number(e.target.value) })}
            className={INPUT_BASE}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3.5 py-1.5 rounded-xl border border-border text-xs text-muted-foreground hover:bg-muted cursor-pointer transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold shadow-sm cursor-pointer transition active:scale-95"
        >
          Salvar Destino
        </button>
      </div>
    </form>
  );
};
