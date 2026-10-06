import React, { useCallback, useEffect, useRef } from 'react';
import type { DatabaseConnectionConfig, SqlSnippet, TableColumnInfo } from '../../../../shared/types';
import type { QueryTab } from '../../utils/queryTabsUtils';
import { useDatabaseQuery } from '../../hooks/database/useDatabaseQuery';
import { useDatabaseHistory } from '../../hooks/database/useDatabaseHistory';
import { useDatabaseSnippets } from '../../hooks/database/useDatabaseSnippets';
import { SqlEditorArea } from './SqlEditorArea';
import { ResultsDataGrid } from './ResultsDataGrid';
import { SaveSnippetModal } from './SaveSnippetModal';
import { BindVariablesModal } from './BindVariablesModal';
import { StatementTracerPanel } from './StatementTracerPanel';
import { getDbBadge } from './DatabaseBadge';
import { DatabaseResultsHeader } from './DatabaseResultsHeader';
import { DatabaseExplainPanel } from './DatabaseExplainPanel';
import { DatabaseHistoryPanel } from './DatabaseHistoryPanel';
import { DatabaseMaximizedBar } from './DatabaseMaximizedBar';

export interface WorkspaceStatus {
  /** Alterações do grid ainda não aplicadas. */
  gridPending: number;
  /** Comandos da transação manual ainda sem commit/rollback. */
  txPending: number;
}

export interface DatabaseWorkspaceProps {
  tab: QueryTab;
  connection: DatabaseConnectionConfig;
  onSqlChange: (sql: string) => void;
  /** Schema da conexão ATIVA da página (só vale para o workspace visível). */
  tables: string[];
  tableColumns: Record<string, TableColumnInfo[]>;
  setTableColumns: React.Dispatch<React.SetStateAction<Record<string, TableColumnInfo[]>>>;
  customSnippets: SqlSnippet[];
  setCustomSnippets: React.Dispatch<React.SetStateAction<SqlSnippet[]>>;
  historyState: ReturnType<typeof useDatabaseHistory>;
  layout: {
    isEditorMaximized: boolean;
    setEditorMaximized: (value: boolean | ((prev: boolean) => boolean)) => void;
    isSidebarCollapsed: boolean;
    toggleSidebar: () => void;
  };
  onOpenBackup: () => void;
  onDescribeObject: (name: string) => void;
  onStatusChange: (tabId: string, status: WorkspaceStatus) => void;
}

/**
 * Uma aba de consulta completa: editor, resultado, sessão e transação PRÓPRIOS. Fica montada mesmo quando oculta, por
 * isso trocar de aba (ou de banco) não apaga o resultado de nenhuma outra e dá para comparar dados entre conexões.
 */
export const DatabaseWorkspace: React.FC<DatabaseWorkspaceProps> = ({
  tab,
  connection,
  onSqlChange,
  tables,
  tableColumns,
  setTableColumns,
  customSnippets,
  setCustomSnippets,
  historyState,
  layout,
  onOpenBackup,
  onDescribeObject,
  onStatusChange
}) => {
  const sqlRef = useRef(tab.sql);
  sqlRef.current = tab.sql;
  const setSql = useCallback(
    (value: string | ((prev: string) => string)) => {
      const next = typeof value === 'function' ? value(sqlRef.current) : value;
      sqlRef.current = next;
      onSqlChange(next);
    },
    [onSqlChange]
  );

  const query = useDatabaseQuery({
    sql: tab.sql,
    setSql,
    activeConnection: connection,
    activeConnectionId: connection.id,
    tableColumns,
    setTableColumns,
    historyState
  });
  const { view, binds, mutations } = query;
  const snippets = useDatabaseSnippets({
    customSnippets,
    setCustomSnippets,
    sql: tab.sql,
    setSql,
    activeConnection: connection,
    executeSql: query.handleExecuteSql
  });

  // Avisa a página quando há algo a perder: ela pede confirmação antes de fechar a aba
  const gridPending = mutations.pendingCount;
  const txPending = query.tx.state?.pendingStatements ?? 0;
  useEffect(() => {
    onStatusChange(tab.id, { gridPending, txPending });
  }, [tab.id, gridPending, txPending, onStatusChange]);

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
            activeConnection={connection}
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
              setTimeout(() => query.handleExecuteSql(historySql), 50);
            }}
            onSaveSnippet={snippets.handleOpenCreateSnippet}
          />
        );
    }
  };

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-background min-w-0">
      <SqlEditorArea
        sql={tab.sql}
        setSql={setSql}
        activeConnection={connection}
        isExecuting={query.isExecuting}
        onExecuteSql={query.handleExecuteSql}
        onExecuteScript={query.handleExecuteScript}
        isExplaining={query.isExplaining}
        onExplainPlan={query.handleExplainPlan}
        maxRows={query.maxRows}
        setMaxRows={query.setMaxRows}
        onOpenBindModal={binds.handleOpenBindModalManually}
        onOpenBackupModal={onOpenBackup}
        onOpenCreateSnippet={snippets.handleOpenCreateSnippet}
        customSnippets={customSnippets}
        onSelectSnippet={snippets.handleSelectSnippet}
        onExecuteSnippetDirectly={snippets.handleExecuteSnippetDirectly}
        onEditSnippet={snippets.handleOpenEditSnippet}
        onDeleteSnippet={snippets.handleDeleteCustomSnippet}
        tables={tables}
        tableColumns={tableColumns}
        setTableColumns={setTableColumns}
        getDbBadge={getDbBadge}
        copyFeedback={view.copyFeedback}
        isMaximized={layout.isEditorMaximized}
        setIsMaximized={layout.setEditorMaximized as React.Dispatch<React.SetStateAction<boolean>>}
        isSidebarCollapsed={layout.isSidebarCollapsed}
        onToggleSidebar={layout.toggleSidebar}
        onDescribeObject={onDescribeObject}
        transaction={
          query.tx.supported
            ? {
                mode: query.tx.mode,
                state: query.tx.state,
                isProduction: !!connection.isProduction,
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
        <DatabaseMaximizedBar onRestore={() => layout.setEditorMaximized(false)} />
      )}

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
    </main>
  );
};
