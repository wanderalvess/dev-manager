import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OnboardingTour } from '../components/onboarding/OnboardingTour';
import { usePageTour } from '../components/onboarding/usePageTour';
import { DATABASE_TOUR_STEPS, DATABASE_TOUR_STORAGE_KEY } from '../components/onboarding/pageTours/databaseTour';
import { SqlSnippet } from '../../../shared/types';
import { DEFAULT_PORTS } from '../utils/dbPageTypes';
import type { ExecutionHistoryItem } from '../utils/dbPageTypes';
import { useDatabaseLayout } from '../hooks/database/useDatabaseLayout';
import { useDatabaseConnections } from '../hooks/database/useDatabaseConnections';
import { useDatabaseSchema } from '../hooks/database/useDatabaseSchema';
import { useDatabaseHistory } from '../hooks/database/useDatabaseHistory';
import { quoteTableName } from '../../../shared/sqlIdentifierUtils';
import { useDatabaseObjects } from '../hooks/database/useDatabaseObjects';
import { TableSpecModal, type SpecTarget } from '../components/database/spec/TableSpecModal';
import { readStoredSnippets } from '../hooks/database/useDatabaseSnippets';
import {
  MAX_QUERY_TABS,
  activeTab as getActiveTab,
  addTab,
  closeTab,
  defaultSqlFor,
  openConnectionTab,
  readStoredTabs,
  reconcileTabs,
  selectTab,
  setTabSql,
  storeTabs,
  type QueryTabsState
} from '../utils/queryTabsUtils';

// Subcomponentes Modularizados
import { DatabaseSidebar } from '../components/database/DatabaseSidebar';
import { DEFAULT_SQL_SNIPPETS } from '../components/database/SqlEditorArea';
import { ConnectionModal } from '../components/database/ConnectionModal';
import { BackupModal } from '../components/database/BackupModal';
import { getDbBadge } from '../components/database/DatabaseBadge';
import { DatabaseFirstUseBanner } from '../components/database/DatabaseFirstUseBanner';
import { DatabaseTabsBar } from '../components/database/DatabaseTabsBar';
import { DatabaseWorkspace, type WorkspaceStatus } from '../components/database/DatabaseWorkspace';
import { requestConfirm } from '../components/ui/confirmService';

export { DEFAULT_SQL_SNIPPETS };
export type { ExecutionHistoryItem };

export interface DatabasePageProps {
  settingsVersion?: number;
  onNavigateToSettings?: () => void;
}

