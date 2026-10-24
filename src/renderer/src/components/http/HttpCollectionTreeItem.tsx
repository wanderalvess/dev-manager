import React from 'react';
import {
  Folder,
  FolderOpen,
  Plus,
  ChevronRight,
  ChevronDown,
  Trash2
} from 'lucide-react';
import { HttpCollection, HttpRequestItem } from '../../../../shared/types';
import { HttpBadge } from './HttpBadge';

interface HttpCollectionTreeItemProps {
  collection: HttpCollection;
  search: string;
  openFolders: Record<string, boolean>;
  toggleFolder: (folderId: string) => void;
  activeRequestId?: string;
  onSelectRequest: (req: HttpRequestItem) => void;
  onNewRequest: (collectionId: string) => void;
  onDeleteRequest: (collectionId: string, requestId: string) => void;
  onDeleteCollection: (id: string) => void;
}

export const HttpCollectionTreeItem: React.FC<HttpCollectionTreeItemProps> = ({
  collection: col,
  search,
  openFolders,
  toggleFolder,
  activeRequestId,
  onSelectRequest,
  onNewRequest,
  onDeleteRequest,
  onDeleteCollection
}) => {
  return (
    <div className="mb-2">
      {/* Nome da Coleção */}
      <div className="flex items-center justify-between px-2 py-1 rounded hover:bg-muted/40 font-semibold text-foreground group">
        <span className="truncate">{col.name}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onNewRequest(col.id)}
            className="p-0.5 hover:text-primary"
            title="Adicionar requisição à coleção"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteCollection(col.id)}
            className="p-0.5 hover:text-red-400"
            title="Excluir coleção"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Pastas da Coleção */}
      {col.folders?.map((folder) => {
        const isOpen = openFolders[folder.id] ?? true;
        const folderRequests = col.requests.filter((r) => r.folderId === folder.id);

        if (
          search &&
          !folder.name.toLowerCase().includes(search.toLowerCase()) &&
          !folderRequests.some(
            (r) =>
              r.name.toLowerCase().includes(search.toLowerCase()) ||
              r.url.toLowerCase().includes(search.toLowerCase())
          )
        ) {
          return null;
        }

        return (
          <div key={folder.id} className="ml-2 mt-0.5">
            <div
              onClick={() => toggleFolder(folder.id)}
              className="flex items-center justify-between px-1.5 py-1 rounded cursor-pointer hover:bg-muted/30 text-muted-foreground hover:text-foreground"
            >
              <div className="flex items-center gap-1 truncate">
                {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {isOpen ? <FolderOpen className="w-3.5 h-3.5 text-amber-400" /> : <Folder className="w-3.5 h-3.5 text-amber-400" />}
                <span className="truncate font-medium">{folder.name}</span>
              </div>
              <span className="text-xs text-muted-foreground/60">{folderRequests.length}</span>
            </div>

            {isOpen && (
              <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border/40 pl-1.5">
                {folderRequests.map((req) => (
                  <div
                    key={req.id}
                    onClick={() => onSelectRequest(req)}
                    className={`flex items-center justify-between px-1.5 py-1 rounded cursor-pointer transition-colors group ${
                      req.id === activeRequestId
                        ? 'bg-primary/20 text-primary font-medium'
                        : 'hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <HttpBadge method={req.method} size="sm" />
                      <span className="truncate">{req.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteRequest(col.id, req.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-red-400 transition-opacity"
                      title="Excluir requisição"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Requisições na raiz da Coleção */}
      <div className="ml-2 mt-0.5 space-y-0.5">
        {col.requests
          .filter((r) => !r.folderId)
          .map((req) => (
            <div
              key={req.id}
              onClick={() => onSelectRequest(req)}
              className={`flex items-center justify-between px-1.5 py-1 rounded cursor-pointer transition-colors group ${
                req.id === activeRequestId
                  ? 'bg-primary/20 text-primary font-medium'
                  : 'hover:bg-muted/50 text-foreground'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <HttpBadge method={req.method} size="sm" />
                <span className="truncate">{req.name}</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteRequest(col.id, req.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-red-400 transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
      </div>
    </div>
  );
};
