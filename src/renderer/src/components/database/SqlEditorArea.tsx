import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Play,
  RotateCw,
  Zap,
  BookmarkPlus,
  SlidersHorizontal,
  HardDriveDownload,
  AlertCircle,
  Search,
  Plus,
  X,
  FileCode,
  Edit2,
  Trash2,
  Maximize2,
  Minimize2,
  AlignLeft,
  WrapText,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import {
  DatabaseConnectionConfig,
  DatabaseType,
  SqlSnippet,
  TableColumnInfo
} from '../../../../shared/types';
import { extractBindVariables, extractSqlVariables } from '../../utils/sqlBinds';
import { formatSql, getSqlMetrics } from '../../utils/sqlFormatUtils';

export const DEFAULT_SQL_SNIPPETS: SqlSnippet[] = [
  {
    id: 'oracle-active-sessions',
    title: 'Sessões Ativas no Banco (V$SESSION)',
    category: 'Oracle - Diagnóstico',
    description: 'Identifica sessões em execução no banco de dados',
    sql: "SELECT SID, SERIAL#, USERNAME, STATUS, OSUSER, MACHINE, PROGRAM FROM V$SESSION WHERE STATUS = 'ACTIVE' AND USERNAME IS NOT NULL",
    dbType: 'oracle'
  },
  {
    id: 'oracle-locks',
    title: 'Objetos Bloqueados (Locks)',
    category: 'Oracle - Diagnóstico',
    description: 'Diagnostica bloqueios em tabelas e concorrência no Oracle',
    sql: "SELECT L.SESSION_ID, S.SERIAL#, S.USERNAME, S.OSUSER, O.OBJECT_NAME, L.LOCKED_MODE FROM V$LOCKED_OBJECT L JOIN DBA_OBJECTS O ON L.OBJECT_ID = O.OBJECT_ID JOIN V$SESSION S ON L.SESSION_ID = S.SID",
    dbType: 'oracle'
  },
  {
    id: 'oracle-tablespaces',
    title: 'Uso de Tablespaces e Disco',
    category: 'Oracle - Infraestrutura',
    description: 'Verifica espaço alocado por tablespace',
    sql: "SELECT TABLESPACE_NAME, ROUND(SUM(BYTES)/(1024*1024), 2) AS TOTAL_MB FROM DBA_DATA_FILES GROUP BY TABLESPACE_NAME",
    dbType: 'oracle'
  }
];

