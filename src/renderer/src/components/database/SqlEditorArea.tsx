import React, { useState, useRef, useMemo } from 'react';
import type {
  DatabaseConnectionConfig,
  DatabaseType,
  SqlSnippet,
  TableColumnInfo
} from '../../../../shared/types';
import { extractSqlVariables } from '../../utils/sqlBinds';
import { formatSql, getSqlMetrics } from '../../utils/sqlFormatUtils';
import { DEFAULT_SQL_SNIPPETS } from '../../utils/sqlEditorSnippets';
import { useSqlEditorPrefs } from '../../hooks/database/useSqlEditorPrefs';
import { SqlEditorToolbar } from './sqleditor/SqlEditorToolbar';
import { MonacoSqlEditor, type MonacoSqlEditorHandle } from './sqleditor/MonacoSqlEditor';
import { SqlEditorStatusBar } from './sqleditor/SqlEditorStatusBar';
import { SqlTransactionBar, type SqlTransactionControls } from './sqleditor/SqlTransactionBar';

export { DEFAULT_SQL_SNIPPETS };

export interface SqlEditorAreaProps {
  sql: string;
  setSql: (sql: string | ((prev: string) => string)) => void;
  activeConnection: DatabaseConnectionConfig | null;
  isExecuting: boolean;
  onExecuteSql: (customSql?: string) => void;
  /** Executa todos os comandos do editor em sequência (F5). */
  onExecuteScript: (script: string) => void;
  isExplaining: boolean;
  onExplainPlan: () => void;
  maxRows: number;
  setMaxRows: (n: number) => void;
  onOpenBindModal: () => void;
  onOpenBackupModal: () => void;
  onOpenCreateSnippet: (initialSql?: string) => void;
  customSnippets: SqlSnippet[];
  onSelectSnippet: (snippet: SqlSnippet) => void;
  onExecuteSnippetDirectly: (snippet: SqlSnippet, e?: React.MouseEvent) => void;
  onEditSnippet: (snippet: SqlSnippet, e?: React.MouseEvent) => void;
  onDeleteSnippet: (id: string, e?: React.MouseEvent) => void;
  tables: string[];
  tableColumns: Record<string, TableColumnInfo[]>;
  setTableColumns: React.Dispatch<React.SetStateAction<Record<string, TableColumnInfo[]>>>;
  getDbBadge: (type: DatabaseType) => React.ReactNode;
  copyFeedback: string | null;
  isMaximized?: boolean;
  setIsMaximized?: React.Dispatch<React.SetStateAction<boolean>>;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  /** F4 no editor: descreve o objeto sob o cursor. */
  onDescribeObject?: (name: string) => void;
  /** Controle de transação (auto-commit/manual, commit, rollback, cancelar). Ausente = sem sessões dedicadas. */
  transaction?: SqlTransactionControls;
}

