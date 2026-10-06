import React, { useState } from 'react';
import { OnboardingTour } from '../components/onboarding/OnboardingTour';
import { usePageTour } from '../components/onboarding/usePageTour';
import { DATABASE_TOUR_STEPS, DATABASE_TOUR_STORAGE_KEY } from '../components/onboarding/pageTours/databaseTour';
import { SqlSnippet } from '../../../shared/types';
import { DEFAULT_PORTS } from '../utils/dbPageTypes';
import type { ExecutionHistoryItem } from '../utils/dbPageTypes';
import { useDatabaseLayout } from '../hooks/database/useDatabaseLayout';
import { useDatabaseConnections } from '../hooks/database/useDatabaseConnections';
import { useDatabaseSchema } from '../hooks/database/useDatabaseSchema';
import { useDatabaseQuery } from '../hooks/database/useDatabaseQuery';
import { quoteTableName } from '../../../shared/sqlIdentifierUtils';
import { useDatabaseObjects } from '../hooks/database/useDatabaseObjects';
import { TableSpecModal, type SpecTarget } from '../components/database/spec/TableSpecModal';
import { useDatabaseSnippets, readStoredSnippets } from '../hooks/database/useDatabaseSnippets';

// Subcomponentes Modularizados
import { DatabaseSidebar } from '../components/database/DatabaseSidebar';
import { SqlEditorArea, DEFAULT_SQL_SNIPPETS } from '../components/database/SqlEditorArea';
import { ResultsDataGrid } from '../components/database/ResultsDataGrid';
import { ConnectionModal } from '../components/database/ConnectionModal';
import { BackupModal } from '../components/database/BackupModal';
import { SaveSnippetModal } from '../components/database/SaveSnippetModal';
import { BindVariablesModal } from '../components/database/BindVariablesModal';
import { StatementTracerPanel } from '../components/database/StatementTracerPanel';
import { getDbBadge } from '../components/database/DatabaseBadge';
import { DatabaseFirstUseBanner } from '../components/database/DatabaseFirstUseBanner';
import { DatabaseResultsHeader } from '../components/database/DatabaseResultsHeader';
import { DatabaseExplainPanel } from '../components/database/DatabaseExplainPanel';
import { DatabaseHistoryPanel } from '../components/database/DatabaseHistoryPanel';
import { DatabaseMaximizedBar } from '../components/database/DatabaseMaximizedBar';

export { DEFAULT_SQL_SNIPPETS };
export type { ExecutionHistoryItem };

export interface DatabasePageProps {
  settingsVersion?: number;
  onNavigateToSettings?: () => void;
}

