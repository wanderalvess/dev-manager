import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { TableColumnInfo } from '../../../../../shared/types';
import type { SqlDialect } from '../../../../../shared/sqlStatementUtils';
import { findStatementAt } from '../../../../../shared/sqlSplitUtils';
import { formatSql } from '../../../utils/sqlFormatUtils';
import { monaco } from './monacoEntry';
import {
  SQL_THEME,
  ensureSqlSupport,
  languageFor,
  registerEditorContext,
  unregisterEditorContext
} from './monacoSqlSetup';

export interface MonacoSqlEditorHandle {
  focus: () => void;
  /** Seleção, se houver; senão o comando sob o cursor (como o Ctrl+Enter do SQL Developer). */
  getRunnableSql: () => string;
  getAllSql: () => string;
}

interface MonacoSqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  dialect: SqlDialect;
  /** Muda quando a conexão muda: o cache de colunas deixa de valer. */
  cacheKey: string;
  tables: string[];
  tableColumns: Record<string, TableColumnInfo[]>;
  /** Carrega as colunas de uma tabela (e as guarda no estado da tela). */
  loadColumns: (tableKey: string) => Promise<TableColumnInfo[]>;
  fontSize: number;
  wordWrap: boolean;
  onRun: (sql: string) => void;
  onRunScript: (sql: string) => void;
  onCommit?: () => void;
  onRollback?: () => void;
  onCursorChange?: (offset: number) => void;
}

let modelCounter = 0;

