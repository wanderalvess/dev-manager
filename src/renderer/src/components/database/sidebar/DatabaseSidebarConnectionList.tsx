import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { DatabaseConnectionConfig, DatabaseType } from '../../../../../shared/types';

interface DatabaseSidebarConnectionListProps {
  connections: DatabaseConnectionConfig[];
  activeConnectionId: string;
  setActiveConnectionId: (id: string) => void;
  onOpenCreateModal: () => void;
  onOpenEditModal: (conn: DatabaseConnectionConfig) => void;
  onDeleteConnection: (id: string) => void;
  getDbBadge: (type: DatabaseType) => React.ReactNode;
}

export const DatabaseSidebarConnectionList: React.FC<DatabaseSidebarConnectionListProps> = ({
  connections,
  activeConnectionId,
  setActiveConnectionId,
  onOpenCreateModal,
  onOpenEditModal,
  onDeleteConnection,
  getDbBadge
}) => (
  <div className="p-2 space-y-1 overflow-y-auto max-h-48 border-b border-border/60">
    {connections.length === 0 ? (
      <div className="text-center py-4 text-xs text-muted-foreground">
        Nenhuma conexão cadastrada.
        <button
          onClick={onOpenCreateModal}
          className="block mx-auto mt-2 text-primary font-bold hover:underline cursor-pointer"
        >
          + Adicionar Conexão
        </button>
      </div>
    ) : (
      connections.map((conn) => {
        const isActive = conn.id === activeConnectionId;
        return (
          <div
            key={conn.id}
            onClick={() => setActiveConnectionId(conn.id)}
            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition text-xs border ${
              isActive
                ? 'bg-primary/15 border-primary/40 text-foreground font-semibold shadow-2xs'
                : 'bg-card/40 border-transparent hover:bg-card hover:border-border text-muted-foreground'
            }`}
          >
            <div className="flex flex-col truncate pr-1">
              <div className="flex items-center space-x-1.5 truncate">
                {getDbBadge(conn.type)}
                <span className="truncate">{conn.name}</span>
              </div>
              <span className="text-2xs text-muted-foreground truncate font-mono mt-0.5">
                {conn.user}@{conn.host}:{conn.port}
              </span>
            </div>
            <div className="flex items-center space-x-1 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenEditModal(conn);
                }}
                title="Editar Conexão" aria-label="Editar Conexão"
                className="p-1 hover:text-foreground text-muted-foreground rounded hover:bg-muted/50 transition cursor-pointer"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConnection(conn.id);
                }}
                title="Excluir Conexão" aria-label="Excluir Conexão"
                className="p-1 hover:text-red-400 text-muted-foreground rounded hover:bg-muted/50 transition cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        );
      })
    )}
  </div>
);
