import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  Clock,
  Download,
  Zap,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  BookmarkPlus,
  Trash2,
  Radio,
  Settings,
  DatabaseZap
} from 'lucide-react';
import { OnboardingTour } from '../components/onboarding/OnboardingTour';
import { usePageTour } from '../components/onboarding/usePageTour';
import { DATABASE_TOUR_STEPS, DATABASE_TOUR_STORAGE_KEY } from '../components/onboarding/pageTours/databaseTour';
import {
  DatabaseConnectionConfig,
  DatabaseType,
  QueryResult,
  AppSettings,
  SqlSnippet,
  ExplainPlanResult,
  TableColumnInfo
} from '../../../shared/types';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import {
  extractBindVariables,
  extractSqlVariables,
  castBindValue,
  substituteBindVariables,
  loadBindCache,
  saveBindCache,
  BindInputState
} from '../utils/sqlBinds';
import { detectColumnDataTypes, processQueryRows, hasActiveQueryFilters } from '../utils/databaseResultsUtils';
import { parseSingleTableSelect, getRowKeyColumns } from '../utils/databaseMutationUtils';

// Subcomponentes Modularizados
import { DatabaseSidebar } from '../components/database/DatabaseSidebar';
import { SqlEditorArea, DEFAULT_SQL_SNIPPETS } from '../components/database/SqlEditorArea';
import { ResultsDataGrid } from '../components/database/ResultsDataGrid';
import { ConnectionModal } from '../components/database/ConnectionModal';
import { BackupModal } from '../components/database/BackupModal';
import { SaveSnippetModal } from '../components/database/SaveSnippetModal';
import { BindVariablesModal } from '../components/database/BindVariablesModal';
import { StatementTracerPanel } from '../components/database/StatementTracerPanel';

export { DEFAULT_SQL_SNIPPETS };

const DEFAULT_PORTS: Record<DatabaseType, number> = {
  oracle: 1521,
  mysql: 3306,
  postgres: 5432
};

export interface ExecutionHistoryItem {
  id: string;
  sql: string;
  connectionName: string;
  timestamp: string;
  success: boolean;
  timeMs: number;
  rowCount?: number;
  affectedRows?: number;
  error?: string;
}

export interface DatabasePageProps {
  settingsVersion?: number;
  onNavigateToSettings?: () => void;
}

