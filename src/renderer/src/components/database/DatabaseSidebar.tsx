import React from 'react';
import { DatabaseConnectionConfig, DatabaseType, DbObjectInfo, DbObjectType, TableColumnInfo } from '../../../../shared/types';
import type { ExplorerObjectType } from '../../hooks/database/useDatabaseObjects';
import { useDatabaseSidebarRenderLimit } from '../../hooks/database/useDatabaseSidebarRenderLimit';
import { DatabaseSidebarCollapsed } from './sidebar/DatabaseSidebarCollapsed';
import { DatabaseSidebarHeader } from './sidebar/DatabaseSidebarHeader';
import { DatabaseSidebarConnectionList } from './sidebar/DatabaseSidebarConnectionList';
import { DatabaseSidebarTableExplorer } from './sidebar/DatabaseSidebarTableExplorer';

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
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenSpec: (name: string, type: DbObjectType) => void;
  objectType: ExplorerObjectType;
  onObjectTypeChange: (type: ExplorerObjectType) => void;
  objectsOfType: DbObjectInfo[];
  objectCounts: Partial<Record<DbObjectType, number>>;
  isLoadingObjects: boolean;
  onFetchObjects: () => void;
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
  getDbBadge,
  isCollapsed = false,
  onToggleCollapse,
  onOpenSpec,
  objectType,
  onObjectTypeChange,
  objectsOfType,
  objectCounts,
  isLoadingObjects,
  onFetchObjects
}) => {
  const pagination = useDatabaseSidebarRenderLimit(filteredTables);

  if (isCollapsed) {
    return <DatabaseSidebarCollapsed activeConnection={activeConnection} onToggleCollapse={onToggleCollapse} />;
  }

  return (
    <aside className="w-72 bg-card/60 border-r border-border/70 flex flex-col shrink-0 transition-all" data-tour="connections-sidebar">
      <DatabaseSidebarHeader
        onOpenCreateModal={onOpenCreateModal}
        onOpenTour={onOpenTour}
        onToggleCollapse={onToggleCollapse}
      />
      <DatabaseSidebarConnectionList
        connections={connections}
        activeConnectionId={activeConnectionId}
        setActiveConnectionId={setActiveConnectionId}
        onOpenCreateModal={onOpenCreateModal}
        onOpenEditModal={onOpenEditModal}
        onDeleteConnection={onDeleteConnection}
        getDbBadge={getDbBadge}
      />
      <DatabaseSidebarTableExplorer
        tables={tables}
        filteredTables={filteredTables}
        tableFilter={tableFilter}
        setTableFilter={setTableFilter}
        isLoadingTables={isLoadingTables}
        onFetchTables={onFetchTables}
        expandedTable={expandedTable}
        tableColumns={tableColumns}
        isLoadingColumns={isLoadingColumns}
        onToggleTableExpand={onToggleTableExpand}
        onTableClick={onTableClick}
        onInsertColumnName={onInsertColumnName}
        activeConnection={activeConnection}
        onOpenSpec={onOpenSpec}
        objectType={objectType}
        onObjectTypeChange={onObjectTypeChange}
        objectsOfType={objectsOfType}
        objectCounts={objectCounts}
        isLoadingObjects={isLoadingObjects}
        onFetchObjects={onFetchObjects}
        visibleTables={pagination.visibleTables}
        hasMoreTables={pagination.hasMoreTables}
        showMoreTables={pagination.showMoreTables}
        handleTablesScroll={pagination.handleTablesScroll}
      />
    </aside>
  );
};
