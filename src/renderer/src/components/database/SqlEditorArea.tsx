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
import { useSqlEditorAutocomplete } from '../../hooks/database/useSqlEditorAutocomplete';
import { SqlEditorToolbar } from './sqleditor/SqlEditorToolbar';
import { SqlEditorSurface } from './sqleditor/SqlEditorSurface';
import { SqlEditorStatusBar } from './sqleditor/SqlEditorStatusBar';
import { SqlTransactionBar, type SqlTransactionControls } from './sqleditor/SqlTransactionBar';

export { DEFAULT_SQL_SNIPPETS };

export interface SqlEditorAreaProps {
  sql: string;
  setSql: (sql: string | ((prev: string) => string)) => void;
  activeConnection: DatabaseConnectionConfig | null;
  isExecuting: boolean;
  onExecuteSql: (customSql?: string) => void;
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
  isLoadingColumns: Record<string, boolean>;
  setIsLoadingColumns: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setTableColumns: React.Dispatch<React.SetStateAction<Record<string, TableColumnInfo[]>>>;
  getDbBadge: (type: DatabaseType) => React.ReactNode;
  copyFeedback: string | null;
  isMaximized?: boolean;
  setIsMaximized?: React.Dispatch<React.SetStateAction<boolean>>;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  /** Controle de transação (auto-commit/manual, commit, rollback, cancelar). Ausente = sem sessões dedicadas. */
  transaction?: SqlTransactionControls;
}

export const SqlEditorArea: React.FC<SqlEditorAreaProps> = ({
  sql,
  setSql,
  activeConnection,
  isExecuting,
  onExecuteSql,
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
  isLoadingColumns,
  setIsLoadingColumns,
  setTableColumns,
  getDbBadge,
  copyFeedback,
  isMaximized,
  setIsMaximized,
  isSidebarCollapsed: _isSidebarCollapsed,
  onToggleSidebar: _onToggleSidebar,
  transaction
}) => {
  const prefs = useSqlEditorPrefs({ isMaximized, setIsMaximized });
  const [cursorPos, setCursorPos] = useState<number>(0);
  const lineNumbersRef = useRef<HTMLDivElement | null>(null);
  const sqlTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const autocompleteState = useSqlEditorAutocomplete({
    sql,
    setSql,
    activeConnection,
    onExecuteSql,
    tables,
    tableColumns,
    isLoadingColumns,
    setIsLoadingColumns,
    setTableColumns,
    sqlTextareaRef
  });

  const metrics = useMemo(() => getSqlMetrics(sql, cursorPos), [sql, cursorPos]);
  const linesArray = useMemo(() => {
    const count = sql.split('\n').length;
    return Array.from({ length: Math.max(1, count) }, (_, i) => i + 1);
  }, [sql]);

  const detectedVariables = useMemo(() => extractSqlVariables(sql), [sql]);

  const handleEditorScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // F11 confirma e F12 desfaz enquanto o foco está no editor (só no modo manual)
  const handleTransactionKeys = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!transaction || transaction.mode !== 'manual' || isExecuting) return;
    if (e.key === 'F11') {
      e.preventDefault();
      transaction.onCommit();
    } else if (e.key === 'F12') {
      e.preventDefault();
      transaction.onRollback();
    }
  };

  return (
    <div className="flex flex-col shrink-0" onKeyDown={handleTransactionKeys}>
      <SqlEditorToolbar
        sql={sql}
        activeConnection={activeConnection}
        isExecuting={isExecuting}
        onExecuteSql={onExecuteSql}
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

      {/* Editor de Código SQL com Gutter de Linhas e Altura Ajustável */}
      <SqlEditorSurface
        sql={sql}
        isMaximizedActual={prefs.isMaximizedActual}
        editorHeight={prefs.editorHeight}
        fontSize={prefs.fontSize}
        wordWrap={prefs.wordWrap}
        linesArray={linesArray}
        currentLine={metrics.currentLine}
        autocomplete={autocompleteState.autocomplete}
        copyFeedback={copyFeedback}
        sqlTextareaRef={sqlTextareaRef}
        lineNumbersRef={lineNumbersRef}
        onChange={autocompleteState.handleSqlChange}
        onKeyDown={autocompleteState.handleKeyDown}
        onCursorChange={setCursorPos}
        onScroll={handleEditorScroll}
        onClickCompute={(caret) => autocompleteState.computeAutocomplete(sql, caret)}
        onBlur={autocompleteState.dismissAutocompleteDelayed}
        onApplySuggestion={autocompleteState.applyAutocompleteSuggestion}
      />

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
