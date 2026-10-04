import React from 'react';
import { Globe, Plus, Trash2, Settings, RefreshCw } from 'lucide-react';
import type { ConfluenceSourceConfig } from '../../../../shared/types';

interface DocSettingsConfluenceSectionProps {
  sources: ConfluenceSourceConfig[];
  editing: Partial<ConfluenceSourceConfig> | null;
  setEditing: (value: Partial<ConfluenceSourceConfig> | null) => void;
  testingId: string | null;
  testResults: Record<string, { success: boolean; message: string }>;
  onSubmit: (e: React.FormEvent) => void;
  onTest: (source: ConfluenceSourceConfig) => void;
  onDelete: (id: string) => Promise<void>;
  onToggleEnabled: (source: ConfluenceSourceConfig, enabled: boolean) => Promise<void>;
}

const INPUT_BASE =
  'w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary';

export const DocSettingsConfluenceSection: React.FC<DocSettingsConfluenceSectionProps> = ({
  sources,
  editing,
  setEditing,
  testingId,
  testResults,
  onSubmit,
  onTest,
  onDelete,
  onToggleEnabled
}) => (
  <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-3 shadow-xs">
    <div className="flex items-center justify-between gap-3">
      <div>
        <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-sky-500" />
          <span>Espaços Confluence</span>
        </h4>
        <p className="text-[11px] text-muted-foreground">
          Páginas do Confluence indexadas como documentação local para busca.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setEditing({ enabled: true })}
        className="px-3 py-1.5 bg-card hover:bg-muted border border-border rounded-xl text-xs font-semibold text-foreground transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Novo espaço Confluence</span>
      </button>
    </div>

    {sources.length === 0 && !editing ? (
      <div className="text-center py-5 border border-dashed border-border rounded-xl bg-muted/20">
        <Globe className="w-6 h-6 mx-auto text-sky-500/50 mb-1" />
        <p className="text-xs font-semibold text-foreground">Nenhum espaço Confluence configurado</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Conecte sua wiki técnica da Atlassian para indexar páginas e especificações.
        </p>
      </div>
    ) : (
      <ul className="space-y-2">
        {sources.map((source) => (
          <li key={source.id} className="p-3 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/80 transition-all space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <input
                  type="checkbox"
                  checked={source.enabled}
                  onChange={(e) => onToggleEnabled(source, e.target.checked)}
                  className="text-primary focus:ring-0 shrink-0 accent-primary cursor-pointer"
                />
                <Globe className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                <span className="font-semibold text-foreground truncate">{source.name}</span>
                <span className="font-mono text-[10px] text-muted-foreground truncate">{source.baseUrl}</span>
                {source.spaceKey && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground shrink-0 font-bold">
                    {source.spaceKey}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onTest(source)}
                  disabled={testingId === source.id}
                  className="px-2 py-1 bg-muted hover:bg-muted/80 text-foreground rounded-md text-[10px] font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  {testingId === source.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Testar'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(source)}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(source.id)}
                  className="p-1 rounded-md hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {testResults[source.id] && (
              <div
                className={`text-[10px] px-2 py-1 rounded-md ${
                  testResults[source.id].success
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                }`}
              >
                {testResults[source.id].message}
              </div>
            )}
          </li>
        ))}
      </ul>
    )}

    {editing && (
      <form onSubmit={onSubmit} className="mt-2 p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-foreground">
            {editing.id ? 'Editar Espaço Confluence' : 'Novo Espaço Confluence'}
          </span>
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="text-[11px] text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            Cancelar
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-foreground">Nome Identificador</label>
            <input
              type="text"
              required
              placeholder="Ex: Wiki Interno"
              value={editing.name || ''}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className={INPUT_BASE}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-foreground">Space Key (opcional)</label>
            <input
              type="text"
              placeholder="Ex: PRO (vazio = todos os espaços)"
              value={editing.spaceKey || ''}
              onChange={(e) => setEditing({ ...editing, spaceKey: e.target.value })}
              className={`${INPUT_BASE} font-mono`}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-foreground">URL Base do Confluence</label>
          <input
            type="url"
            required
            placeholder="https://empresa.atlassian.net ou https://confluence.empresa.com"
            value={editing.baseUrl || ''}
            onChange={(e) => setEditing({ ...editing, baseUrl: e.target.value })}
            className={`${INPUT_BASE} font-mono`}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-foreground">E-mail (Cloud — deixe vazio para Server)</label>
            <input
              type="email"
              placeholder="voce@empresa.com"
              value={editing.authEmail || ''}
              onChange={(e) => setEditing({ ...editing, authEmail: e.target.value })}
              className={`${INPUT_BASE} font-mono`}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-foreground">Token de API / PAT</label>
            <input
              type="password"
              required
              placeholder="Token de Acesso"
              value={editing.authToken || ''}
              onChange={(e) => setEditing({ ...editing, authToken: e.target.value })}
              className={`${INPUT_BASE} font-mono`}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="submit"
            className="px-4 py-1.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition text-xs cursor-pointer shadow-xs active:scale-95"
          >
            Salvar Espaço Confluence
          </button>
        </div>
      </form>
    )}
  </div>
);