const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL',
  'ORDER BY', 'GROUP BY', 'HAVING', 'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'ON',
  'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'DISTINCT', 'AS', 'LIMIT',
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ROWNUM', 'UNION', 'UNION ALL', 'EXISTS', 'CASE',
  'WHEN', 'THEN', 'ELSE', 'END', 'DESC', 'ASC'
];

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
  isSidebarCollapsed,
  onToggleSidebar
}) => {
  const [localMaximized, setLocalMaximized] = useState<boolean>(false);
  const isMaximizedActual = isMaximized !== undefined ? isMaximized : localMaximized;
  const toggleMaximize = () => {
    if (setIsMaximized) {
      setIsMaximized((prev) => !prev);
    } else {
      setLocalMaximized((prev) => !prev);
    }
  };

  const [editorHeight, setEditorHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('devManager:sqlEditorHeight');
      return saved ? Math.max(140, Math.min(800, Number(saved))) : 260;
    } catch {
      return 260;
    }
  });

  const [wordWrap, setWordWrap] = useState<boolean>(() => {
    try {
      return localStorage.getItem('devManager:sqlWordWrap') !== 'false';
    } catch {
      return true;
    }
  });

  const [fontSize, setFontSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('devManager:sqlFontSize');
      return saved ? Math.max(10, Math.min(18, Number(saved))) : 12;
    } catch {
      return 12;
    }
  });

  const [cursorPos, setCursorPos] = useState<number>(0);
  const lineNumbersRef = useRef<HTMLDivElement | null>(null);

  const [showSnippetsMenu, setShowSnippetsMenu] = useState<boolean>(false);
  const [savedQuerySearch, setSavedQuerySearch] = useState<string>('');
  const sqlTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [autocomplete, setAutocomplete] = useState<{
    suggestions: { label: string; type: 'keyword' | 'table' | 'column' }[];
    activeIndex: number;
    wordStart: number;
    wordEnd: number;
  } | null>(null);

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

  const handleFormatSql = () => {
    const formatted = formatSql(sql);
    setSql(formatted);
  };

  const handleToggleWordWrap = () => {
    setWordWrap((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('devManager:sqlWordWrap', String(next));
      } catch {}
      return next;
    });
  };

  const handleZoomIn = () => {
    setFontSize((prev) => {
      const next = Math.min(18, prev + 1);
      try {
        localStorage.setItem('devManager:sqlFontSize', String(next));
      } catch {}
      return next;
    });
  };

  const handleZoomOut = () => {
    setFontSize((prev) => {
      const next = Math.max(10, prev - 1);
      try {
        localStorage.setItem('devManager:sqlFontSize', String(next));
      } catch {}
      return next;
    });
  };

  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = editorHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientY - startY;
      const newHeight = Math.max(140, Math.min(window.innerHeight - 200, startHeight + delta));
      setEditorHeight(newHeight);
      try {
        localStorage.setItem('devManager:sqlEditorHeight', String(newHeight));
      } catch {}
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Extrai tabelas/aliases referenciados após FROM/JOIN para sugerir colunas com "alias.coluna"
  const referencedTables = useMemo(() => {
    const regex = /\b(?:FROM|JOIN)\s+([a-zA-Z0-9_."]+)(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?/gi;
    const result: { table: string; alias: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = regex.exec(sql)) !== null) {
      const rawTable = m[1].replace(/"/g, '');
      const alias = m[2] || rawTable.split('.').pop() || rawTable;
      result.push({ table: rawTable, alias });
    }
    return result;
  }, [sql]);

  // Garante que as colunas das tabelas referenciadas no SQL estejam carregadas para o autocomplete (com debounce de 400ms)
  useEffect(() => {
    if (!activeConnection || !window.electronAPI?.getDbTableColumns || referencedTables.length === 0) return;

    const timer = setTimeout(() => {
      referencedTables.forEach(({ table }) => {
        const tableUpper = table.toUpperCase();
        const known = tables.find(
          (t) => t.toUpperCase() === tableUpper || (t.split('.').pop() || '').toUpperCase() === tableUpper
        );
        const key = known || table;
        if (!tableColumns[key] && !isLoadingColumns[key]) {
          setIsLoadingColumns((prev) => ({ ...prev, [key]: true }));
          window.electronAPI
            .getDbTableColumns(activeConnection, key)
            .then((cols) => setTableColumns((prev) => ({ ...prev, [key]: cols || [] })))
            .catch(() => {})
            .finally(() => setIsLoadingColumns((prev) => ({ ...prev, [key]: false })));
        }
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [referencedTables, activeConnection, tables, tableColumns, isLoadingColumns, setIsLoadingColumns, setTableColumns]);

  const getCurrentWordRange = (text: string, caret: number) => {
    let start = caret;
    while (start > 0 && /[a-zA-Z0-9_.]/.test(text[start - 1])) start--;
    return { start, end: caret };
  };

  const computeAutocomplete = (text: string, caret: number) => {
    const { start, end } = getCurrentWordRange(text, caret);
    const word = text.slice(start, end);
    if (!word) {
      setAutocomplete(null);
      return;
    }

    const dotIdx = word.lastIndexOf('.');
    if (dotIdx >= 0) {
      const prefix = word.slice(0, dotIdx);
      const partial = word.slice(dotIdx + 1).toLowerCase();
      const ref = referencedTables.find((r) => r.alias.toLowerCase() === prefix.toLowerCase());
      const tableKey = ref
        ? tables.find((t) => t === ref.table || t.split('.').pop() === ref.table.split('.').pop()) || ref.table
        : undefined;
      const cols = tableKey ? tableColumns[tableKey] || [] : [];
      const suggestions = cols
        .filter((c) => c.name.toLowerCase().startsWith(partial))
        .slice(0, 15)
        .map((c) => ({ label: c.name, type: 'column' as const }));
      if (suggestions.length === 0) {
        setAutocomplete(null);
        return;
      }
      setAutocomplete({ suggestions, activeIndex: 0, wordStart: start + dotIdx + 1, wordEnd: end });
      return;
    }

    const lower = word.toLowerCase();
    const kwMatches = SQL_KEYWORDS.filter((k) => k.toLowerCase().startsWith(lower)).map((k) => ({
      label: k,
      type: 'keyword' as const
    }));
    const tblMatches = tables
      .filter((t) => t.toLowerCase().startsWith(lower) || (t.split('.').pop() || '').toLowerCase().startsWith(lower))
      .map((t) => ({ label: t, type: 'table' as const }));
    const colSet = new Map<string, { label: string; type: 'column' }>();
    referencedTables.forEach(({ table }) => {
      const key = tables.find((t) => t === table || t.split('.').pop() === table.split('.').pop()) || table;
      (tableColumns[key] || []).forEach((c) => {
        if (c.name.toLowerCase().startsWith(lower)) colSet.set(c.name, { label: c.name, type: 'column' });
      });
    });
    const suggestions = [...tblMatches, ...Array.from(colSet.values()), ...kwMatches].slice(0, 15);
    if (suggestions.length === 0) {
      setAutocomplete(null);
      return;
    }
    setAutocomplete({ suggestions, activeIndex: 0, wordStart: start, wordEnd: end });
  };

  const handleSqlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setSql(value);
    computeAutocomplete(value, e.target.selectionStart);
  };

  const applyAutocompleteSuggestion = (label: string) => {
    if (!autocomplete) return;
    const newSql = sql.slice(0, autocomplete.wordStart) + label + sql.slice(autocomplete.wordEnd);
    const caret = autocomplete.wordStart + label.length;
    setSql(newSql);
    setAutocomplete(null);
    requestAnimationFrame(() => {
      const el = sqlTextareaRef.current;
      if (el) {
        el.focus();
        el.selectionStart = el.selectionEnd = caret;
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (autocomplete) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAutocomplete((prev) =>
          prev ? { ...prev, activeIndex: (prev.activeIndex + 1) % prev.suggestions.length } : prev
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAutocomplete((prev) =>
          prev
            ? { ...prev, activeIndex: (prev.activeIndex - 1 + prev.suggestions.length) % prev.suggestions.length }
            : prev
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applyAutocompleteSuggestion(autocomplete.suggestions[autocomplete.activeIndex].label);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setAutocomplete(null);
        return;
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onExecuteSql();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newSql = sql.substring(0, start) + '  ' + sql.substring(end);
      setSql(newSql);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  const filteredCustomSnippets = useMemo(() => {
    if (!savedQuerySearch.trim()) return customSnippets;
    const term = savedQuerySearch.toLowerCase();
    return customSnippets.filter(
      (s) =>
        s.title.toLowerCase().includes(term) ||
        s.category.toLowerCase().includes(term) ||
        (s.description && s.description.toLowerCase().includes(term)) ||
        s.sql.toLowerCase().includes(term)
    );
  }, [customSnippets, savedQuerySearch]);

  const detectedBindsInEditor = useMemo(() => {
    return extractBindVariables(sql);
  }, [sql]);

  return (
    <div className="flex flex-col shrink-0">
      {/* Barra Superior do Editor */}
      <div className="p-2.5 bg-card/40 border-b border-border/70 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center space-x-2">
          {activeConnection ? (
            <div className="flex items-center space-x-2">
              {getDbBadge(activeConnection.type)}
              <span className="text-xs font-bold text-foreground">{activeConnection.name}</span>
              <span className="text-[11px] text-muted-foreground font-mono">
                ({activeConnection.user}@{activeConnection.database || activeConnection.host})
              </span>
            </div>
          ) : (
            <span className="text-xs text-amber-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Nenhuma conexão selecionada
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Menu Dropdown de Consultas Salvas */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setSavedQuerySearch('');
                setShowSnippetsMenu((prev) => !prev);
              }}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition shadow-xs cursor-pointer ${
                showSnippetsMenu
                  ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40'
                  : 'bg-card hover:bg-muted border border-border/70 text-foreground'
              }`}
              title="Minhas consultas SQL salvas e modelos"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-amber-500" />
              <span>Consultas Salvas</span>
              {customSnippets.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  {customSnippets.length}
                </span>
              )}
            </button>

            {showSnippetsMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSnippetsMenu(false)} />
                <div className="absolute right-0 mt-1 w-96 bg-card border border-border rounded-xl shadow-2xl z-50 p-2.5 space-y-2 text-xs animate-fade-in font-sans">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <div className="flex items-center space-x-1.5">
                      <BookmarkPlus className="w-4 h-4 text-amber-500" />
                      <span className="font-bold text-xs text-foreground">Consultas Salvas</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setShowSnippetsMenu(false);
                          onOpenCreateSnippet();
                        }}
                        className="flex items-center space-x-1 px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-black rounded text-[11px] font-bold transition cursor-pointer"
                        title="Salvar consulta atual do editor"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Nova</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSnippetsMenu(false)}
                        className="text-muted-foreground hover:text-foreground p-1 rounded cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Campo de Busca em Consultas Salvas */}
                  <div className="relative">
                    <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={savedQuerySearch}
                      onChange={(e) => setSavedQuerySearch(e.target.value)}
                      placeholder="Buscar por nome, categoria ou comando..."
                      className="w-full pl-7 pr-6 py-1 bg-background border border-border rounded text-[11px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary font-sans"
                      autoFocus
                    />
                    {savedQuerySearch && (
                      <button
                        type="button"
                        onClick={() => setSavedQuerySearch('')}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto space-y-2 pr-0.5">
                    {/* Seção: Minhas Consultas Salvas */}
                    <div>
                      <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wider px-1 mb-1">
                        Minhas Consultas ({filteredCustomSnippets.length})
                      </div>

                      {filteredCustomSnippets.length === 0 ? (
                        <div className="p-3 text-center bg-muted/20 border border-dashed border-border rounded-lg text-muted-foreground text-[11px] space-y-1.5">
                          <p>
                            {savedQuerySearch
                              ? 'Nenhuma consulta salva encontrada para a busca.'
                              : 'Nenhuma consulta personalizada salva ainda.'}
                          </p>
                          {!savedQuerySearch && (
                            <button
                              type="button"
                              onClick={() => {
                                setShowSnippetsMenu(false);
                                onOpenCreateSnippet();
                              }}
                              className="text-primary hover:underline font-bold text-[11px] block mx-auto cursor-pointer"
                            >
                              + Salvar consulta atual do editor
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {filteredCustomSnippets.map((s) => (
                            <div
                              key={s.id}
                              className="p-2 rounded-lg bg-card/60 hover:bg-muted/60 border border-border/60 hover:border-amber-500/40 transition flex flex-col space-y-1.5 group"
                            >
                              <div className="flex items-start justify-between gap-1.5">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center space-x-1.5 flex-wrap">
                                    <span className="font-bold text-xs text-foreground group-hover:text-primary transition truncate">
                                      {s.title}
                                    </span>
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold shrink-0">
                                      {s.category || 'Geral'}
                                    </span>
                                  </div>
                                  {s.description && (
                                    <span className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5 block">
                                      {s.description}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center space-x-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => onExecuteSnippetDirectly(s, e)}
                                    className="p-1 rounded bg-emerald-600/15 hover:bg-emerald-600 text-emerald-500 hover:text-white transition cursor-pointer"
                                    title="Executar imediatamente"
                                  >
                                    <Play className="w-3 h-3 fill-current" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onSelectSnippet(s)}
                                    className="p-1 rounded bg-primary/15 hover:bg-primary text-primary hover:text-primary-foreground transition cursor-pointer"
                                    title="Carregar no editor"
                                  >
                                    <FileCode className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      setShowSnippetsMenu(false);
                                      onEditSnippet(s, e);
                                    }}
                                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                                    title="Editar consulta salva"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => onDeleteSnippet(s.id, e)}
                                    className="p-1 rounded text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                                    title="Excluir consulta"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              <pre className="text-[10px] font-mono text-emerald-400/80 bg-[#0B0F17] p-1.5 rounded truncate max-h-12 overflow-hidden border border-border/40 select-none">
                                {s.sql}
                              </pre>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Seção: Modelos de Diagnóstico do Sistema */}
                    <div className="pt-2 border-t border-border/50">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1 mb-1">
                        Modelos de Diagnóstico
                      </div>
                      <div className="space-y-1">
                        {DEFAULT_SQL_SNIPPETS.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => onSelectSnippet(s)}
                            className="w-full text-left p-2 rounded-lg hover:bg-muted/70 text-foreground transition flex items-center justify-between group border border-transparent hover:border-border cursor-pointer"
                          >
                            <div className="min-w-0 flex-1 mr-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[11px] group-hover:text-primary truncate">
                                  {s.title}
                                </span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-mono shrink-0">
                                  {s.category.split('-')[0].trim()}
                                </span>
                              </div>
                              {s.description && (
                                <span className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5 block">
                                  {s.description}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => onExecuteSnippetDirectly(s, e)}
                              className="p-1 rounded hover:bg-emerald-600/20 text-emerald-500 transition shrink-0 opacity-0 group-hover:opacity-100 cursor-pointer"
                              title="Executar imediatamente"
                            >
                              <Play className="w-3 h-3 fill-current" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Botão Salvar Consulta Atual */}
          <button
            type="button"
            onClick={() => onOpenCreateSnippet()}
            disabled={!sql.trim()}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-card hover:bg-muted border border-border/70 rounded-lg text-xs font-semibold text-foreground transition shadow-xs disabled:opacity-50 cursor-pointer"
            title="Salvar consulta atual do editor nas minhas consultas"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-amber-500" />
            <span>Salvar Consulta</span>
          </button>

          {/* Botão de Backup do Banco */}
          <button
            type="button"
            data-tour="backup-button"
            onClick={onOpenBackupModal}
            disabled={!activeConnection}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-card hover:bg-muted border border-border/70 rounded-lg text-xs font-medium text-foreground transition shadow-xs disabled:opacity-50 cursor-pointer"
            title="Fazer backup do banco de dados conectado"
          >
            <HardDriveDownload className="w-3.5 h-3.5 text-sky-400" />
            <span>Backup</span>
          </button>

          {/* Botão de Maximizar / Restaurar Editor */}
          <button
            type="button"
            onClick={toggleMaximize}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition shadow-xs cursor-pointer ${
              isMaximizedActual
                ? 'bg-primary/20 text-primary border border-primary/40'
                : 'bg-card hover:bg-muted border border-border/70 text-foreground'
            }`}
            title={
              isMaximizedActual
                ? 'Restaurar layout padrão do editor'
                : 'Maximizar editor (tela cheia para edição de queries grandes)'
            }
          >
            {isMaximizedActual ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Restaurar</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Maximizar</span>
              </>
            )}
          </button>

          {/* Botão de Parâmetros e Variáveis (sempre visível) */}
          <button
            type="button"
            onClick={onOpenBindModal}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition shadow-xs cursor-pointer ${
              detectedVariables.length > 0
                ? 'bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/40 text-violet-400'
                : 'bg-card hover:bg-muted border border-border/70 text-foreground'
            }`}
            title={
              detectedVariables.length > 0
                ? `Configurar ${detectedVariables.length} variável(is) detectada(s) (:VAR, &VAR, @VAR, \${VAR})`
                : 'Abrir painel de parâmetros e variáveis da consulta'
            }
          >
            <SlidersHorizontal className={`w-3.5 h-3.5 ${detectedVariables.length > 0 ? 'text-violet-400' : 'text-muted-foreground'}`} />
            <span>Parâmetros</span>
            {detectedVariables.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-violet-500/25 text-violet-300">
                {detectedVariables.length}
              </span>
            )}
          </button>

          {/* Botão Explain Plan */}
          <button
            type="button"
            onClick={onExplainPlan}
            disabled={isExplaining || isExecuting || !activeConnection}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
            title="Explicar plano de execução da consulta selecionada (Oracle, Postgres, MySQL)"
          >
            <Zap className={`w-3.5 h-3.5 ${isExplaining ? 'animate-spin' : ''}`} />
            <span>{isExplaining ? 'Explicando...' : 'Explain Plan'}</span>
          </button>

          {/* Limite de Linhas */}
          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            <span className="text-[11px]">Limite:</span>
            <select
              value={maxRows}
              onChange={(e) => setMaxRows(Number(e.target.value))}
              className="bg-card border border-border/70 rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:border-primary"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
            </select>
          </div>

          {/* Botão Executar */}
          <button
            data-tour="execute-sql-button"
            onClick={() => onExecuteSql()}
            disabled={isExecuting || !activeConnection}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            {isExecuting ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Executando...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Executar (Ctrl+Enter)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor de Código SQL com Gutter de Linhas e Altura Ajustável */}
      <div
        className={`border-b border-border/70 relative flex overflow-hidden shrink-0 ${
          isMaximizedActual ? 'flex-1 h-full min-h-[350px]' : ''
        }`}
        style={!isMaximizedActual ? { height: `${editorHeight}px` } : undefined}
        data-tour="sql-editor"
      >
        {/* Coluna de Números de Linha */}
        <div
          ref={lineNumbersRef}
          className="select-none overflow-hidden py-3 pl-2.5 pr-2 bg-[#080B11] border-r border-border/40 text-muted-foreground/40 font-mono text-right shrink-0"
          style={{ fontSize: `${fontSize}px`, width: '44px', lineHeight: '1.5rem' }}
          aria-hidden="true"
        >
          {linesArray.map((lineNum) => {
            const isCurrentLine = lineNum === metrics.currentLine;
            return (
              <div
                key={lineNum}
                className={`transition-colors ${
                  isCurrentLine ? 'text-primary font-bold bg-primary/15 rounded-xs' : ''
                }`}
                style={{ height: '1.5rem' }}
              >
                {lineNum}
              </div>
            );
          })}
        </div>

        {/* Textarea de Código */}
        <div className="flex-1 relative h-full overflow-hidden bg-[#0B0F17]">
          <textarea
            ref={sqlTextareaRef}
            value={sql}
            onChange={handleSqlChange}
            onKeyDown={handleKeyDown}
            onKeyUp={(e) => setCursorPos(e.currentTarget.selectionStart)}
            onSelect={(e) => setCursorPos(e.currentTarget.selectionStart)}
            onScroll={handleEditorScroll}
            onClick={(e) => {
              setCursorPos(e.currentTarget.selectionStart);
              computeAutocomplete(sql, e.currentTarget.selectionStart);
            }}
            onBlur={() => setTimeout(() => setAutocomplete(null), 150)}
            placeholder="Digite aqui seu comando SQL (SELECT, UPDATE, INSERT, DELETE, etc.)..."
            className={`w-full h-full p-3 bg-transparent text-emerald-300 font-mono resize-none focus:outline-none [scrollbar-width:thin] ${
              wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto'
            }`}
            style={{ fontSize: `${fontSize}px`, lineHeight: '1.5rem' }}
            spellCheck={false}
          />
          {autocomplete && (
            <div className="absolute left-3 bottom-1 translate-y-full z-20 w-64 max-h-48 overflow-y-auto bg-[#131926] border border-border/70 rounded shadow-lg text-xs">
              {autocomplete.suggestions.map((s, idx) => (
                <button
                  key={`${s.type}-${s.label}-${idx}`}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyAutocompleteSuggestion(s.label);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left font-mono cursor-pointer ${
                    idx === autocomplete.activeIndex ? 'bg-primary/20 text-primary' : 'text-emerald-200 hover:bg-white/5'
                  }`}
                >
                  <span className="truncate">{s.label}</span>
                  <span className="text-[9px] uppercase tracking-wide opacity-50 ml-2 shrink-0">
                    {s.type === 'keyword' ? 'kw' : s.type === 'table' ? 'tab' : 'col'}
                  </span>
                </button>
              ))}
            </div>
          )}
          {copyFeedback && (
            <div className="absolute right-3 bottom-3 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 rounded shadow-md animate-fade-in">
              {copyFeedback}
            </div>
          )}
        </div>
      </div>

      {/* Barra de Status do Editor SQL */}
      <div className="px-3 py-1 bg-[#090D14] border-b border-border/70 flex items-center justify-between text-[11px] text-muted-foreground select-none shrink-0 font-sans">
        <div className="flex items-center space-x-3">
          <span className="font-mono text-muted-foreground/80">
            Ln <strong className="text-foreground">{metrics.currentLine}</strong>, Col{' '}
            <strong className="text-foreground">{metrics.currentColumn}</strong>
          </span>
          <span className="text-border">|</span>
          <span>
            {metrics.lineCount} {metrics.lineCount === 1 ? 'linha' : 'linhas'}
          </span>
          <span className="text-border">|</span>
          <span>{metrics.charCount} caracteres</span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Botão Formatar SQL */}
          <button
            type="button"
            onClick={handleFormatSql}
            disabled={!sql.trim()}
            className="flex items-center space-x-1 px-2 py-0.5 rounded hover:bg-muted/70 text-muted-foreground hover:text-foreground transition disabled:opacity-40 cursor-pointer"
            title="Formatar SQL (adicionar quebras e indentação em cláusulas principais)"
          >
            <AlignLeft className="w-3 h-3 text-amber-500" />
            <span>Formatar SQL</span>
          </button>

          <span className="text-border">|</span>

          {/* Toggle Word Wrap */}
          <button
            type="button"
            onClick={handleToggleWordWrap}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded transition cursor-pointer ${
              wordWrap
                ? 'bg-primary/20 text-primary font-semibold'
                : 'hover:bg-muted/70 text-muted-foreground hover:text-foreground'
            }`}
            title="Alternar quebra automática de linha"
          >
            <WrapText className="w-3 h-3" />
            <span>Wrap: {wordWrap ? 'ON' : 'OFF'}</span>
          </button>

          <span className="text-border">|</span>

          {/* Zoom da Fonte */}
          <div className="flex items-center space-x-1 font-mono">
            <button
              type="button"
              onClick={handleZoomOut}
              className="px-1.5 py-0.5 rounded hover:bg-muted/70 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Diminuir fonte do editor"
            >
              A-
            </button>
            <span className="text-[10px] text-muted-foreground px-1">{fontSize}px</span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="px-1.5 py-0.5 rounded hover:bg-muted/70 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Aumentar fonte do editor"
            >
              A+
            </button>
          </div>
        </div>
      </div>

      {/* Divisor Arrastável (Splitter Vertical) */}
      {!isMaximizedActual && (
        <div
          onMouseDown={handleSplitterMouseDown}
          onDoubleClick={toggleMaximize}
          className="h-2 bg-card hover:bg-primary/30 active:bg-primary/50 transition cursor-row-resize flex items-center justify-center shrink-0 border-b border-border/70 group"
          title="Clique e arraste para redimensionar a altura do editor | Duplo clique para maximizar"
        >
          <div className="w-10 h-1 rounded-full bg-border group-hover:bg-primary transition" />
        </div>
      )}
    </div>
  );
};
