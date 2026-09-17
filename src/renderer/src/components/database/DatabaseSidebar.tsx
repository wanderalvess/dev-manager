import React from 'react';
import {
  Database,
  Plus,
  Edit2,
  Trash2,
  Table,
  RotateCw,
  Search,
  ChevronRight,
  ChevronDown,
  Key,
  Sparkles
} from 'lucide-react';
import { DatabaseConnectionConfig, DatabaseType, TableColumnInfo } from '../../../../shared/types';

export interface DatabaseSidebarProps {
  connections: DatabaseConnectionConfig[];
  activeConnectionId: string;
  setActiveConnectionId: (id: string) => void;
  onOpenCreateModal: () => void;
  onOpenEditModal: (conn: DatabaseConnectionConfig) => void;
  onDeleteConnection: (id: string) => void;
  tables: string[];
  filteredTables: string[];
  tableFilter: string;
  setTableFilter: (val: string) => void;
  isLoadingTables: boolean;
  onFetchTables: () => void;
  expandedTable: string | null;
  tableColumns: Record<string, TableColumnInfo[]>;
  isLoadingColumns: Record<string, boolean>;
  onToggleTableExpand: (tbl: string, e: React.MouseEvent) => void;
  onTableClick: (tbl: string) => void;
  onInsertColumnName: (colName: string) => void;
  onOpenTour: () => void;
  activeConnection: DatabaseConnectionConfig | null;
  getDbBadge: (type: DatabaseType) => React.ReactNode;
}