export const DatabasePage: React.FC<DatabasePageProps> = ({ settingsVersion, onNavigateToSettings }) => {
  const tour = usePageTour(DATABASE_TOUR_STORAGE_KEY);
  const [customSnippets, setCustomSnippets] = useState<SqlSnippet[]>(readStoredSnippets);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  // "Descrever tabela": alvo aberto no painel de especificação (null = fechado)
  const [specTarget, setSpecTarget] = useState<SpecTarget | null>(null);

  // Abas de consulta (texto + conexão de cada uma); o resultado e a transação vivem no workspace da aba
  const [tabsState, setTabsState] = useState<QueryTabsState>(readStoredTabs);
  const [workspaceStatus, setWorkspaceStatus] = useState<Record<string, WorkspaceStatus | undefined>>({});

  const layout = useDatabaseLayout();
  // O SQL inicial agora vem das abas; o hook de conexões só carrega e edita as conexões
  const conn = useDatabaseConnections({ settingsVersion, setSql: () => undefined, setCustomSnippets });
  const historyState = useDatabaseHistory();

  const activeTab = getActiveTab(tabsState);
  const activeConnectionId = activeTab?.connectionId ?? '';
  const activeConnection = useMemo(
    () => conn.connections.find((c) => c.id === activeConnectionId) ?? null,
    [conn.connections, activeConnectionId]
  );

  const schema = useDatabaseSchema(activeConnection, activeConnectionId);
  const objectBrowser = useDatabaseObjects(activeConnection, activeConnectionId, schema.tableFilter);

  useEffect(() => {
    storeTabs(tabsState);
  }, [tabsState]);

  // Conexões carregadas (ou alteradas): descarta abas de conexões apagadas e garante ao menos uma aba
  useEffect(() => {
    setTabsState((prev) => reconcileTabs(prev, conn.connections));
  }, [conn.connections]);

  const handleStatusChange = useCallback((id: string, status: WorkspaceStatus) => {
    setWorkspaceStatus((prev) => {
      const old = prev[id];
      return old && old.gridPending === status.gridPending && old.txPending === status.txPending ? prev : { ...prev, [id]: status };
    });
  }, []);

  // Um handler estável por aba: o workspace usa o callback em dependências de hooks
  const sqlHandlers = useRef(new Map<string, (sql: string) => void>());
  const sqlHandlerFor = (tabId: string) => {
    let handler = sqlHandlers.current.get(tabId);
    if (!handler) {
      handler = (sql: string) => setTabsState((s) => setTabSql(s, tabId, sql));
      sqlHandlers.current.set(tabId, handler);
    }
    return handler;
  };

  const setActiveSql = (updater: string | ((prev: string) => string)) => {
    setTabsState((s) => {
      const current = getActiveTab(s);
      if (!current) return s;
      return setTabSql(s, current.id, typeof updater === 'function' ? updater(current.sql) : updater);
    });
  };

  const handleSelectConnection = (connectionId: string) => {
    const target = conn.connections.find((c) => c.id === connectionId);
    setTabsState((s) => openConnectionTab(s, connectionId, defaultSqlFor(target?.type)));
  };

  const handleNewTab = () => {
    const target = activeConnection ?? conn.connections.find((c) => c.isDefault) ?? conn.connections[0];
    if (!target) return;
    setTabsState((s) => addTab(s, { connectionId: target.id, sql: defaultSqlFor(target.type) }));
  };

  const handleCloseTab = async (id: string) => {
    const st = workspaceStatus[id];
    const tab = tabsState.tabs.find((t) => t.id === id);
    if (st && (st.gridPending > 0 || st.txPending > 0)) {
      const parts = [
        st.txPending > 0 ? `${st.txPending} comando(s) sem commit (serão desfeitos com rollback)` : '',
        st.gridPending > 0 ? `${st.gridPending} alteração(ões) do grid não aplicadas` : ''
      ].filter(Boolean);
      const confirmed = await requestConfirm({
        title: 'Fechar aba com alterações pendentes?',
        message: `A aba "${tab?.title ?? ''}" tem alterações pendentes:\n  • ${parts.join('\n  • ')}\n\nFechar mesmo assim?`,
        confirmLabel: 'Fechar aba',
        tone: 'warning'
      });
      if (!confirmed) return;
    }
    sqlHandlers.current.delete(id);
    setWorkspaceStatus((prev) => {
      const rest = { ...prev };
      delete rest[id];
      return rest;
    });
    setTabsState((s) => closeTab(s, id));
  };

  const handleTableClick = (rawName: string) => {
    // Nomes com maiúsculas ou símbolos precisam de aspas (ex.: public."Clientes" no PostgreSQL)
    const tableName = activeConnection ? quoteTableName(rawName, activeConnection.type) : rawName;
    let statement = '';
    if (activeConnection?.type === 'oracle') {
      statement = `SELECT * FROM ${tableName} WHERE ROWNUM <= 100`;
    } else if (activeConnection?.type === 'postgres' || activeConnection?.type === 'mysql') {
      statement = `SELECT * FROM ${tableName} LIMIT 100`;
    } else {
      statement = `SELECT * FROM ${tableName}`;
    }
    setActiveSql(statement);
  };

  const handleInsertColumnName = (colName: string) => {
    setActiveSql((prev) => (prev ? `${prev} ${colName}` : colName));
  };

  const layoutProps = {
    isEditorMaximized: layout.isEditorMaximized,
    setEditorMaximized: layout.handleSetEditorMaximized,
    isSidebarCollapsed: layout.isSidebarCollapsed,
    toggleSidebar: layout.handleToggleSidebar
  };

  const handleDescribeObject = useCallback((name: string) => setSpecTarget({ name, type: 'TABLE' }), []);
  const handleOpenBackup = useCallback(() => setIsBackupModalOpen(true), []);

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden select-none">
      <h1 className="sr-only">Banco de Dados</h1>
      {conn.settings && conn.connections.length === 0 && (
        <DatabaseFirstUseBanner
          onOpenCreateModal={conn.handleOpenCreateModal}
          onNavigateToSettings={onNavigateToSettings}
        />
      )}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar de Conexões e Tabelas */}
        <DatabaseSidebar
          connections={conn.connections}
          activeConnectionId={activeConnectionId}
          setActiveConnectionId={handleSelectConnection}
          onOpenCreateModal={conn.handleOpenCreateModal}
          onOpenEditModal={conn.handleOpenEditModal}
          onDeleteConnection={conn.handleDeleteConnection}
          tables={schema.tables}
          tablesError={schema.tablesError}
          filteredTables={schema.filteredTables}
          tableFilter={schema.tableFilter}
          setTableFilter={schema.setTableFilter}
          isLoadingTables={schema.isLoadingTables}
          onFetchTables={schema.fetchTables}
          expandedTable={schema.expandedTable}
          tableColumns={schema.tableColumns}
          isLoadingColumns={schema.isLoadingColumns}
          onToggleTableExpand={schema.handleToggleTableExpand}
          onTableClick={handleTableClick}
          onInsertColumnName={handleInsertColumnName}
          onOpenTour={tour.open}
          activeConnection={activeConnection}
          getDbBadge={getDbBadge}
          isCollapsed={layout.isSidebarCollapsed}
          onToggleCollapse={layout.handleToggleSidebar}
          onOpenSpec={(name, type) => setSpecTarget({ name, type })}
          objectType={objectBrowser.objectType}
          onObjectTypeChange={objectBrowser.setObjectType}
          objectsOfType={objectBrowser.objectsOfType}
          objectCounts={objectBrowser.counts}
          isLoadingObjects={objectBrowser.isLoadingObjects}
          onFetchObjects={objectBrowser.fetchObjects}
        />

        {/* Área principal: abas de consulta, cada uma com o seu editor e o seu resultado */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {tabsState.tabs.length > 0 && (
            <DatabaseTabsBar
              tabs={tabsState.tabs}
              activeId={tabsState.activeId}
              connections={conn.connections}
              status={workspaceStatus}
              onSelect={(id) => setTabsState((s) => selectTab(s, id))}
              onClose={handleCloseTab}
              onNew={handleNewTab}
              canAdd={tabsState.tabs.length < MAX_QUERY_TABS}
            />
          )}

          {/* Todas as abas ficam montadas (só a ativa aparece): trocar de aba não apaga o resultado das outras */}
          {tabsState.tabs.map((tab) => {
            const tabConnection = conn.connections.find((c) => c.id === tab.connectionId);
            if (!tabConnection) return null;
            const isActive = tab.id === tabsState.activeId;
            return (
              <div key={tab.id} className={isActive ? 'flex-1 flex flex-col min-h-0 min-w-0' : 'hidden'}>
                <DatabaseWorkspace
                  tab={tab}
                  connection={tabConnection}
                  onSqlChange={sqlHandlerFor(tab.id)}
                  tables={isActive ? schema.tables : []}
                  tableColumns={isActive ? schema.tableColumns : {}}
                  setTableColumns={schema.setTableColumns}
                  customSnippets={customSnippets}
                  setCustomSnippets={setCustomSnippets}
                  historyState={historyState}
                  layout={layoutProps}
                  onOpenBackup={handleOpenBackup}
                  onDescribeObject={handleDescribeObject}
                  onStatusChange={handleStatusChange}
                />
              </div>
            );
          })}
        </div>
      </div>

      <TableSpecModal
        target={specTarget}
        connection={activeConnection}
        onClose={() => setSpecTarget(null)}
        onSelectData={(name) => {
          handleTableClick(name);
          setSpecTarget(null);
        }}
      />

      {/* Modal de Conexão */}
      <ConnectionModal
        isOpen={conn.isModalOpen}
        onClose={() => conn.setIsModalOpen(false)}
        editingConn={conn.editingConn}
        setEditingConn={conn.setEditingConn}
        testResult={conn.testResult}
        isTesting={conn.isTesting}
        onTestConnection={conn.handleTestConnection}
        onSaveConnection={conn.handleSaveConnection}
        defaultPorts={DEFAULT_PORTS}
      />

      {/* Modal de Backup & Restore */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        activeConnection={activeConnection}
        connections={conn.connections}
        settings={conn.settings}
        onSettingsUpdate={(updater) => conn.setSettings(updater)}
      />

      <OnboardingTour
        steps={DATABASE_TOUR_STEPS}
        isOpen={tour.isOpen}
        onClose={tour.close}
        storageKey={DATABASE_TOUR_STORAGE_KEY}
      />
    </div>
  );
};
export default DatabasePage;