export const DatabasePage: React.FC<DatabasePageProps> = ({ settingsVersion, onNavigateToSettings }) => {
  const tour = usePageTour(DATABASE_TOUR_STORAGE_KEY);
  const [connections, setConnections] = useState<DatabaseConnectionConfig[]>([]);
  const [activeConnectionId, setActiveConnectionId] = useState<string>('');
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Editor e Execução
  const [sql, setSql] = useState<string>('SELECT 1 FROM DUAL');
  const [maxRows, setMaxRows] = useState<number>(100);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<'grid' | 'history' | 'explain' | 'tracer'>('grid');
  const [isExplaining, setIsExplaining] = useState<boolean>(false);
  const [explainResult, setExplainResult] = useState<ExplainPlanResult | null>(null);

  // Parâmetros de Consulta (Bind Variables)
  const [isBindModalOpen, setIsBindModalOpen] = useState<boolean>(false);
  const [bindInputs, setBindInputs] = useState<BindInputState[]>([]);
  const [pendingSqlToExecute, setPendingSqlToExecute] = useState<string | null>(null);

  // Layout do DB Studio (Tamanho do Editor e Sidebar)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('devManager:sqlSidebarCollapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [isEditorMaximized, setIsEditorMaximized] = useState<boolean>(() => {
    try {
      return localStorage.getItem('devManager:sqlEditorMaximized') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('devManager:sqlSidebarCollapsed', String(next));
      } catch {}
      return next;
    });
  };

  const handleSetEditorMaximized: React.Dispatch<React.SetStateAction<boolean>> = (valOrFn) => {
    setIsEditorMaximized((prev) => {
      const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      try {
        localStorage.setItem('devManager:sqlEditorMaximized', String(next));
      } catch {}
      return next;
    });
  };

  // Filtros, ordenação e seleção da tabela de resultados
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [activeColumnMenu, setActiveColumnMenu] = useState<string | null>(null);
  const [cellContextMenu, setCellContextMenu] = useState<{
    x: number;
    y: number;
    column: string;
    value: any;
    rowIndex: number;
  } | null>(null);

  // Histórico persistente
  const [history, setHistory] = useState<ExecutionHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('devManager:dbHistory');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Consultas salvas pelo desenvolvedor
  const [customSnippets, setCustomSnippets] = useState<SqlSnippet[]>(() => {
    try {
      const saved = localStorage.getItem('devManager:customSnippets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isSaveSnippetModalOpen, setIsSaveSnippetModalOpen] = useState<boolean>(false);
  const [editingSnippetId, setEditingSnippetId] = useState<string | null>(null);
  const [snippetTitle, setSnippetTitle] = useState<string>('');
  const [snippetCategory, setSnippetCategory] = useState<string>('Minhas Consultas');
  const [snippetDesc, setSnippetDesc] = useState<string>('');
  const [snippetSql, setSnippetSql] = useState<string>('');

  // Tabelas do Schema e Navegador de Colunas
  const [tables, setTables] = useState<string[]>([]);
  const [tableFilter, setTableFilter] = useState<string>('');
  const [isLoadingTables, setIsLoadingTables] = useState<boolean>(false);
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [tableColumns, setTableColumns] = useState<Record<string, TableColumnInfo[]>>({});
  const [isLoadingColumns, setIsLoadingColumns] = useState<Record<string, boolean>>({});

  // Tabela editável: só existe quando o resultado atual veio de um SELECT * FROM <tabela única>
  const [editableTable, setEditableTable] = useState<{ name: string; columns: TableColumnInfo[] } | null>(null);
  const [isMutatingRow, setIsMutatingRow] = useState<boolean>(false);

  // Modal de Conexão
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingConn, setEditingConn] = useState<Partial<DatabaseConnectionConfig>>({
    type: 'oracle',
    name: 'Oracle Principal',
    host: 'localhost',
    port: 1521,
    database: 'XEPDB1',
    user: 'system',
    password: '',
    oracleMode: 'serviceName'
  });
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; version?: string } | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const { copy: copyCellToClipboard, copiedKey: copyFeedback } = useCopyToClipboard();

  // Modal de Backup
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);

  const activeConnection = useMemo(() => {
    return connections.find((c) => c.id === activeConnectionId) || connections[0] || null;
  }, [connections, activeConnectionId]);

  // Carregar Configurações e Conexões
  const loadSettings = useCallback(async () => {
    if (window.electronAPI?.getSettings) {
      try {
        const st = await window.electronAPI.getSettings();
        setSettings(st);
        const conns = st.databaseConnections || [];
        setConnections(conns);

        if (st.savedSqlSnippets && Array.isArray(st.savedSqlSnippets) && st.savedSqlSnippets.length > 0) {
          setCustomSnippets(st.savedSqlSnippets);
        }

        if (conns.length > 0 && !activeConnectionId) {
          const defaultConn = conns.find((c) => c.isDefault) || conns[0];
          setActiveConnectionId(defaultConn.id);
          if (defaultConn.type === 'oracle') {
            setSql('SELECT 1 FROM DUAL');
          } else {
            setSql('SELECT 1');
          }
        }
      } catch (err) {
        console.error('Erro ao carregar configurações de conexões:', err);
      }
    }
  }, [activeConnectionId]);

  const saveSnippets = async (newSnippets: SqlSnippet[]) => {
    setCustomSnippets(newSnippets);
    try {
      localStorage.setItem('devManager:customSnippets', JSON.stringify(newSnippets));
    } catch {
      // Ignore storage errors
    }
    if (window.electronAPI?.saveSettings) {
      await window.electronAPI.saveSettings({ savedSqlSnippets: newSnippets });
    }
  };

  useEffect(() => {
    loadSettings();
  }, [loadSettings, settingsVersion]);

  const saveConnectionsToSettings = async (newConns: DatabaseConnectionConfig[]) => {
    setConnections(newConns);
    if (window.electronAPI?.saveSettings) {
      await window.electronAPI.saveSettings({ databaseConnections: newConns });
    }
  };

  // Buscar Tabelas da Conexão Ativa
  const fetchTables = useCallback(async () => {
    if (!activeConnection || !window.electronAPI?.listDbTables) return;
    setIsLoadingTables(true);
    try {
      const list = await window.electronAPI.listDbTables(activeConnection);
      setTables(list || []);
    } catch (err) {
      console.error('Erro ao carregar tabelas:', err);
    } finally {
      setIsLoadingTables(false);
    }
  }, [activeConnection]);

  // Sempre que a seleção de conexão ativa mudar (não a cada refresh da lista), limpa resultado e tabela
  useEffect(() => {
    if (activeConnectionId) {
      setTables([]);
      setQueryResult(null);
      setEditableTable(null);
    }
  }, [activeConnectionId]);

  // Testar Conexão do Formulário
  const handleTestConnection = async () => {
    if (!window.electronAPI?.testDbConnection) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const fullConfig: DatabaseConnectionConfig = {
        id: editingConn.id || 'temp',
        name: editingConn.name || 'Nova Conexão',
        type: editingConn.type || 'oracle',
        host: editingConn.host || 'localhost',
        port: Number(editingConn.port) || DEFAULT_PORTS[editingConn.type || 'oracle'],
        database: editingConn.database || '',
        user: editingConn.user || '',
        password: editingConn.password || '',
        oracleMode: editingConn.oracleMode || 'serviceName',
        oracleClientPath: editingConn.oracleClientPath,
        oracleThickMode: editingConn.oracleThickMode,
        ssl: editingConn.ssl
      };

      const res = await window.electronAPI.testDbConnection(fullConfig);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Falha ao executar teste de conexão.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Salvar Conexão do Modal
  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConn.name || !editingConn.host || !editingConn.user) return;

    const fullConfig: DatabaseConnectionConfig = {
      id: editingConn.id || `conn_${Date.now()}`,
      name: editingConn.name.trim(),
      type: editingConn.type || 'oracle',
      host: editingConn.host.trim(),
      port: Number(editingConn.port) || DEFAULT_PORTS[editingConn.type || 'oracle'],
      database: (editingConn.database || '').trim(),
      user: editingConn.user.trim(),
      password: editingConn.password || '',
      hasPassword: editingConn.password ? true : editingConn.hasPassword,
      oracleMode: editingConn.oracleMode || 'serviceName',
      oracleClientPath: editingConn.oracleClientPath?.trim() || undefined,
      oracleThickMode: editingConn.oracleThickMode,
      ssl: editingConn.ssl,
      isDefault: editingConn.isDefault || false
    };

    let updated: DatabaseConnectionConfig[];
    if (editingConn.id) {
      updated = connections.map((c) => (c.id === editingConn.id ? fullConfig : c));
    } else {
      updated = [...connections, fullConfig];
    }

    if (fullConfig.isDefault) {
      updated = updated.map((c) => ({ ...c, isDefault: c.id === fullConfig.id }));
    }

    await saveConnectionsToSettings(updated);
    setActiveConnectionId(fullConfig.id);
    setIsModalOpen(false);
  };

  const handleDeleteConnection = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta conexão?')) {
      const updated = connections.filter((c) => c.id !== id);
      await saveConnectionsToSettings(updated);
      if (activeConnectionId === id && updated.length > 0) {
        setActiveConnectionId(updated[0].id);
      }
    }
  };

  const handleOpenCreateModal = () => {
    setEditingConn({
      type: 'oracle',
      name: 'Oracle Local',
      host: 'localhost',
      port: 1521,
      database: 'XEPDB1',
      user: 'system',
      password: '',
      oracleMode: 'serviceName',
      oracleThickMode: false,
      oracleClientPath: ''
    });
    setTestResult(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (conn: DatabaseConnectionConfig) => {
    setEditingConn({ ...conn });
    setTestResult(null);
    setIsModalOpen(true);
  };

  // Executar SQL
  const handleExecuteSql = async (customSql?: string, overrideBinds?: Record<string, any>) => {
    if (!activeConnection) {
      alert('Selecione ou crie uma conexão antes de executar consultas.');
      return;
    }

    const cleanSql = (customSql ?? sql).trim().replace(/;+\s*$/, '');
    if (!cleanSql) return;

    if (!overrideBinds) {
      const detailed = extractSqlVariables(cleanSql);
      if (detailed.length > 0) {
        const cache = loadBindCache();
        const initialInputs: BindInputState[] = detailed.map((item) => ({
          name: item.name,
          prefix: item.prefix,
          raw: item.raw,
          value: cache[item.name] ?? '',
          type: 'auto'
        }));
        setBindInputs(initialInputs);
        setPendingSqlToExecute(cleanSql);
        setIsBindModalOpen(true);
        return;
      }
    }

    setIsExecuting(true);
    setQueryResult(null);
    setActiveResultTab('grid');
    setSearchTerm('');
    setColumnFilters({});
    setSortConfig(null);
    setSelectedRowIndex(null);
    setActiveColumnMenu(null);
    setCellContextMenu(null);

    try {
      const res = await window.electronAPI.executeDbQuery(activeConnection, cleanSql, maxRows, overrideBinds);
      setQueryResult(res);

      // Detecta se o resultado veio de um SELECT * FROM <tabela única> — só nesse caso a grid
      // consegue editar/inserir/excluir linhas com segurança (sabe de qual tabela e, com sorte,
      // qual é a chave primária de cada linha).
      const editableTableName = res.success && res.isQuery ? parseSingleTableSelect(cleanSql) : null;
      if (editableTableName) {
        let cols = tableColumns[editableTableName];
        if (!cols && window.electronAPI?.getDbTableColumns) {
          try {
            cols = await window.electronAPI.getDbTableColumns(activeConnection, editableTableName);
            setTableColumns((prev) => ({ ...prev, [editableTableName]: cols || [] }));
          } catch (err) {
            console.error('Erro ao carregar colunas para edição inline:', err);
            cols = [];
          }
        }
        setEditableTable({ name: editableTableName, columns: cols || [] });
      } else {
        setEditableTable(null);
      }

      // Adicionar ao histórico
      const historyItem: ExecutionHistoryItem = {
        id: `hist_${Date.now()}`,
        sql: cleanSql,
        connectionName: activeConnection.name,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        success: res.success,
        timeMs: res.executionTimeMs,
        rowCount: res.rowCount,
        affectedRows: res.affectedRows,
        error: res.error
      };

      setHistory((prev) => {
        const updated = [historyItem, ...prev.filter((h) => h.sql !== historyItem.sql).slice(0, 49)];
        try {
          localStorage.setItem('devManager:dbHistory', JSON.stringify(updated));
        } catch {
          // Ignore storage errors
        }
        return updated;
      });
    } catch (err: any) {
      setQueryResult({
        success: false,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        isQuery: false,
        error: err.message || 'Erro inesperado ao executar comando.'
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleOpenBindModalManually = () => {
    const cleanSql = sql.trim().replace(/;+\s*$/, '');
    const detailed = extractSqlVariables(cleanSql);
    const cache = loadBindCache();
    const initialInputs: BindInputState[] = detailed.map((item) => ({
      name: item.name,
      prefix: item.prefix,
      raw: item.raw,
      value: cache[item.name] ?? '',
      type: 'auto'
    }));
    setBindInputs(initialInputs);
    setPendingSqlToExecute(cleanSql || sql);
    setIsBindModalOpen(true);
  };

  const handleConfirmExecuteBinds = (e?: React.FormEvent) => {
    e?.preventDefault();
    const sqlToRun = pendingSqlToExecute || sql;
    const bindsRecord: Record<string, any> = {};
    const cacheToSave: Record<string, string> = {};

    for (const item of bindInputs) {
      const casted = castBindValue(item.value, item.type);
      bindsRecord[item.name] = casted;
      if (item.value) {
        cacheToSave[item.name] = item.value;
      }
    }

    saveBindCache(cacheToSave);
    setIsBindModalOpen(false);

    // Se a consulta possui variáveis de substituição (&VAR, @VAR, ${VAR}),
    // interpolamos com os literais formatados para evitar erros de sintaxe (ex: ORA-00911).
    const hasSubstitutionVars = /(?<!&)&(?!=)[a-zA-Z_]|&&[a-zA-Z_]|@[a-zA-Z_]|\$\{[a-zA-Z_]|#\{[a-zA-Z_]/.test(sqlToRun);
    if (hasSubstitutionVars) {
      const bindsForSub: Record<string, { value: any; type: any }> = {};
      for (const item of bindInputs) {
        bindsForSub[item.name] = { value: item.value, type: item.type };
      }
      const interpolated = substituteBindVariables(sqlToRun, bindsForSub);
      handleExecuteSql(interpolated, {});
    } else {
      handleExecuteSql(sqlToRun, bindsRecord);
    }
  };

  const handleSubstituteBindsInline = () => {
    const sqlToRun = pendingSqlToExecute || sql;
    const bindsRecord: Record<string, { value: any; type: any }> = {};
    const cacheToSave: Record<string, string> = {};

    for (const item of bindInputs) {
      bindsRecord[item.name] = { value: item.value, type: item.type };
      if (item.value) {
        cacheToSave[item.name] = item.value;
      }
    }

    saveBindCache(cacheToSave);
    const substituted = substituteBindVariables(sqlToRun, bindsRecord);
    setSql(substituted);
    setIsBindModalOpen(false);
  };

  const handleClearHistory = () => {
    if (confirm('Deseja limpar todo o histórico de consultas salvas?')) {
      setHistory([]);
      try {
        localStorage.removeItem('devManager:dbHistory');
      } catch {
        // Ignore storage errors
      }
    }
  };

  const handleOpenCreateSnippet = (initialSql?: string) => {
    setEditingSnippetId(null);
    setSnippetTitle('');
    setSnippetCategory('Minhas Consultas');
    setSnippetDesc('');
    setSnippetSql((initialSql ?? sql).trim());
    setIsSaveSnippetModalOpen(true);
  };

  const handleOpenEditSnippet = (snip: SqlSnippet, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingSnippetId(snip.id);
    setSnippetTitle(snip.title);
    setSnippetCategory(snip.category || 'Minhas Consultas');
    setSnippetDesc(snip.description || '');
    setSnippetSql(snip.sql);
    setIsSaveSnippetModalOpen(true);
  };

  const handleSaveCustomSnippet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!snippetTitle.trim() || !snippetSql.trim()) return;

    if (editingSnippetId) {
      const updated = customSnippets.map((s) =>
        s.id === editingSnippetId
          ? {
              ...s,
              title: snippetTitle.trim(),
              category: snippetCategory.trim() || 'Minhas Consultas',
              description: snippetDesc.trim() || undefined,
              sql: snippetSql.trim()
            }
          : s
      );
      await saveSnippets(updated);
    } else {
      const newSnip: SqlSnippet = {
        id: `custom_${Date.now()}`,
        title: snippetTitle.trim(),
        category: snippetCategory.trim() || 'Minhas Consultas',
        description: snippetDesc.trim() || undefined,
        sql: snippetSql.trim(),
        dbType: activeConnection?.type || 'all'
      };
      await saveSnippets([newSnip, ...customSnippets]);
    }

    setIsSaveSnippetModalOpen(false);
    setEditingSnippetId(null);
    setSnippetTitle('');
    setSnippetDesc('');
    setSnippetSql('');
  };

  const handleDeleteCustomSnippet = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm('Deseja excluir esta consulta salva?')) {
      const updated = customSnippets.filter((s) => s.id !== id);
      await saveSnippets(updated);
    }
  };

  const handleToggleTableExpand = async (tableName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (expandedTable === tableName) {
      setExpandedTable(null);
      return;
    }
    setExpandedTable(tableName);
    if (!tableColumns[tableName] && activeConnection && window.electronAPI?.getDbTableColumns) {
      setIsLoadingColumns((prev) => ({ ...prev, [tableName]: true }));
      try {
        const cols = await window.electronAPI.getDbTableColumns(activeConnection, tableName);
        setTableColumns((prev) => ({ ...prev, [tableName]: cols || [] }));
      } catch (err) {
        console.error('Erro ao carregar colunas da tabela:', err);
      } finally {
        setIsLoadingColumns((prev) => ({ ...prev, [tableName]: false }));
      }
    }
  };

  const handleInsertColumnName = (colName: string) => {
    setSql((prev) => (prev ? `${prev} ${colName}` : colName));
  };

  const handleExplainPlan = async () => {
    if (!activeConnection) {
      alert('Selecione ou crie uma conexão antes de gerar o Explain Plan.');
      return;
    }
    if (!sql.trim()) return;

    setIsExplaining(true);
    setActiveResultTab('explain');
    try {
      const res = await window.electronAPI.explainDbPlan(activeConnection, sql);
      setExplainResult(res);
    } catch (err: any) {
      setExplainResult({
        success: false,
        planLines: [],
        executionTimeMs: 0,
        error: err?.message || 'Erro inesperado ao gerar Explain Plan.'
      });
    } finally {
      setIsExplaining(false);
    }
  };

  const handleSelectSnippet = (snip: SqlSnippet) => {
    setSql(snip.sql);
  };

  const handleExecuteSnippetDirectly = (snip: SqlSnippet, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const clean = snip.sql.trim().replace(/;+\s*$/, '');
    setSql(clean);
    handleExecuteSql(clean);
  };

  const handleTableClick = (tableName: string) => {
    let query = '';
    if (activeConnection?.type === 'oracle') {
      query = `SELECT * FROM ${tableName} WHERE ROWNUM <= 100`;
    } else if (activeConnection?.type === 'postgres' || activeConnection?.type === 'mysql') {
      query = `SELECT * FROM ${tableName} LIMIT 100`;
    } else {
      query = `SELECT * FROM ${tableName}`;
    }
    setSql(query);
  };

  const handleInsertRow = async (values: Record<string, any>) => {
    if (!activeConnection || !editableTable || !window.electronAPI?.insertDbRow) return;
    setIsMutatingRow(true);
    try {
      const res = await window.electronAPI.insertDbRow(activeConnection, editableTable.name, values);
      if (!res.success) {
        alert(`Falha ao inserir linha:\n${res.error}`);
        return;
      }
      await handleExecuteSql();
    } finally {
      setIsMutatingRow(false);
    }
  };

  const handleUpdateCell = async (row: Record<string, any>, column: string, newValue: any) => {
    if (!activeConnection || !editableTable || !window.electronAPI?.updateDbRow) return;
    const keyColumns = getRowKeyColumns(editableTable.columns);
    const where: Record<string, any> = {};
    for (const k of keyColumns) where[k] = row[k];

    setIsMutatingRow(true);
    try {
      const res = await window.electronAPI.updateDbRow(activeConnection, editableTable.name, { [column]: newValue }, where);
      if (!res.success) {
        alert(`Falha ao atualizar célula:\n${res.error}`);
        return;
      }
      await handleExecuteSql();
    } finally {
      setIsMutatingRow(false);
    }
  };

  const handleDeleteRow = async (row: Record<string, any>) => {
    if (!activeConnection || !editableTable || !window.electronAPI?.deleteDbRow) return;
    if (!confirm('Deseja realmente excluir esta linha? Essa ação não pode ser desfeita.')) return;

    const keyColumns = getRowKeyColumns(editableTable.columns);
    const where: Record<string, any> = {};
    for (const k of keyColumns) where[k] = row[k];

    setIsMutatingRow(true);
    try {
      const res = await window.electronAPI.deleteDbRow(activeConnection, editableTable.name, where);
      if (!res.success) {
        alert(`Falha ao excluir linha:\n${res.error}`);
        return;
      }
      await handleExecuteSql();
    } finally {
      setIsMutatingRow(false);
    }
  };

  // Detecção de tipo de dado por coluna (lógica pura extraída/testada em utils/databaseResultsUtils.ts)
  const columnDataTypes = useMemo<Record<string, 'number' | 'date' | 'boolean' | 'object' | 'string'>>(() => {
    if (!queryResult || !queryResult.columns || !queryResult.rows) return {};
    return detectColumnDataTypes(queryResult.columns, queryResult.rows);
  }, [queryResult]);

  // Linhas processadas com busca global, filtros por coluna e ordenação
  const processedRows = useMemo(
    () => processQueryRows(queryResult, { searchTerm, columnFilters, sortConfig, columnDataTypes }),
    [queryResult, searchTerm, columnFilters, sortConfig, columnDataTypes]
  );

  const hasActiveFilters = useMemo(
    () => hasActiveQueryFilters(searchTerm, sortConfig, columnFilters),
    [searchTerm, sortConfig, columnFilters]
  );

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setColumnFilters({});
    setSortConfig(null);
    setSelectedRowIndex(null);
    setActiveColumnMenu(null);
    setCellContextMenu(null);
  };

  const handleToggleSort = (column: string) => {
    setSortConfig((prev) => {
      if (!prev || prev.column !== column) {
        return { column, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { column, direction: 'desc' };
      }
      return null;
    });
  };

  const handleFilterByCellValue = (col: string, val: any) => {
    const filterText = val === null || val === undefined ? '[null]' : String(val);
    setColumnFilters((prev) => ({
      ...prev,
      [col]: filterText
    }));
    setCellContextMenu(null);
  };

  const handleExportCsv = () => {
    if (!queryResult || !queryResult.columns || processedRows.length === 0) return;

    const cols = queryResult.columns;
    const csvLines = [cols.join(',')];

    for (const row of processedRows) {
      const line = cols
        .map((col) => {
          const val = row[col];
          if (val === null || val === undefined) return '';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(',');
      csvLines.push(line);
    }

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `query_result_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyCell = (text: any, cellKey?: string) => {
    const str = typeof text === 'object' ? JSON.stringify(text) : String(text ?? '');
    copyCellToClipboard(str, cellKey || 'Copiado!');
  };

  const filteredTables = useMemo(() => {
    if (!tableFilter) return tables;
    return tables.filter((t) => t.toLowerCase().includes(tableFilter.toLowerCase()));
  }, [tables, tableFilter]);

  const getDbBadge = (type: DatabaseType) => {
    switch (type) {
      case 'oracle':
        return <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30">ORACLE</span>;
      case 'mysql':
        return <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">MYSQL</span>;
      case 'postgres':
        return <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/30">POSTGRES</span>;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden select-none">
      {/* Aviso de Primeiro Uso: nenhuma conexão de banco cadastrada ainda */}
      {settings && connections.length === 0 && (
        <div className="shrink-0 bg-amber-500/10 border-b border-amber-500/40 p-3 flex items-start space-x-2.5 text-xs text-amber-700 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block">Nenhuma conexão de banco configurada</span>
            <span className="text-[11px] text-muted-foreground block mt-0.5">
              Cadastre uma conexão Oracle, PostgreSQL ou MySQL para executar consultas, ver tabelas e agendar
              backups.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-[11px] font-bold text-amber-700 dark:text-amber-200 flex items-center gap-1 transition-all"
            >
              <DatabaseZap className="w-3 h-3" />
              <span>Nova Conexão</span>
            </button>
            {onNavigateToSettings && (
              <button
                type="button"
                onClick={onNavigateToSettings}
                className="px-2.5 py-1 bg-card hover:bg-muted border border-amber-500/40 rounded-lg text-[11px] font-bold text-amber-700 dark:text-amber-200 flex items-center gap-1 transition-all"
              >
                <Settings className="w-3 h-3" />
                <span>Configurações</span>
              </button>
            )}
          </div>
        </div>
      )}
      <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Sidebar de Conexões e Tabelas */}
      <DatabaseSidebar
        connections={connections}
        activeConnectionId={activeConnectionId}
        setActiveConnectionId={setActiveConnectionId}
        onOpenCreateModal={handleOpenCreateModal}
        onOpenEditModal={handleOpenEditModal}
        onDeleteConnection={handleDeleteConnection}
        tables={tables}
        filteredTables={filteredTables}
        tableFilter={tableFilter}
        setTableFilter={setTableFilter}
        isLoadingTables={isLoadingTables}
        onFetchTables={fetchTables}
        expandedTable={expandedTable}
        tableColumns={tableColumns}
        isLoadingColumns={isLoadingColumns}
        onToggleTableExpand={handleToggleTableExpand}
        onTableClick={handleTableClick}
        onInsertColumnName={handleInsertColumnName}
        onOpenTour={tour.open}
        activeConnection={activeConnection}
        getDbBadge={getDbBadge}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* Área Principal: Editor SQL e Resultados */}
      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        <SqlEditorArea
          sql={sql}
          setSql={setSql}
          activeConnection={activeConnection}
          isExecuting={isExecuting}
          onExecuteSql={handleExecuteSql}
          isExplaining={isExplaining}
          onExplainPlan={handleExplainPlan}
          maxRows={maxRows}
          setMaxRows={setMaxRows}
          onOpenBindModal={handleOpenBindModalManually}
          onOpenBackupModal={() => setIsBackupModalOpen(true)}
          onOpenCreateSnippet={handleOpenCreateSnippet}
          customSnippets={customSnippets}
          onSelectSnippet={handleSelectSnippet}
          onExecuteSnippetDirectly={handleExecuteSnippetDirectly}
          onEditSnippet={handleOpenEditSnippet}
          onDeleteSnippet={handleDeleteCustomSnippet}
          tables={tables}
          tableColumns={tableColumns}
          isLoadingColumns={isLoadingColumns}
          setIsLoadingColumns={setIsLoadingColumns}
          setTableColumns={setTableColumns}
          getDbBadge={getDbBadge}
          copyFeedback={copyFeedback}
          isMaximized={isEditorMaximized}
          setIsMaximized={handleSetEditorMaximized}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
        />

        {!isEditorMaximized ? (
          <>
            {/* Barra de Status e Tabs de Resultado */}
            <div className="px-3 py-1.5 bg-card/60 border-b border-border/70 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveResultTab('grid')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                activeResultTab === 'grid'
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Table className="w-3 h-3" />
              <span>Resultado</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveResultTab('explain')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                activeResultTab === 'explain'
                  ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>Explain Plan</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveResultTab('tracer')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                activeResultTab === 'tracer'
                  ? 'bg-sky-500/20 text-sky-500 border border-sky-500/30'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Radio className="w-3 h-3" />
              <span>Statement Tracer</span>
            </button>
            <button
              onClick={() => setActiveResultTab('history')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                activeResultTab === 'history'
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Histórico ({history.length})</span>
            </button>
          </div>

          {/* Estatísticas do Resultado */}
          {isExecuting ? (
            <div className="flex items-center space-x-2 text-xs text-primary font-medium animate-pulse">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span>Executando consulta...</span>
            </div>
          ) : queryResult && (
            <div className="flex items-center space-x-3 text-xs">
              {queryResult.success ? (
                <>
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {queryResult.isQuery
                      ? `${queryResult.rowCount} linha(s)`
                      : `${queryResult.affectedRows ?? 0} linha(s) afetada(s)`}
                  </span>
                  <span className="text-muted-foreground font-mono">
                    {queryResult.executionTimeMs} ms
                  </span>
                  {queryResult.isQuery && queryResult.rows && queryResult.rows.length > 0 && (
                    <button
                      onClick={handleExportCsv}
                      title="Exportar dados para CSV"
                      className="flex items-center space-x-1 text-primary hover:underline font-medium text-[11px] cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>CSV</span>
                    </button>
                  )}
                </>
              ) : (
                <span className="text-red-400 flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" /> Erro na execução
                </span>
              )}
            </div>
          )}
        </div>

        {/* Conteúdo: Grid de Resultados, Explain ou Histórico */}
        <div className="flex-1 overflow-auto bg-card/20" data-tour="results-panel">
          {activeResultTab === 'grid' ? (
            <ResultsDataGrid
              queryResult={queryResult}
              isExecuting={isExecuting}
              processedRows={processedRows}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              columnFilters={columnFilters}
              setColumnFilters={setColumnFilters}
              sortConfig={sortConfig}
              onToggleSort={handleToggleSort}
              hasActiveFilters={hasActiveFilters}
              onClearAllFilters={handleClearAllFilters}
              columnDataTypes={columnDataTypes}
              selectedRowIndex={selectedRowIndex}
              setSelectedRowIndex={setSelectedRowIndex}
              activeColumnMenu={activeColumnMenu}
              setActiveColumnMenu={setActiveColumnMenu}
              cellContextMenu={cellContextMenu}
              setCellContextMenu={setCellContextMenu}
              onCopyCell={handleCopyCell}
              onFilterByCellValue={handleFilterByCellValue}
              editableTableName={editableTable?.name || null}
              editableColumns={editableTable?.columns || []}
              isMutatingRow={isMutatingRow}
              onInsertRow={handleInsertRow}
              onUpdateCell={handleUpdateCell}
              onDeleteRow={handleDeleteRow}
            />
          ) : activeResultTab === 'explain' ? (
            <div className="p-4 space-y-4">
              {!explainResult ? (
                <div className="text-center py-12 text-muted-foreground text-xs space-y-2">
                  <Zap className="w-8 h-8 mx-auto opacity-30 text-amber-500" />
                  <p className="font-semibold text-foreground">Nenhum Explain Plan gerado ainda.</p>
                  <span className="text-[11px] opacity-70">
                    Clique no botão "Explain Plan" na barra superior para inspecionar o plano de execução da query.
                  </span>
                </div>
              ) : !explainResult.success ? (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-800 dark:text-rose-300 text-xs">
                  <div className="flex items-center space-x-2 font-bold mb-1">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>Falha ao gerar Explain Plan:</span>
                  </div>
                  <pre className="font-mono text-[11px] whitespace-pre-wrap bg-card p-3 rounded-lg border border-border text-rose-700 dark:text-rose-300 mt-2">
                    {explainResult.error}
                  </pre>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 border-b border-border/70">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      Plano de Execução Analisado
                    </span>
                    <span>
                      Tempo de Análise: <strong className="text-foreground">{explainResult.executionTimeMs} ms</strong>
                    </span>
                  </div>
                  <div className="bg-[#0B0F17] border border-border/80 rounded-xl p-3.5 overflow-x-auto shadow-inner">
                    <pre className="text-[11px] leading-relaxed font-mono text-amber-300/90 whitespace-pre">
                      {explainResult.planLines.length > 0
                        ? explainResult.planLines.join('\n')
                        : 'Nenhuma linha retornada pelo plano de execução.'}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ) : activeResultTab === 'tracer' ? (
            <StatementTracerPanel
              activeConnection={activeConnection}
              onSelectSql={(newSql) => {
                setSql(newSql);
                setActiveResultTab('grid');
              }}
            />
          ) : (
            /* Tab de Histórico */
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-border/60 text-xs">
                <span className="text-muted-foreground font-medium">
                  {history.length} consulta(s) no histórico persistente
                </span>
                {history.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> Limpar Histórico
                  </button>
                )}
              </div>
              {history.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  Nenhuma consulta executada recentemente.
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-card/60 border border-border/60 rounded-lg text-xs flex flex-col space-y-1.5 hover:border-border transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {item.success ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                        )}
                        <span className="font-bold text-foreground">{item.connectionName}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{item.timestamp}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] text-muted-foreground font-mono mr-1">{item.timeMs} ms</span>
                        <button
                          onClick={() => copyCellToClipboard(item.sql, item.id)}
                          className="px-2 py-0.5 bg-muted hover:bg-muted/80 text-foreground rounded text-[10px] font-semibold transition cursor-pointer"
                          title="Copiar SQL"
                        >
                          {copyFeedback === item.id ? 'Copiado!' : 'Copiar'}
                        </button>
                        <button
                          onClick={() => setSql(item.sql)}
                          className="px-2 py-0.5 bg-primary/20 hover:bg-primary text-primary hover:text-primary-foreground rounded text-[10px] font-semibold transition cursor-pointer"
                          title="Carregar no editor"
                        >
                          Usar
                        </button>
                        <button
                          onClick={() => {
                            setSql(item.sql);
                            setTimeout(() => handleExecuteSql(), 50);
                          }}
                          className="px-2 py-0.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded text-[10px] font-semibold transition cursor-pointer"
                          title="Executar imediatamente"
                        >
                          Executar
                        </button>
                        <button
                          onClick={() => handleOpenCreateSnippet(item.sql)}
                          className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500 text-amber-600 dark:text-amber-400 hover:text-black rounded text-[10px] font-semibold transition flex items-center gap-1 cursor-pointer"
                          title="Salvar esta consulta nas Minhas Consultas"
                        >
                          <BookmarkPlus className="w-3 h-3" />
                          <span>Salvar</span>
                        </button>
                      </div>
                    </div>
                    <pre className="text-[11px] font-mono text-emerald-300 bg-[#0B0F17] p-2 rounded truncate whitespace-pre-wrap max-h-16 overflow-hidden">
                      {item.sql}
                    </pre>
                    {item.error && (
                      <span className="text-[10px] text-red-400 font-mono truncate">{item.error}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
          </>
        ) : (
          <div className="p-2.5 bg-card/60 border-t border-border/70 flex items-center justify-between text-xs text-muted-foreground shrink-0 animate-fade-in font-sans">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="font-semibold text-foreground">Modo Maximizado / Foco Ativo</span>
              <span className="text-[11px] text-muted-foreground">
                (O editor SQL está ocupando toda a tela para você visualizar queries grandes)
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleSetEditorMaximized(false)}
              className="px-3 py-1 bg-card hover:bg-muted border border-border rounded-lg text-primary hover:text-primary-foreground hover:bg-primary font-bold transition cursor-pointer text-xs shadow-xs"
            >
              Restaurar Painel de Resultados
            </button>
          </div>
        )}
      </main>
      </div>

      {/* Modal de Conexão */}
      <ConnectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingConn={editingConn}
        setEditingConn={setEditingConn}
        testResult={testResult}
        isTesting={isTesting}
        onTestConnection={handleTestConnection}
        onSaveConnection={handleSaveConnection}
        defaultPorts={DEFAULT_PORTS}
      />

      {/* Modal de Backup & Restore */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        activeConnection={activeConnection}
        connections={connections}
        settings={settings}
        onSettingsUpdate={(updater) => setSettings(updater)}
      />

      {/* Modal de Salvar / Editar Consulta Personalizada */}
      <SaveSnippetModal
        isOpen={isSaveSnippetModalOpen}
        onClose={() => setIsSaveSnippetModalOpen(false)}
        editingSnippetId={editingSnippetId}
        snippetTitle={snippetTitle}
        setSnippetTitle={setSnippetTitle}
        snippetCategory={snippetCategory}
        setSnippetCategory={setSnippetCategory}
        snippetDesc={snippetDesc}
        setSnippetDesc={setSnippetDesc}
        snippetSql={snippetSql}
        setSnippetSql={setSnippetSql}
        onSave={handleSaveCustomSnippet}
      />

      {/* Modal de Variáveis de Bind (:PARAMETRO) */}
      <BindVariablesModal
        isOpen={isBindModalOpen}
        onClose={() => setIsBindModalOpen(false)}
        bindInputs={bindInputs}
        setBindInputs={setBindInputs}
        onConfirmExecute={handleConfirmExecuteBinds}
        onSubstituteInline={handleSubstituteBindsInline}
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