export const DatabaseSidebar: React.FC<DatabaseSidebarProps> = ({
  connections,
  activeConnectionId,
  setActiveConnectionId,
  onOpenCreateModal,
  onOpenEditModal,
  onDeleteConnection,
  tables,
  filteredTables,
  tableFilter,
  setTableFilter,
  isLoadingTables,
  onFetchTables,
  expandedTable,
  tableColumns,
  isLoadingColumns,
  onToggleTableExpand,
  onTableClick,
  onInsertColumnName,
  onOpenTour,
  activeConnection,
  getDbBadge
}) => {
  return (
    <aside className="w-72 bg-card/60 border-r border-border/70 flex flex-col shrink-0" data-tour="connections-sidebar">
      {/* Topo da Sidebar: Seletor de Conexão */}
      <div className="p-3 border-b border-border/70 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-foreground tracking-wide uppercase">Conexões</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenTour}
            className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted transition cursor-pointer"
            title="Rever o tour guiado desta página"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
          <button
            data-tour="new-connection-button"
            onClick={onOpenCreateModal}
            className="flex items-center space-x-1 px-2 py-1 bg-primary text-primary-foreground rounded text-[11px] font-semibold hover:bg-primary/90 transition shadow-sm cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Nova</span>
          </button>
        </div>
      </div>

      {/* Lista de Conexões Salvas */}
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
                    ? 'bg-primary/15 border-primary/40 text-foreground font-semibold shadow-xs'
                    : 'bg-card/40 border-transparent hover:bg-card hover:border-border text-muted-foreground'
                }`}
              >
                <div className="flex flex-col truncate pr-1">
                  <div className="flex items-center space-x-1.5 truncate">
                    {getDbBadge(conn.type)}
                    <span className="truncate">{conn.name}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate font-mono mt-0.5">
                    {conn.user}@{conn.host}:{conn.port}
                  </span>
                </div>
                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenEditModal(conn);
                    }}
                    title="Editar Conexão"
                    className="p-1 hover:text-foreground text-muted-foreground rounded hover:bg-muted/50 transition cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConnection(conn.id);
                    }}
                    title="Excluir Conexão"
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

      {/* Explorador de Tabelas do Schema */}
      <div className="flex-1 flex flex-col overflow-hidden" data-tour="table-explorer">
        <div className="p-2.5 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <Table className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Tabelas</span>
            <span className="text-[10px] bg-muted px-1.5 py-0.2 rounded font-mono font-medium text-foreground">
              {tables.length}
            </span>
          </div>
          <button
            onClick={onFetchTables}
            disabled={isLoadingTables || !activeConnection}
            title="Recarregar lista de tabelas"
            className="p-1 hover:text-foreground text-muted-foreground rounded hover:bg-muted/50 transition disabled:opacity-50 cursor-pointer"
          >
            <RotateCw className={`w-3 h-3 ${isLoadingTables ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>

        <div className="p-2 border-b border-border/40">
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-2.5 text-muted-foreground" />
            <input
              type="text"
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              placeholder="Filtrar tabelas..."
              className="w-full bg-background border border-border/70 rounded-md pl-7 pr-2 py-1 text-xs focus:outline-none focus:border-primary text-foreground"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-1 space-y-0.5 font-mono text-[11px]">
          {tables.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              {isLoadingTables ? (
                <span className="flex items-center justify-center gap-1.5 text-primary">
                  <RotateCw className="w-3 h-3 animate-spin" /> Carregando tabelas...
                </span>
              ) : (
                <div>
                  <p className="text-[11px]">Nenhuma tabela listada.</p>
                  <button
                    onClick={onFetchTables}
                    className="mt-1.5 text-[11px] text-primary font-bold hover:underline cursor-pointer"
                  >
                    Buscar Tabelas
                  </button>
                </div>
              )}
            </div>
          ) : (
            filteredTables.map((tbl) => {
              const isExpanded = expandedTable === tbl;
              const cols = tableColumns[tbl];
              const isLoadingCols = isLoadingColumns[tbl];

              return (
                <div key={tbl} className="rounded-lg border border-transparent hover:border-border/40 transition overflow-hidden">
                  <div
                    onClick={() => onTableClick(tbl)}
                    title={`Inserir query SELECT para ${tbl}`}
                    className={`w-full text-left px-2 py-1.5 rounded text-muted-foreground hover:text-foreground flex items-center justify-between group cursor-pointer transition ${
                      isExpanded ? 'bg-muted/70 text-foreground font-bold' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center space-x-1 min-w-0 truncate">
                      <button
                        type="button"
                        onClick={(e) => onToggleTableExpand(tbl, e)}
                        title={isExpanded ? 'Recolher colunas' : 'Inspecionar colunas'}
                        className="p-0.5 rounded hover:bg-card text-muted-foreground hover:text-primary transition shrink-0 cursor-pointer"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 group-hover:text-primary" />
                        )}
                      </button>
                      <span className="truncate">{tbl}</span>
                    </div>
                    {cols && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-muted/60 text-muted-foreground shrink-0 font-mono">
                        {cols.length}
                      </span>
                    )}
                  </div>

                  {/* Lista de colunas expandida */}
                  {isExpanded && (
                    <div className="bg-background/80 border-t border-border/40 p-1 pl-4 space-y-0.5 text-[10px]">
                      {isLoadingCols ? (
                        <div className="py-2 text-center text-muted-foreground flex items-center justify-center gap-1">
                          <RotateCw className="w-3 h-3 animate-spin text-primary" /> Carregando colunas...
                        </div>
                      ) : !cols || cols.length === 0 ? (
                        <div className="py-1 text-center text-muted-foreground italic">Nenhuma coluna detectada.</div>
                      ) : (
                        cols.map((col) => (
                          <div
                            key={col.name}
                            onClick={() => onInsertColumnName(col.name)}
                            title={`Clique para inserir '${col.name}' no editor`}
                            className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-muted cursor-pointer group/col transition"
                          >
                            <div className="flex items-center space-x-1.5 truncate">
                              {col.isPrimaryKey && (
                                <span title="Chave Primária (PK)" className="flex items-center justify-center shrink-0">
                                  <Key className="w-2.5 h-2.5 text-amber-400" />
                                </span>
                              )}
                              <span className="font-semibold text-foreground group-hover/col:text-primary truncate">
                                {col.name}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 shrink-0">
                              <span className="text-[9px] text-muted-foreground font-mono">{col.type}</span>
                              {col.nullable === false && (
                                <span className="text-[8px] px-1 rounded bg-amber-500/10 text-amber-400 font-bold">
                                  NOT NULL
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
};
