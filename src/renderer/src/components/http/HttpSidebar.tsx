import React, { useState } from 'react';
import {
  Plus,
  Upload,
  Settings,
  Search,
  Clock,
  Layers,
  Trash2
} from 'lucide-react';
import {
  HttpCollection,
  HttpRequestItem,
  HttpEnvironment,
  HttpResponseData
} from '../../../../shared/types';
import { HttpCollectionTreeItem } from './HttpCollectionTreeItem';
import { HttpBadge } from './HttpBadge';

interface HttpSidebarProps {
  collections: HttpCollection[];
  environments: HttpEnvironment[];
  selectedEnvId: string;
  onSelectEnv: (id: string) => void;
  onOpenEnvModal: () => void;
  onOpenImportModal: () => void;
  activeRequestId?: string;
  onSelectRequest: (req: HttpRequestItem) => void;
  onNewRequest: (collectionId?: string, folderId?: string) => void;
  onNewCollection: () => void;
  onDeleteRequest: (collectionId: string, requestId: string) => void;
  onDeleteCollection: (id: string) => void;
  onRestoreHistory?: (item: HttpResponseData) => void;
  onClearHistory?: () => void;
  history: HttpResponseData[];
}

export const HttpSidebar: React.FC<HttpSidebarProps> = ({
  collections,
  environments,
  selectedEnvId,
  onSelectEnv,
  onOpenEnvModal,
  onOpenImportModal,
  activeRequestId,
  onSelectRequest,
  onNewRequest,
  onNewCollection,
  onDeleteRequest,
  onDeleteCollection,
  onRestoreHistory,
  onClearHistory,
  history
}) => {
  const [activeTab, setActiveTab] = useState<'collections' | 'history'>('collections');
  const [search, setSearch] = useState('');
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});

  const toggleFolder = (folderId: string) => {
    setOpenFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const currentEnv = environments.find((e) => e.id === selectedEnvId) || environments[0];

  return (
    <div className="w-72 border-r border-border bg-card/40 flex flex-col h-full overflow-hidden text-xs">
      {/* Seletor de Ambiente no Topo */}
      <div className="p-2 border-b border-border flex items-center justify-between gap-1.5 bg-card/60">
        <div className="flex-1 min-w-0">
          <label className="block text-[10px] uppercase font-semibold text-muted-foreground/80 tracking-wider">
            Ambiente
          </label>
          <select
            value={selectedEnvId}
            onChange={(e) => onSelectEnv(e.target.value)}
            className="w-full mt-0.5 px-2 py-1 bg-background border border-border rounded font-medium text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary truncate"
          >
            {environments.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={onOpenEnvModal}
          className="mt-3.5 p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors border border-border"
          title="Configurar Ambientes & Variáveis"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Botões de Ação Rápida */}
      <div className="p-2 border-b border-border flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onNewRequest()}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 rounded font-medium transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>Requisição</span>
        </button>

        <button
          type="button"
          onClick={onOpenImportModal}
          className="flex items-center gap-1 px-2 py-1.5 bg-muted hover:bg-muted/80 text-foreground border border-border rounded transition-colors"
          title="Importar coleção do Postman"
        >
          <Upload className="w-3 h-3 text-muted-foreground" />
          <span>Postman</span>
        </button>
      </div>

      {/* Campo de Busca */}
      <div className="p-2 border-b border-border relative">
        <Search className="w-3.5 h-3.5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filtrar rotas ou coleções..."
          className="w-full pl-7 pr-2 py-1 bg-background border border-border rounded text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Abas Coleções vs Histórico */}
      <div className="flex border-b border-border bg-card/20">
        <button
          type="button"
          onClick={() => setActiveTab('collections')}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 font-medium border-b-2 transition-colors ${
            activeTab === 'collections'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="w-3 h-3" />
          <span>Coleções ({collections.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 font-medium border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="w-3 h-3" />
          <span>Histórico</span>
        </button>
      </div>

      {/* Conteúdo da Árvore */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
        {activeTab === 'collections' ? (
          collections.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-[11px] px-4">
              <p>Nenhuma coleção cadastrada.</p>
              <button
                type="button"
                onClick={onOpenImportModal}
                className="mt-2 text-primary hover:underline font-medium"
              >
                Importar Coleção Postman
              </button>
            </div>
          ) : (
            collections.map((col) => (
              <HttpCollectionTreeItem
                key={col.id}
                collection={col}
                search={search}
                openFolders={openFolders}
                toggleFolder={toggleFolder}
                activeRequestId={activeRequestId}
                onSelectRequest={onSelectRequest}
                onNewRequest={onNewRequest}
                onDeleteRequest={onDeleteRequest}
                onDeleteCollection={onDeleteCollection}
              />
            ))
          )
        ) : (
          /* Histórico Recente Interativo */
          <div className="space-y-1.5">
            {history.length > 0 && onClearHistory && (
              <div className="flex items-center justify-between px-1 pb-1 mb-1 border-b border-border/40">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground/80 tracking-wider">
                  Execuções ({history.length})
                </span>
                <button
                  type="button"
                  onClick={onClearHistory}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"
                  title="Limpar todo o histórico"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                  <span>Limpar</span>
                </button>
              </div>
            )}

            {history.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-[11px]">Nenhuma chamada no histórico.</div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onRestoreHistory?.(item)}
                  className="p-2 rounded border border-border/60 bg-background/50 hover:bg-muted/40 transition-colors cursor-pointer group"
                  title="Clique para restaurar esta chamada no workspace"
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 truncate">
                      {item.requestSnapshot?.method ? (
                        <HttpBadge method={item.requestSnapshot.method} size="sm" />
                      ) : (
                        <span className="font-mono text-[10px] text-muted-foreground">HTTP</span>
                      )}
                      <span
                        className={`font-mono text-[10px] font-bold ${
                          item.status >= 200 && item.status < 300 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {item.status || 'ERR'}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">{item.durationMs}ms</span>
                  </div>
                  <div className="text-[11px] text-foreground font-mono truncate mt-1">
                    {item.requestSnapshot?.url || 'URL não gravada'}
                  </div>
                  <div className="text-[10px] text-muted-foreground/60 truncate mt-0.5">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
