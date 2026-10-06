import React from 'react';
import { Table, RotateCw, Search, Info } from 'lucide-react';
import { DatabaseConnectionConfig, DbObjectInfo, DbObjectType, TableColumnInfo } from '../../../../../shared/types';
import { EXPLORER_TYPE_OPTIONS, type ExplorerObjectType } from '../../../hooks/database/useDatabaseObjects';
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
  onOpenSpec: (name: string, type: DbObjectType) => void;
  objectType: ExplorerObjectType;
  onObjectTypeChange: (type: ExplorerObjectType) => void;
  objectsOfType: DbObjectInfo[];
  objectCounts: Partial<Record<DbObjectType, number>>;
  isLoadingObjects: boolean;
  onFetchObjects: () => void;
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
  onOpenSpec,
  objectType,
  onObjectTypeChange,
  objectsOfType,
  objectCounts,
  isLoadingObjects,
  onFetchObjects,
  visibleTables,
  hasMoreTables,
  showMoreTables,
  handleTablesScroll
}) => {
  const showingTables = objectType === 'TABLE';
  const typeLabel = EXPLORER_TYPE_OPTIONS.find((o) => o.type === objectType)?.label ?? 'Objetos';
  const countOf = (type: ExplorerObjectType) => (type === 'TABLE' ? tables.length : objectCounts[type]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden" data-tour="table-explorer">
      <div className="p-2.5 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center space-x-1.5 min-w-0">
          <Table className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <select
            value={objectType}
            onChange={(e) => onObjectTypeChange(e.target.value as ExplorerObjectType)}
            aria-label="Tipo de objeto"
            className="min-w-0 bg-transparent text-[11px] font-bold text-muted-foreground uppercase focus:outline-none cursor-pointer"
          >
            {EXPLORER_TYPE_OPTIONS.map((o) => {
              const n = countOf(o.type);
              return (
                <option key={o.type} value={o.type}>
                  {o.label}
                  {n !== undefined ? ` (${n})` : ''}
                </option>
              );
            })}
          </select>
        </div>
        <button
          onClick={showingTables ? onFetchTables : onFetchObjects}
          disabled={(showingTables ? isLoadingTables : isLoadingObjects) || !activeConnection}
          title={showingTables ? 'Recarregar lista de tabelas' : `Recarregar ${typeLabel.toLowerCase()}`}
          className="p-1 hover:text-foreground text-muted-foreground rounded hover:bg-muted/50 transition disabled:opacity-50 cursor-pointer"
        >
          <RotateCw className={`w-3 h-3 ${(showingTables ? isLoadingTables : isLoadingObjects) ? 'animate-spin text-primary' : ''}`} />
        </button>
      </div>

      <div className="p-2 border-b border-border/40">
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2 top-2.5 text-muted-foreground" />
          <input
            type="text"
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            placeholder={`Filtrar ${typeLabel.toLowerCase()}...`}
            aria-label={`Filtrar ${typeLabel.toLowerCase()}`}
            className="w-full bg-background border border-border/70 rounded-md pl-7 pr-2 py-1 text-xs focus:outline-none focus:border-primary text-foreground"
          />
        </div>
      </div>

      <div onScroll={handleTablesScroll} className="flex-1 overflow-y-auto p-1 space-y-0.5 font-mono text-[11px]">
        {!showingTables ? (
          isLoadingObjects ? (
            <div className="p-4 text-center text-xs text-primary flex items-center justify-center gap-1.5">
              <RotateCw className="w-3 h-3 animate-spin" /> Carregando {typeLabel.toLowerCase()}...
            </div>
          ) : objectsOfType.length === 0 ? (
            <div className="p-4 text-center text-[11px] text-muted-foreground">
              {tableFilter ? 'Nada encontrado com esse filtro.' : `Nenhum item em ${typeLabel.toLowerCase()}.`}
            </div>
          ) : (
            objectsOfType.slice(0, 500).map((o) => (
              <button
                key={o.name}
                type="button"
                onClick={() => onOpenSpec(o.name, o.type)}
                title={`Abrir ${o.name}`}
                className="w-full text-left px-2 py-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-between gap-2 group cursor-pointer transition"
              >
                <span className="truncate">{o.name}</span>
                <span className="flex items-center gap-1 shrink-0">
                  {o.status === 'INVALID' && (
                    <span className="text-2xs px-1 rounded bg-rose-500/15 text-rose-500 font-bold" title="Objeto inválido: precisa ser recompilado">
                      INVÁLIDO
                    </span>
                  )}
                  <Info className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-primary" />
                </span>
              </button>
            ))
          )
        ) : tables.length === 0 ? (
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
              onOpenSpec={(name) => onOpenSpec(name, 'TABLE')}
            />
          ))
        )}
        {showingTables && hasMoreTables && (
          <button
            type="button"
            onClick={showMoreTables}
            className="w-full py-1.5 text-center text-2xs text-muted-foreground hover:text-primary cursor-pointer transition"
          >
            Mostrando {visibleTables.length} de {filteredTables.length} — carregar mais
          </button>
        )}
      </div>
    </div>
  );
};
