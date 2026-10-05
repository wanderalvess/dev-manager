import React from 'react';
import { Table, RotateCw, Search } from 'lucide-react';
import { DatabaseConnectionConfig, TableColumnInfo } from '../../../../../shared/types';
import { DatabaseSidebarTableItem } from './DatabaseSidebarTableItem';

interface DatabaseSidebarTableExplorerProps {
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
  activeConnection: DatabaseConnectionConfig | null;
  // Estado de paginação fica no orquestrador para sobreviver ao recolher/expandir a sidebar.
  visibleTables: string[];
  hasMoreTables: boolean;
  showMoreTables: () => void;
  handleTablesScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

export const DatabaseSidebarTableExplorer: React.FC<DatabaseSidebarTableExplorerProps> = ({
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
  activeConnection,
  visibleTables,
  hasMoreTables,
  showMoreTables,
  handleTablesScroll
}) => {
  return (
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

      <div onScroll={handleTablesScroll} className="flex-1 overflow-y-auto p-1 space-y-0.5 font-mono text-[11px]">
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
          visibleTables.map((tbl) => (
            <DatabaseSidebarTableItem
              key={tbl}
              tbl={tbl}
              isExpanded={expandedTable === tbl}
              cols={tableColumns[tbl]}
              isLoadingCols={isLoadingColumns[tbl]}
              onToggleTableExpand={onToggleTableExpand}
              onTableClick={onTableClick}
              onInsertColumnName={onInsertColumnName}
            />
          ))
        )}
        {hasMoreTables && (
          <button
            type="button"
            onClick={showMoreTables}
            className="w-full py-1.5 text-center text-[10px] text-muted-foreground hover:text-primary cursor-pointer transition"
          >
            Mostrando {visibleTables.length} de {filteredTables.length} — carregar mais
          </button>
        )}
      </div>
    </div>
  );
};