export const SqlEditorArea: React.FC<SqlEditorAreaProps> = ({
  sql,
  setSql,
  activeConnection,
  isExecuting,
  onExecuteSql,
  onExecuteScript,
  isExplaining,
  onExplainPlan,
  maxRows,
  setMaxRows,
  onOpenBindModal,
  onOpenBackupModal,
  onOpenCreateSnippet,
  customSnippets,
  onSelectSnippet,
  onExecuteSnippetDirectly,
  onEditSnippet,
  onDeleteSnippet,
  tables,
  tableColumns,
  setTableColumns,
  getDbBadge,
  copyFeedback,
  isMaximized,
  setIsMaximized,
  isSidebarCollapsed: _isSidebarCollapsed,
  onToggleSidebar: _onToggleSidebar,
  onDescribeObject,
  transaction
}) => {
  const prefs = useSqlEditorPrefs({ isMaximized, setIsMaximized });
  const [cursorPos, setCursorPos] = useState<number>(0);
  const editorRef = useRef<MonacoSqlEditorHandle | null>(null);

  const metrics = useMemo(() => getSqlMetrics(sql, cursorPos), [sql, cursorPos]);
  const detectedVariables = useMemo(() => extractSqlVariables(sql), [sql]);

  // Carrega as colunas de uma tabela para o autocomplete e as guarda no estado da tela (compartilhado com a sidebar)
  const loadColumns = async (tableKey: string): Promise<TableColumnInfo[]> => {
    if (!activeConnection || !window.electronAPI?.getDbTableColumns) return [];
    const cols = (await window.electronAPI.getDbTableColumns(activeConnection, tableKey)) ?? [];
    setTableColumns((prev) => ({ ...prev, [tableKey]: cols }));
    return cols;
  };

  // O botão e o atalho executam o mesmo: a seleção ou, sem seleção, o comando sob o cursor
  const runCurrent = () => onExecuteSql(editorRef.current?.getRunnableSql() ?? sql);
  const runScript = () => onExecuteScript(editorRef.current?.getAllSql() ?? sql);

  return (
    <div className="flex flex-col shrink-0">
      <SqlEditorToolbar
        sql={sql}
        activeConnection={activeConnection}
        isExecuting={isExecuting}
        onExecuteSql={runCurrent}
        onExecuteScript={runScript}
        isExplaining={isExplaining}
        onExplainPlan={onExplainPlan}
        maxRows={maxRows}
        setMaxRows={setMaxRows}
        onOpenBindModal={onOpenBindModal}
        onOpenBackupModal={onOpenBackupModal}
        onOpenCreateSnippet={onOpenCreateSnippet}
        customSnippets={customSnippets}
        onSelectSnippet={onSelectSnippet}
        onExecuteSnippetDirectly={onExecuteSnippetDirectly}
        onEditSnippet={onEditSnippet}
        onDeleteSnippet={onDeleteSnippet}
        getDbBadge={getDbBadge}
        isMaximizedActual={prefs.isMaximizedActual}
        toggleMaximize={prefs.toggleMaximize}
        detectedVariables={detectedVariables}
      />

      {transaction && <SqlTransactionBar {...transaction} isExecuting={isExecuting} />}

      {/* Editor SQL (Monaco) com altura ajustável */}
      <div
        className={`border-b border-border/70 relative overflow-hidden shrink-0 bg-[#0B0F17] ${
          prefs.isMaximizedActual ? 'flex-1 h-full min-h-[350px]' : ''
        }`}
        style={!prefs.isMaximizedActual ? { height: `${prefs.editorHeight}px` } : undefined}
        data-tour="sql-editor"
      >
        <MonacoSqlEditor
          ref={editorRef}
          value={sql}
          onChange={setSql}
          dialect={activeConnection?.type ?? 'oracle'}
          cacheKey={activeConnection?.id ?? ''}
          tables={tables}
          tableColumns={tableColumns}
          loadColumns={loadColumns}
          fontSize={prefs.fontSize}
          wordWrap={prefs.wordWrap}
          onRun={onExecuteSql}
          onRunScript={onExecuteScript}
          onCommit={transaction?.onCommit}
          onRollback={transaction?.onRollback}
          onCursorChange={setCursorPos}
          onDescribeObject={onDescribeObject}
        />
        {copyFeedback && (
          <div className="absolute right-3 bottom-3 z-10 bg-primary text-primary-foreground text-2xs font-bold px-2 py-1 rounded shadow-md animate-fade-in">
            {copyFeedback}
          </div>
        )}
      </div>

      <SqlEditorStatusBar
        sql={sql}
        metrics={metrics}
        wordWrap={prefs.wordWrap}
        fontSize={prefs.fontSize}
        onFormatSql={() => setSql(formatSql(sql))}
        onToggleWordWrap={prefs.handleToggleWordWrap}
        onZoomIn={prefs.handleZoomIn}
        onZoomOut={prefs.handleZoomOut}
      />

      {/* Divisor Arrastável (Splitter Vertical) */}
      {!prefs.isMaximizedActual && (
        <div
          onMouseDown={prefs.handleSplitterMouseDown}
          onDoubleClick={prefs.toggleMaximize}
          className="h-2 bg-card hover:bg-primary/30 active:bg-primary/50 transition cursor-row-resize flex items-center justify-center shrink-0 border-b border-border/70 group"
          title="Clique e arraste para redimensionar a altura do editor | Duplo clique para maximizar"
        >
          <div className="w-10 h-1 rounded-full bg-border group-hover:bg-primary transition" />
        </div>
      )}
    </div>
  );
};