/** Editor SQL baseado em Monaco: destaque de sintaxe, autocomplete com colunas, executar seleção/comando atual. */
export const MonacoSqlEditor = forwardRef<MonacoSqlEditorHandle, MonacoSqlEditorProps>((props, ref) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  // Sempre a versão mais recente das props, para os comandos do Monaco (registrados uma vez) não ficarem velhos
  const latest = useRef(props);
  latest.current = props;
  const columnCache = useRef(new Map<string, TableColumnInfo[]>());
  const pendingLoads = useRef(new Map<string, Promise<void>>());

  const getRunnableSql = (): string => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!editor || !model) return latest.current.value;
    const selection = editor.getSelection();
    if (selection && !selection.isEmpty()) return model.getValueInRange(selection);
    const offset = model.getOffsetAt(editor.getPosition() ?? { lineNumber: 1, column: 1 });
    return findStatementAt(model.getValue(), offset)?.text ?? model.getValue();
  };

  useImperativeHandle(ref, () => ({
    focus: () => editorRef.current?.focus(),
    getRunnableSql,
    getAllSql: () => editorRef.current?.getValue() ?? latest.current.value
  }));

  useEffect(() => {
    if (!containerRef.current) return;
    ensureSqlSupport();

    const uri = monaco.Uri.parse(`inmemory://hub-manager/sql-${++modelCounter}.sql`);
    const model = monaco.editor.createModel(latest.current.value, languageFor(latest.current.dialect), uri);
    const editor = monaco.editor.create(containerRef.current, {
      model,
      theme: SQL_THEME,
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: latest.current.fontSize,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
      lineHeight: Math.round(latest.current.fontSize * 1.6),
      wordWrap: latest.current.wordWrap ? 'on' : 'off',
      scrollBeyondLastLine: false,
      lineNumbersMinChars: 3,
      glyphMargin: false,
      folding: false,
      padding: { top: 8, bottom: 8 },
      renderLineHighlight: 'line',
      tabSize: 2,
      insertSpaces: true,
      placeholder: 'Digite aqui seu comando SQL (SELECT, UPDATE, INSERT, DELETE, etc.)...',
      // Sugestões enquanto digita (inclusive após o ponto); só do dicionário e do schema, nunca palavras do texto
      quickSuggestions: { other: true, comments: false, strings: false },
      suggestOnTriggerCharacters: true,
      wordBasedSuggestions: 'off',
      suggest: { showIcons: true, snippetsPreventQuickSuggestions: false },
      acceptSuggestionOnEnter: 'on',
      fixedOverflowWidgets: true,
      scrollbar: { alwaysConsumeMouseWheel: false }
    });
    editorRef.current = editor;

    const modelUri = uri.toString();
    registerEditorContext(modelUri, {
      getContext: () => ({
        dialect: latest.current.dialect,
        tables: latest.current.tables,
        getColumns: (key) => columnCache.current.get(key) ?? latest.current.tableColumns[key]
      }),
      loadColumns: (key) => {
        if (columnCache.current.has(key) || latest.current.tableColumns[key]) return Promise.resolve();
        const inflight = pendingLoads.current.get(key);
        if (inflight) return inflight;
        const load = latest.current
          .loadColumns(key)
          .then((cols) => {
            columnCache.current.set(key, cols ?? []);
          })
          .catch(() => {
            columnCache.current.set(key, []);
          })
          .finally(() => pendingLoads.current.delete(key));
        pendingLoads.current.set(key, load);
        return load;
      }
    });

    const changeSub = editor.onDidChangeModelContent(() => {
      latest.current.onChange(editor.getValue());
    });
    const cursorSub = editor.onDidChangeCursorPosition((e) => {
      latest.current.onCursorChange?.(model.getOffsetAt(e.position));
    });

    const { KeyMod, KeyCode } = monaco;
    editor.addAction({
      id: 'hub.sql.run',
      label: 'Executar seleção ou comando atual',
      keybindings: [KeyMod.CtrlCmd | KeyCode.Enter],
      run: () => latest.current.onRun(getRunnableSql())
    });
    editor.addAction({
      id: 'hub.sql.runScript',
      label: 'Executar script (todos os comandos)',
      keybindings: [KeyCode.F5],
      run: () => latest.current.onRunScript(editor.getValue())
    });
    editor.addAction({
      id: 'hub.sql.format',
      label: 'Formatar SQL',
      keybindings: [KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyF],
      run: () => {
        const selection = editor.getSelection();
        const useSelection = !!selection && !selection.isEmpty();
        const range = useSelection ? selection! : model.getFullModelRange();
        editor.executeEdits('hub-format', [{ range, text: formatSql(model.getValueInRange(range)) }]);
      }
    });
    editor.addAction({
      id: 'hub.sql.commit',
      label: 'Confirmar transação (commit)',
      keybindings: [KeyCode.F11],
      run: () => latest.current.onCommit?.()
    });
    editor.addAction({
      id: 'hub.sql.rollback',
      label: 'Desfazer transação (rollback)',
      keybindings: [KeyCode.F12],
      run: () => latest.current.onRollback?.()
    });

    return () => {
      changeSub.dispose();
      cursorSub.dispose();
      unregisterEditorContext(modelUri);
      editor.dispose();
      model.dispose();
      editorRef.current = null;
    };
  }, []);

  // Texto alterado de fora (snippet escolhido, tabela clicada...): troca o conteúdo sem perder o histórico de desfazer
  useEffect(() => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!editor || !model || editor.getValue() === props.value) return;
    editor.executeEdits('external', [{ range: model.getFullModelRange(), text: props.value }]);
  }, [props.value]);

  useEffect(() => {
    editorRef.current?.updateOptions({
      fontSize: props.fontSize,
      lineHeight: Math.round(props.fontSize * 1.6),
      wordWrap: props.wordWrap ? 'on' : 'off'
    });
  }, [props.fontSize, props.wordWrap]);

  useEffect(() => {
    const model = editorRef.current?.getModel();
    if (model) monaco.editor.setModelLanguage(model, languageFor(props.dialect));
  }, [props.dialect]);

  // Trocou de conexão: as colunas em cache podem ser de outro banco
  useEffect(() => {
    columnCache.current.clear();
  }, [props.cacheKey]);

  return <div ref={containerRef} className="w-full h-full" data-testid="monaco-sql-editor" />;
});

MonacoSqlEditor.displayName = 'MonacoSqlEditor';