export const DatabasePage: React.FC<DatabasePageProps> = ({ settingsVersion, onNavigateToSettings }) => {
  const tour = usePageTour(DATABASE_TOUR_STORAGE_KEY);
  const [sql, setSql] = useState<string>('SELECT 1 FROM DUAL');
  const [customSnippets, setCustomSnippets] = useState<SqlSnippet[]>(readStoredSnippets);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  // "Descrever tabela": alvo aberto no painel de especificação (null = fechado)
  const [specTarget, setSpecTarget] = useState<SpecTarget | null>(null);

  const layout = useDatabaseLayout();
  const conn = useDatabaseConnections({ settingsVersion, setSql, setCustomSnippets });
  const { activeConnection } = conn;
  const schema = useDatabaseSchema(activeConnection, conn.activeConnectionId);
  const objectBrowser = useDatabaseObjects(activeConnection, conn.activeConnectionId, schema.tableFilter);
  const query = useDatabaseQuery({
    sql,
    setSql,
    activeConnection,
    activeConnectionId: conn.activeConnectionId,
    tableColumns: schema.tableColumns,
    setTableColumns: schema.setTableColumns
  });
  const { view, historyState, binds, mutations } = query;
  const snippets = useDatabaseSnippets({
    customSnippets,
    setCustomSnippets,
    sql,
    setSql,
    activeConnection,
    executeSql: query.handleExecuteSql
  });

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
    setSql(statement);
  };

  const handleInsertColumnName = (colName: string) => {
    setSql((prev) => (prev ? `${prev} ${colName}` : colName));
  };

  const renderResultContent = () => {
    switch (query.activeResultTab) {
      case 'grid':
        return (
          <ResultsDataGrid
            queryResult={query.queryResult}
            isExecuting={query.isExecuting}
            processedRows={view.processedRows}
            searchTerm={view.searchTerm}
            setSearchTerm={view.setSearchTerm}
            columnFilters={view.columnFilters}
            setColumnFilters={view.setColumnFilters}
            sortConfig={view.sortConfig}
            onToggleSort={view.handleToggleSort}
            hasActiveFilters={view.hasActiveFilters}
            onClearAllFilters={view.handleClearAllFilters}
            columnDataTypes={view.columnDataTypes}
            selectedRowIndex={view.selectedRowIndex}
            setSelectedRowIndex={view.setSelectedRowIndex}
            activeColumnMenu={view.activeColumnMenu}
            setActiveColumnMenu={view.setActiveColumnMenu}
            cellContextMenu={view.cellContextMenu}
            setCellContextMenu={view.setCellContextMenu}
            onCopyCell={view.handleCopyCell}
            onFilterByCellValue={view.handleFilterByCellValue}
            editableTableName={query.editableTable?.name || null}
            editableColumns={query.editableTable?.columns || []}
            isMutatingRow={mutations.isMutatingRow}
            onInsertRow={mutations.stageInsertRow}
            onUpdateCell={mutations.stageUpdateCell}
            onDeleteRow={mutations.stageDeleteRow}
            pending={mutations.pending}
            keyColumns={mutations.keyColumns}
            onApplyPending={mutations.applyPending}
            onDiscardPending={mutations.discardPending}
            onUnstageInsert={mutations.unstageInsertRow}
          />
        );
      case 'explain':
        return <DatabaseExplainPanel explainResult={query.explainResult} />;
      case 'tracer':
        return (
          <StatementTracerPanel
            activeConnection={activeConnection}
            onSelectSql={(newSql) => {
              setSql(newSql);
              query.setActiveResultTab('grid');
            }}
          />
        );
      default:
        return (
          <DatabaseHistoryPanel
            history={historyState.history}
            copyFeedback={view.copyFeedback}
            onCopySql={view.copyCellToClipboard}
            onClearHistory={historyState.handleClearHistory}
            onUseSql={setSql}
            onRunSql={(historySql) => {
              setSql(historySql);
              setTimeout(() => query.handleExecuteSql(), 50);
            }}
            onSaveSnippet={snippets.handleOpenCreateSnippet}
          />
        );
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden select-none">
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
          activeConnectionId={conn.activeConnectionId}
          setActiveConnectionId={conn.setActiveConnectionId}
          onOpenCreateModal={conn.handleOpenCreateModal}
          onOpenEditModal={conn.handleOpenEditModal}
          onDeleteConnection={conn.handleDeleteConnection}
          tables={schema.tables}
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

        {/* Área Principal: Editor SQL e Resultados */}
        <main className="flex-1 flex flex-col overflow-hidden bg-background">
          <SqlEditorArea
            sql={sql}
            setSql={setSql}
            activeConnection={activeConnection}
            isExecuting={query.isExecuting}
            onExecuteSql={query.handleExecuteSql}
            onExecuteScript={query.handleExecuteScript}
            isExplaining={query.isExplaining}
            onExplainPlan={query.handleExplainPlan}
            maxRows={query.maxRows}
            setMaxRows={query.setMaxRows}
            onOpenBindModal={binds.handleOpenBindModalManually}
            onOpenBackupModal={() => setIsBackupModalOpen(true)}
            onOpenCreateSnippet={snippets.handleOpenCreateSnippet}
            customSnippets={customSnippets}
            onSelectSnippet={snippets.handleSelectSnippet}
            onExecuteSnippetDirectly={snippets.handleExecuteSnippetDirectly}
            onEditSnippet={snippets.handleOpenEditSnippet}
            onDeleteSnippet={snippets.handleDeleteCustomSnippet}
            tables={schema.tables}
            tableColumns={schema.tableColumns}
            setTableColumns={schema.setTableColumns}
            getDbBadge={getDbBadge}
            copyFeedback={view.copyFeedback}
            isMaximized={layout.isEditorMaximized}
            setIsMaximized={layout.handleSetEditorMaximized}
            isSidebarCollapsed={layout.isSidebarCollapsed}
            onToggleSidebar={layout.handleToggleSidebar}
            onDescribeObject={(name) => setSpecTarget({ name, type: 'TABLE' })}
            transaction={
              query.tx.supported && activeConnection
                ? {
                    mode: query.tx.mode,
                    state: query.tx.state,
                    isProduction: !!activeConnection.isProduction,
                    onChangeMode: query.tx.changeMode,
                    onCommit: query.tx.commit,
                    onRollback: query.tx.rollback,
                    onCancel: query.tx.cancel
                  }
                : undefined
            }
          />

          {!layout.isEditorMaximized ? (
            <>
              <DatabaseResultsHeader
                activeTab={query.activeResultTab}
                onChangeTab={query.setActiveResultTab}
                historyCount={historyState.history.length}
                isExecuting={query.isExecuting}
                queryResult={query.queryResult}
                onExport={view.handleExport}
                onLoadMore={query.handleLoadMore}
                nextLimit={query.nextLimit}
              />
              {/* Conteúdo: Grid de Resultados, Explain, Tracer ou Histórico */}
              <div className="flex-1 overflow-auto bg-card/20" data-tour="results-panel">
                {renderResultContent()}
              </div>
            </>
          ) : (
            <DatabaseMaximizedBar onRestore={() => layout.handleSetEditorMaximized(false)} />
          )}
        </main>
      </div>

      {/* Modal de Conexão */}
      <TableSpecModal
        target={specTarget}
        connection={activeConnection}
        onClose={() => setSpecTarget(null)}
        onSelectData={(name) => {
          handleTableClick(name);
          setSpecTarget(null);
        }}
      />

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

      {/* Modal de Salvar / Editar Consulta Personalizada */}
      <SaveSnippetModal
        isOpen={snippets.isSaveSnippetModalOpen}
        onClose={() => snippets.setIsSaveSnippetModalOpen(false)}
        editingSnippetId={snippets.editingSnippetId}
        snippetTitle={snippets.snippetTitle}
        setSnippetTitle={snippets.setSnippetTitle}
        snippetCategory={snippets.snippetCategory}
        setSnippetCategory={snippets.setSnippetCategory}
        snippetDesc={snippets.snippetDesc}
        setSnippetDesc={snippets.setSnippetDesc}
        snippetSql={snippets.snippetSql}
        setSnippetSql={snippets.setSnippetSql}
        onSave={snippets.handleSaveCustomSnippet}
      />

      {/* Modal de Variáveis de Bind (:PARAMETRO) */}
      <BindVariablesModal
        isOpen={binds.isBindModalOpen}
        onClose={() => binds.setIsBindModalOpen(false)}
        bindInputs={binds.bindInputs}
        setBindInputs={binds.setBindInputs}
        onConfirmExecute={binds.handleConfirmExecuteBinds}
        onSubstituteInline={binds.handleSubstituteBindsInline}
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
