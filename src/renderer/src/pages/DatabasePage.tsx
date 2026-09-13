import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Database,
  Play,
  RotateCw,
  RotateCcw,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Download,
  Table,
  Terminal,
  Clock,
  Search,
  ExternalLink,
  ShieldCheck,
  Server,
  Layers,
  ChevronRight,
  ChevronDown,
  Info,
  BookOpen,
  FileCode,
  Zap,
  Key,
  BookmarkPlus,
  Filter,
  ArrowUp,
  ArrowDown,
  X,
  FilterX,
  HardDriveDownload,
  FolderOpen,
  FileArchive,
  CalendarClock,
  History
} from 'lucide-react';
import {
  DatabaseConnectionConfig,
  DatabaseType,
  QueryResult,
  AppSettings,
  SqlSnippet,
  ExplainPlanResult,
  TableColumnInfo,
  BackupConfig,
  BackupResult,
  BackupFileInfo,
  BackupHistoryEntry
} from '../../../shared/types';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

const DEFAULT_PORTS: Record<DatabaseType, number> = {
  oracle: 1521,
  mysql: 3306,
  postgres: 5432
};

const CRON_PRESETS = ['0 * * * *', '0 */6 * * *', '0 2 * * *', '0 2 * * 0'];

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

interface ExecutionHistoryItem {
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

export const DatabasePage: React.FC = () => {
  const [connections, setConnections] = useState<DatabaseConnectionConfig[]>([]);
  const [activeConnectionId, setActiveConnectionId] = useState<string>('');
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Editor e Execução
  const [sql, setSql] = useState<string>('SELECT 1 FROM DUAL');
  const [maxRows, setMaxRows] = useState<number>(100);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<'grid' | 'history' | 'explain'>('grid');
  const [isExplaining, setIsExplaining] = useState<boolean>(false);
  const [explainResult, setExplainResult] = useState<ExplainPlanResult | null>(null);
  const [showSnippetsMenu, setShowSnippetsMenu] = useState<boolean>(false);

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
  const [savedQuerySearch, setSavedQuerySearch] = useState<string>('');
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

  // Backup de Banco de Dados
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [backupFolder, setBackupFolder] = useState<string>('');
  const [isRunningBackup, setIsRunningBackup] = useState<boolean>(false);
  const [backupResult, setBackupResult] = useState<BackupResult | null>(null);
  const [backupFiles, setBackupFiles] = useState<BackupFileInfo[]>([]);
  const [isLoadingBackupFiles, setIsLoadingBackupFiles] = useState<boolean>(false);
  const [backupCron, setBackupCron] = useState<string>('');
  const [backupScheduleEnabled, setBackupScheduleEnabled] = useState<boolean>(true);
  const [backupRetentionCount, setBackupRetentionCount] = useState<string>('');
  const [backupRetentionDays, setBackupRetentionDays] = useState<string>('');
  const [backupCompress, setBackupCompress] = useState<boolean>(false);
  const [backupOracleDirectory, setBackupOracleDirectory] = useState<string>('');
  const [isSavingSchedule, setIsSavingSchedule] = useState<boolean>(false);
  const [scheduleSaveResult, setScheduleSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const [restoringFilePath, setRestoringFilePath] = useState<string | null>(null);
  const [restoreResult, setRestoreResult] = useState<BackupResult | null>(null);
  const [backupHistory, setBackupHistory] = useState<BackupHistoryEntry[]>([]);
  const [isLoadingBackupHistory, setIsLoadingBackupHistory] = useState<boolean>(false);

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
          // Pré-ajusta query inicial baseado no tipo de banco
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
    } catch {}
    if (window.electronAPI?.saveSettings) {
      await window.electronAPI.saveSettings({ savedSqlSnippets: newSnippets });
    }
  };

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Salvar Lista de Conexões nas Configurações
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

  // Sempre que a conexão ativa mudar, limpa resultado e tabela
  useEffect(() => {
    if (activeConnection) {
      setTables([]);
      setQueryResult(null);
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

  // Excluir Conexão
  const handleDeleteConnection = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta conexão?')) {
      const updated = connections.filter((c) => c.id !== id);
      await saveConnectionsToSettings(updated);
      if (activeConnectionId === id && updated.length > 0) {
        setActiveConnectionId(updated[0].id);
      }
    }
  };

  // Abrir Modal para Nova Conexão
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

  // Abrir Modal para Editar Conexão
  const handleOpenEditModal = (conn: DatabaseConnectionConfig) => {
    setEditingConn({ ...conn });
    setTestResult(null);
    setIsModalOpen(true);
  };

  // Carregar arquivos de backup já existentes na pasta de destino
  const refreshBackupFiles = useCallback(async (folder: string) => {
    if (!folder || !window.electronAPI?.listDbBackups) {
      setBackupFiles([]);
      return;
    }
    setIsLoadingBackupFiles(true);
    try {
      const files = await window.electronAPI.listDbBackups(folder);
      setBackupFiles(files || []);
    } catch (err) {
      console.error('Erro ao listar backups:', err);
    } finally {
      setIsLoadingBackupFiles(false);
    }
  }, []);

  // Carregar histórico persistido de backups/restaurações da conexão ativa
  const refreshBackupHistory = useCallback(async (connectionId: string) => {
    if (!window.electronAPI?.listDbBackupHistory) {
      setBackupHistory([]);
      return;
    }
    setIsLoadingBackupHistory(true);
    try {
      const history = await window.electronAPI.listDbBackupHistory(connectionId);
      setBackupHistory(history || []);
    } catch (err) {
      console.error('Erro ao listar histórico de backups:', err);
    } finally {
      setIsLoadingBackupHistory(false);
    }
  }, []);

  // Abrir Modal de Backup: pré-carrega a pasta e o agendamento salvos para a conexão ativa
  const handleOpenBackupModal = () => {
    if (!activeConnection) return;
    const saved = (settings?.backupConfigs || []).find((b) => b.connectionId === activeConnection.id);
    const folder = saved?.destinationFolder || '';
    setBackupFolder(folder);
    setBackupCron(saved?.cronExpression || '');
    setBackupScheduleEnabled(saved?.enabled !== false);
    setBackupRetentionCount(saved?.retentionCount ? String(saved.retentionCount) : '');
    setBackupRetentionDays(saved?.retentionDays ? String(saved.retentionDays) : '');
    setBackupCompress(!!saved?.compress);
    setBackupOracleDirectory(saved?.oracleDirectory || '');
    setBackupResult(null);
    setScheduleSaveResult(null);
    setRestoreResult(null);
    setIsBackupModalOpen(true);
    if (folder) refreshBackupFiles(folder);
    else setBackupFiles([]);
    refreshBackupHistory(activeConnection.id);
  };

  // Selecionar Pasta de Destino do Backup
  const handleSelectBackupFolder = async () => {
    if (!window.electronAPI?.selectDirectory) return;
    const picked = await window.electronAPI.selectDirectory(backupFolder || undefined);
    if (picked) {
      setBackupFolder(picked);
      refreshBackupFiles(picked);
    }
  };

  // Executar Backup Agora
  const handleRunBackup = async () => {
    if (!activeConnection || !backupFolder.trim() || !window.electronAPI?.runDbBackup) return;
    setIsRunningBackup(true);
    setBackupResult(null);
    try {
      const res = await window.electronAPI.runDbBackup(
        activeConnection,
        backupFolder.trim(),
        activeConnection.type === 'oracle' ? backupOracleDirectory.trim() || undefined : undefined,
        backupCompress
      );
      setBackupResult(res);
      // Atualiza o cache local de settings para refletir a pasta salva sem precisar recarregar
      setSettings((prev) => {
        if (!prev) return prev;
        const existing = prev.backupConfigs || [];
        const previous = existing.find((b) => b.connectionId === activeConnection.id);
        const entry: BackupConfig = {
          ...previous,
          connectionId: activeConnection.id,
          destinationFolder: backupFolder.trim(),
          oracleDirectory: activeConnection.type === 'oracle' ? backupOracleDirectory.trim() || undefined : previous?.oracleDirectory,
          compress: backupCompress,
          lastRunAt: new Date().toISOString(),
          lastSuccess: res.success,
          lastMessage: res.message
        };
        return { ...prev, backupConfigs: [entry, ...existing.filter((b) => b.connectionId !== activeConnection.id)] };
      });
      if (res.success) refreshBackupFiles(backupFolder.trim());
      refreshBackupHistory(activeConnection.id);
    } catch (err: any) {
      setBackupResult({ success: false, message: err?.message || 'Erro inesperado ao executar backup.' });
    } finally {
      setIsRunningBackup(false);
    }
  };

  // Salvar Agendamento de Backup (cron + retenção)
  const handleSaveBackupSchedule = async () => {
    if (!activeConnection || !backupFolder.trim() || !window.electronAPI?.saveDbBackupConfig) return;
    setIsSavingSchedule(true);
    setScheduleSaveResult(null);
    try {
      const config: BackupConfig = {
        connectionId: activeConnection.id,
        destinationFolder: backupFolder.trim(),
        cronExpression: backupCron.trim() || undefined,
        enabled: backupScheduleEnabled,
        retentionCount: backupRetentionCount.trim() ? Number(backupRetentionCount.trim()) : undefined,
        retentionDays: backupRetentionDays.trim() ? Number(backupRetentionDays.trim()) : undefined,
        compress: backupCompress,
        oracleDirectory: activeConnection.type === 'oracle' ? backupOracleDirectory.trim() || undefined : undefined
      };
      const res = await window.electronAPI.saveDbBackupConfig(config);
      setScheduleSaveResult(res);
      if (res.success) {
        setSettings((prev) => {
          if (!prev) return prev;
          const existing = prev.backupConfigs || [];
          const previous = existing.find((b) => b.connectionId === activeConnection.id);
          const merged = { ...previous, ...config };
          return { ...prev, backupConfigs: [merged, ...existing.filter((b) => b.connectionId !== activeConnection.id)] };
        });
      }
    } catch (err: any) {
      setScheduleSaveResult({ success: false, message: err?.message || 'Erro inesperado ao salvar agendamento.' });
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Restaurar um backup existente na conexão ativa (operação destrutiva)
  const handleRestoreBackup = async (file: BackupFileInfo) => {
    if (!activeConnection || !window.electronAPI?.restoreDbBackup) return;

    const confirmed = window.confirm(
      `Restaurar "${file.fileName}" na conexão "${activeConnection.name}"?\n\n` +
        'Isso executa o backup contra o banco de dados AGORA e pode sobrescrever ou duplicar dados existentes. Essa ação não pode ser desfeita pelo Dev Manager.'
    );
    if (!confirmed) return;

    setRestoringFilePath(file.filePath);
    setRestoreResult(null);
    try {
      const res = await window.electronAPI.restoreDbBackup(activeConnection, file.filePath);
      setRestoreResult(res);
      refreshBackupHistory(activeConnection.id);
    } catch (err: any) {
      setRestoreResult({ success: false, message: err?.message || 'Erro inesperado ao restaurar backup.' });
    } finally {
      setRestoringFilePath(null);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Executar SQL
  const handleExecuteSql = async () => {
    if (!activeConnection) {
      alert('Selecione ou crie uma conexão antes de executar consultas.');
      return;
    }

    const cleanSql = sql.trim().replace(/;+\s*$/, '');
    if (!cleanSql) return;

    setIsExecuting(true);
    setActiveResultTab('grid');
    // Resetar filtros e seleções anteriores para a nova consulta
    setSearchTerm('');
    setColumnFilters({});
    setSortConfig(null);
    setSelectedRowIndex(null);
    setActiveColumnMenu(null);
    setCellContextMenu(null);

    try {
      const res = await window.electronAPI.executeDbQuery(activeConnection, cleanSql, maxRows);
      setQueryResult(res);

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
        } catch {}
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

  const handleClearHistory = () => {
    if (confirm('Deseja limpar todo o histórico de consultas salvas?')) {
      setHistory([]);
      try {
        localStorage.removeItem('devManager:dbHistory');
      } catch {}
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleExecuteSql();
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

  // Gerar Explain Plan (Plano de Execução)
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
    setShowSnippetsMenu(false);
  };

  const handleExecuteSnippetDirectly = (snip: SqlSnippet, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const clean = snip.sql.trim().replace(/;+\s*$/, '');
    setSql(clean);
    setShowSnippetsMenu(false);
    if (!activeConnection) {
      alert('Selecione uma conexão antes de executar.');
      return;
    }
    // Executa diretamente
    setIsExecuting(true);
    setActiveResultTab('grid');
    setSearchTerm('');
    setColumnFilters({});
    setSortConfig(null);
    setSelectedRowIndex(null);
    setActiveColumnMenu(null);
    setCellContextMenu(null);

    window.electronAPI
      ?.executeDbQuery(activeConnection, clean, maxRows)
      .then((res) => {
        setQueryResult(res);
        const historyItem: ExecutionHistoryItem = {
          id: `hist_${Date.now()}`,
          sql: clean,
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
          } catch {}
          return updated;
        });
      })
      .catch((err) => {
        setQueryResult({
          success: false,
          columns: [],
          rows: [],
          rowCount: 0,
          executionTimeMs: 0,
          isQuery: false,
          error: err.message || 'Erro inesperado ao executar comando.'
        });
      })
      .finally(() => {
        setIsExecuting(false);
      });
  };

  // Snippet rápido de consulta para tabela
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

  // Detecção de tipo de dado por coluna (para ícones e ordenação adequada no grid)
  const columnDataTypes = useMemo<Record<string, 'number' | 'date' | 'boolean' | 'object' | 'string'>>(() => {
    if (!queryResult || !queryResult.columns || !queryResult.rows) return {};
    const types: Record<string, 'number' | 'date' | 'boolean' | 'object' | 'string'> = {};

    for (const col of queryResult.columns) {
      let detected: 'number' | 'date' | 'boolean' | 'object' | 'string' = 'string';
      for (const row of queryResult.rows) {
        const val = row[col];
        if (val !== null && val !== undefined && val !== '') {
          if (typeof val === 'number') {
            detected = 'number';
            break;
          }
          if (typeof val === 'boolean') {
            detected = 'boolean';
            break;
          }
          if (typeof val === 'object') {
            if (val instanceof Date) {
              detected = 'date';
            } else {
              detected = 'object';
            }
            break;
          }
          if (typeof val === 'string') {
            const trimmed = val.trim();
            if (/^-?\d+(\.\d+)?$/.test(trimmed) && !isNaN(Number(trimmed))) {
              detected = 'number';
              break;
            }
            if (/^\d{4}-\d{2}-\d{2}/.test(trimmed) || /^\d{2}\/\d{2}\/\d{4}/.test(trimmed)) {
              detected = 'date';
              break;
            }
            detected = 'string';
            break;
          }
        }
      }
      types[col] = detected;
    }
    return types;
  }, [queryResult]);

  // Linhas processadas com busca global, filtros por coluna e ordenação
  const processedRows = useMemo(() => {
    if (!queryResult?.rows) return [];
    let list = [...queryResult.rows];

    // 1. Busca global (searchTerm)
    if (searchTerm.trim()) {
      const termLower = searchTerm.trim().toLowerCase();
      list = list.filter((row) => {
        return queryResult.columns.some((col) => {
          const val = row[col];
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(termLower);
        });
      });
    }

    // 2. Filtros por coluna específica
    const activeFilters = Object.entries(columnFilters).filter(([, v]) => v && v.trim());
    if (activeFilters.length > 0) {
      list = list.filter((row) => {
        return activeFilters.every(([col, filterVal]) => {
          const val = row[col];
          const lowerFilter = filterVal.trim().toLowerCase();
          if (lowerFilter === '[null]' || lowerFilter === 'null') {
            return val === null || val === undefined;
          }
          if (lowerFilter === 'not null' || lowerFilter === '!null') {
            return val !== null && val !== undefined;
          }
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(lowerFilter);
        });
      });
    }

    // 3. Ordenação (sortConfig)
    if (sortConfig) {
      const { column, direction } = sortConfig;
      const type = columnDataTypes[column] || 'string';

      list.sort((a, b) => {
        const valA = a[column];
        const valB = b[column];

        // Nulos sempre no final
        if ((valA === null || valA === undefined) && (valB === null || valB === undefined)) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        let comp = 0;
        if (type === 'number') {
          const numA = Number(valA);
          const numB = Number(valB);
          if (!isNaN(numA) && !isNaN(numB)) {
            comp = numA - numB;
          } else {
            comp = String(valA).localeCompare(String(valB));
          }
        } else if (type === 'date') {
          const dateA = new Date(valA).getTime();
          const dateB = new Date(valB).getTime();
          if (!isNaN(dateA) && !isNaN(dateB)) {
            comp = dateA - dateB;
          } else {
            comp = String(valA).localeCompare(String(valB));
          }
        } else {
          comp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
        }

        return direction === 'asc' ? comp : -comp;
      });
    }

    return list;
  }, [queryResult, searchTerm, columnFilters, sortConfig, columnDataTypes]);

  // Contagem de filtros ativos
  const hasActiveFilters = useMemo(() => {
    return Boolean(
      searchTerm.trim() ||
      sortConfig !== null ||
      Object.values(columnFilters).some((v) => v && v.trim())
    );
  }, [searchTerm, sortConfig, columnFilters]);

  // Limpar todos os filtros e ordenações
  const handleClearAllFilters = () => {
    setSearchTerm('');
    setColumnFilters({});
    setSortConfig(null);
    setSelectedRowIndex(null);
    setActiveColumnMenu(null);
    setCellContextMenu(null);
  };

  // Alternar ordenação de uma coluna (clique no cabeçalho)
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

  // Aplicar filtro rápido por valor a partir de uma célula
  const handleFilterByCellValue = (col: string, val: any) => {
    const filterText = val === null || val === undefined ? '[null]' : String(val);
    setColumnFilters((prev) => ({
      ...prev,
      [col]: filterText
    }));
    setCellContextMenu(null);
  };

  // Exportar para CSV (respeita dados filtrados e ordenados atuais)
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

  // Copiar Conteúdo de Célula
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
    <div className="flex h-full w-full bg-background overflow-hidden select-none">
      {/* Sidebar de Conexões e Tabelas */}
      <aside className="w-72 bg-card/60 border-r border-border/70 flex flex-col shrink-0">
        {/* Topo da Sidebar: Seletor de Conexão */}
        <div className="p-3 border-b border-border/70 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-foreground tracking-wide uppercase">Conexões</span>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center space-x-1 px-2 py-1 bg-primary text-primary-foreground rounded text-[11px] font-semibold hover:bg-primary/90 transition shadow-sm"
          >
            <Plus className="w-3 h-3" />
            <span>Nova</span>
          </button>
        </div>

        {/* Lista de Conexões Salvas */}
        <div className="p-2 space-y-1 overflow-y-auto max-h-48 border-b border-border/60">
          {connections.length === 0 ? (
            <div className="text-center py-4 text-xs text-muted-foreground">
              Nenhuma conexão cadastrada.
              <button
                onClick={handleOpenCreateModal}
                className="block mx-auto mt-2 text-primary font-bold hover:underline"
              >
                + Adicionar Conexão
              </button>
            </div>
          ) : (
            connections.map((conn) => {
              const isActive = conn.id === activeConnectionId;
              return (
                <div
                  key={conn.id}
                  onClick={() => setActiveConnectionId(conn.id)}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition text-xs border ${
                    isActive
                      ? 'bg-primary/15 border-primary/40 text-foreground font-semibold shadow-xs'
                      : 'bg-card/40 border-transparent hover:bg-card hover:border-border text-muted-foreground'
                  }`}
                >
                  <div className="flex flex-col truncate pr-1">
                    <div className="flex items-center space-x-1.5 truncate">
                      {getDbBadge(conn.type)}
                      <span className="truncate">{conn.name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate font-mono mt-0.5">
                      {conn.user}@{conn.host}:{conn.port}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditModal(conn);
                      }}
                      title="Editar Conexão"
                      className="p-1 hover:text-foreground text-muted-foreground rounded hover:bg-muted/50 transition"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConnection(conn.id);
                      }}
                      title="Excluir Conexão"
                      className="p-1 hover:text-red-400 text-muted-foreground rounded hover:bg-muted/50 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Explorador de Tabelas do Schema */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-2.5 border-b border-border/60 flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Table className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[11px] font-bold text-muted-foreground uppercase">Tabelas</span>
              <span className="text-[10px] bg-muted px-1.5 py-0.2 rounded font-mono font-medium text-foreground">
                {tables.length}
              </span>
            </div>
            <button
              onClick={fetchTables}
              disabled={isLoadingTables || !activeConnection}
              title="Recarregar lista de tabelas"
              className="p-1 hover:text-foreground text-muted-foreground rounded hover:bg-muted/50 transition disabled:opacity-50"
            >
              <RotateCw className={`w-3 h-3 ${isLoadingTables ? 'animate-spin text-primary' : ''}`} />
            </button>
          </div>

          <div className="p-2 border-b border-border/40">
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-2.5 text-muted-foreground" />
              <input
                type="text"
                value={tableFilter}
                onChange={(e) => setTableFilter(e.target.value)}
                placeholder="Filtrar tabelas..."
                className="w-full bg-background border border-border/70 rounded-md pl-7 pr-2 py-1 text-xs focus:outline-none focus:border-primary text-foreground"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-1 space-y-0.5 font-mono text-[11px]">
            {tables.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                {isLoadingTables ? (
                  <span className="flex items-center justify-center gap-1.5 text-primary">
                    <RotateCw className="w-3 h-3 animate-spin" /> Carregando tabelas...
                  </span>
                ) : (
                  <div>
                    <p className="text-[11px]">Nenhuma tabela listada.</p>
                    <button
                      onClick={fetchTables}
                      className="mt-1.5 text-[11px] text-primary font-bold hover:underline"
                    >
                      Buscar Tabelas
                    </button>
                  </div>
                )}
              </div>
            ) : (
              filteredTables.map((tbl) => {
                const isExpanded = expandedTable === tbl;
              const cols = tableColumns[tbl];
              const isLoadingCols = isLoadingColumns[tbl];

              return (
                <div key={tbl} className="rounded-lg border border-transparent hover:border-border/40 transition overflow-hidden">
                  <div
                    onClick={() => handleTableClick(tbl)}
                    title={`Inserir query SELECT para ${tbl}`}
                    className={`w-full text-left px-2 py-1.5 rounded text-muted-foreground hover:text-foreground flex items-center justify-between group cursor-pointer transition ${
                      isExpanded ? 'bg-muted/70 text-foreground font-bold' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center space-x-1 min-w-0 truncate">
                      <button
                        type="button"
                        onClick={(e) => handleToggleTableExpand(tbl, e)}
                        title={isExpanded ? 'Recolher colunas' : 'Inspecionar colunas'}
                        className="p-0.5 rounded hover:bg-card text-muted-foreground hover:text-primary transition shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 group-hover:text-primary" />
                        )}
                      </button>
                      <span className="truncate">{tbl}</span>
                    </div>
                    {cols && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-muted/60 text-muted-foreground shrink-0 font-mono">
                        {cols.length}
                      </span>
                    )}
                  </div>

                  {/* Lista de colunas expandida */}
                  {isExpanded && (
                    <div className="bg-background/80 border-t border-border/40 p-1 pl-4 space-y-0.5 text-[10px]">
                      {isLoadingCols ? (
                        <div className="py-2 text-center text-muted-foreground flex items-center justify-center gap-1">
                          <RotateCw className="w-3 h-3 animate-spin text-primary" /> Carregando colunas...
                        </div>
                      ) : !cols || cols.length === 0 ? (
                        <div className="py-1 text-center text-muted-foreground italic">Nenhuma coluna detectada.</div>
                      ) : (
                        cols.map((col) => (
                          <div
                            key={col.name}
                            onClick={() => handleInsertColumnName(col.name)}
                            title={`Clique para inserir '${col.name}' no editor`}
                            className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-muted cursor-pointer group/col transition"
                          >
                            <div className="flex items-center space-x-1.5 truncate">
                              {col.isPrimaryKey && (
                                <span title="Chave Primária (PK)" className="flex items-center justify-center shrink-0">
                                  <Key className="w-2.5 h-2.5 text-amber-400" />
                                </span>
                              )}
                              <span className="font-semibold text-foreground group-hover/col:text-primary truncate">
                                {col.name}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 shrink-0">
                              <span className="text-[9px] text-muted-foreground font-mono">{col.type}</span>
                              {col.nullable === false && (
                                <span className="text-[8px] px-1 rounded bg-amber-500/10 text-amber-400 font-bold">
                                  NOT NULL
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
            )}
          </div>
        </div>
      </aside>

      {/* Área Principal: Editor SQL e Resultados */}
      <main className="flex-1 flex flex-col overflow-hidden bg-background">
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
                            handleOpenCreateSnippet();
                          }}
                          className="flex items-center space-x-1 px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-black rounded text-[11px] font-bold transition"
                          title="Salvar consulta atual do editor"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Nova</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowSnippetsMenu(false)}
                          className="text-muted-foreground hover:text-foreground p-1 rounded"
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
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                                  handleOpenCreateSnippet();
                                }}
                                className="text-primary hover:underline font-bold text-[11px] block mx-auto"
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
                                      onClick={(e) => handleExecuteSnippetDirectly(s, e)}
                                      className="p-1 rounded bg-emerald-600/15 hover:bg-emerald-600 text-emerald-500 hover:text-white transition"
                                      title="Executar imediatamente"
                                    >
                                      <Play className="w-3 h-3 fill-current" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSelectSnippet(s)}
                                      className="p-1 rounded bg-primary/15 hover:bg-primary text-primary hover:text-primary-foreground transition"
                                      title="Carregar no editor"
                                    >
                                      <FileCode className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        setShowSnippetsMenu(false);
                                        handleOpenEditSnippet(s, e);
                                      }}
                                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition"
                                      title="Editar consulta salva"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => handleDeleteCustomSnippet(s.id, e)}
                                      className="p-1 rounded text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition"
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
                              onClick={() => handleSelectSnippet(s)}
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
                                onClick={(e) => handleExecuteSnippetDirectly(s, e)}
                                className="p-1 rounded hover:bg-emerald-600/20 text-emerald-500 transition shrink-0 opacity-0 group-hover:opacity-100"
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
              onClick={() => handleOpenCreateSnippet()}
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
              onClick={handleOpenBackupModal}
              disabled={!activeConnection}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-card hover:bg-muted border border-border/70 rounded-lg text-xs font-medium text-foreground transition shadow-xs disabled:opacity-50"
              title="Fazer backup do banco de dados conectado"
            >
              <HardDriveDownload className="w-3.5 h-3.5 text-sky-400" />
              <span>Backup</span>
            </button>

            {/* Botão Explain Plan */}
            <button
              type="button"
              onClick={handleExplainPlan}
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
              onClick={handleExecuteSql}
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

        {/* Editor de Código SQL */}
        <div className="h-44 border-b border-border/70 relative shrink-0">
          <textarea
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite aqui seu comando SQL (SELECT, UPDATE, INSERT, DELETE, etc.)..."
            className="w-full h-full p-3 bg-[#0B0F17] text-emerald-300 font-mono text-xs resize-none focus:outline-none [scrollbar-width:thin]"
            spellCheck={false}
          />
          {copyFeedback && (
            <div className="absolute right-3 bottom-3 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 rounded shadow-md animate-fade-in">
              {copyFeedback}
            </div>
          )}
        </div>

        {/* Barra de Status e Tabs de Resultado */}
        <div className="px-3 py-1.5 bg-card/60 border-b border-border/70 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveResultTab('grid')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold transition ${
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
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold transition ${
                activeResultTab === 'explain'
                  ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>Explain Plan</span>
            </button>
            <button
              onClick={() => setActiveResultTab('history')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold transition ${
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
          {queryResult && (
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
                      className="flex items-center space-x-1 text-primary hover:underline font-medium text-[11px]"
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

        {/* Conteúdo: Grid de Resultados ou Histórico */}
        <div className="flex-1 overflow-auto bg-card/20">
          {activeResultTab === 'grid' ? (
            <div className="h-full">
              {!queryResult ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-xs space-y-2">
                  <Terminal className="w-8 h-8 opacity-40" />
                  <p>Execute uma consulta ou comando SQL para visualizar os resultados aqui.</p>
                  <span className="text-[11px] opacity-60">Dica: use Ctrl+Enter para executar direto do editor.</span>
                </div>
              ) : !queryResult.success ? (
                <div className="p-4 m-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-800 dark:text-rose-300 text-xs">
                  <div className="flex items-center space-x-2 font-bold mb-1">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>Falha na execução do SQL:</span>
                  </div>
                  <pre className="font-mono text-[11px] whitespace-pre-wrap bg-card p-3 rounded-lg border border-border text-rose-700 dark:text-rose-300 mt-2">
                    {queryResult.error}
                  </pre>
                </div>
              ) : !queryResult.isQuery ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">Comando executado com sucesso!</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {queryResult.affectedRows !== undefined
                      ? `${queryResult.affectedRows} linha(s) afetada(s) no banco de dados.`
                      : 'Comando processado sem retorno de linhas.'}
                  </p>
                  <span className="text-[11px] font-mono text-muted-foreground mt-2">
                    Tempo decorrido: {queryResult.executionTimeMs} ms
                  </span>
                </div>
              ) : queryResult.rows && queryResult.rows.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-xs">
                  <Info className="w-6 h-6 opacity-40 mb-1" />
                  <p>A consulta não retornou nenhuma linha.</p>
                </div>
              ) : (
                /* Grid de Dados com Tabela e Filtros */
                <div className="flex flex-col h-full">
                  {/* Barra de Filtro Rápido Superior (estilo DBeaver) */}
                  <div className="px-3 py-2 bg-muted/40 border-b border-border/70 flex items-center justify-between gap-3 shrink-0 flex-wrap">
                    <div className="relative flex-1 min-w-[240px] max-w-xl">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Filtrar resultados... (digite qualquer termo para buscar em todas as colunas)"
                        className="w-full pl-8 pr-7 py-1 text-xs bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary font-sans"
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => setSearchTerm('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          title="Limpar busca"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 text-xs">
                      {hasActiveFilters ? (
                        <>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            <Filter className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            <span>
                              {processedRows.length} de {queryResult.rowCount} linha(s)
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={handleClearAllFilters}
                            className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition cursor-pointer"
                            title="Remover todos os filtros e ordenações da tabela"
                          >
                            <FilterX className="w-3 h-3" />
                            <span>Limpar filtros</span>
                          </button>
                        </>
                      ) : (
                        <span className="text-muted-foreground text-[11px] font-mono">
                          {processedRows.length} linha(s)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tabela de Resultados */}
                  <div className="flex-1 overflow-auto min-w-full relative">
                    <table className="min-w-full divide-y divide-border/60 text-xs font-mono border-separate border-spacing-0">
                      <thead className="bg-slate-100 dark:bg-[#181F2E] sticky top-0 z-10 border-b border-border shadow-xs">
                        <tr>
                          <th className="px-2.5 py-2 text-center text-[10px] font-bold text-muted-foreground uppercase border-b border-r border-border/50 w-12 bg-slate-100 dark:bg-[#181F2E] select-none">
                            #
                          </th>
                          {queryResult.columns.map((col) => {
                            const dType = columnDataTypes[col] || 'string';
                            const isSorted = sortConfig?.column === col;
                            const hasColFilter = Boolean(columnFilters[col]?.trim());
                            const isMenuOpen = activeColumnMenu === col;

                            return (
                              <th
                                key={col}
                                className="px-2.5 py-1.5 text-left border-b border-r border-border/50 whitespace-nowrap bg-slate-100 dark:bg-[#181F2E] relative select-none group"
                              >
                                <div className="flex items-center justify-between gap-1.5">
                                  <div
                                    onClick={() => handleToggleSort(col)}
                                    className="flex items-center space-x-1.5 cursor-pointer hover:text-primary transition flex-1 py-0.5"
                                    title={`Clique para ordenar por ${col} (ASC / DESC)`}
                                  >
                                    {/* Indicador de Tipo de Dado (estilo DBeaver: 123, ABC, 📅) */}
                                    {dType === 'number' ? (
                                      <span className="px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                                        123
                                      </span>
                                    ) : dType === 'date' ? (
                                      <span className="px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                                        📅
                                      </span>
                                    ) : dType === 'boolean' ? (
                                      <span className="px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                        0/1
                                      </span>
                                    ) : dType === 'object' ? (
                                      <span className="px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                                        {'{ }'}
                                      </span>
                                    ) : (
                                      <span className="px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30">
                                        ABC
                                      </span>
                                    )}

                                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100">
                                      {col}
                                    </span>

                                    {isSorted && (
                                      sortConfig?.direction === 'asc' ? (
                                        <ArrowUp className="w-3 h-3 text-primary shrink-0" />
                                      ) : (
                                        <ArrowDown className="w-3 h-3 text-primary shrink-0" />
                                      )
                                    )}
                                  </div>

                                  {/* Botão de Menu e Filtro da Coluna */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveColumnMenu(isMenuOpen ? null : col);
                                    }}
                                    className={`p-1 rounded transition ${
                                      hasColFilter
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground/50 hover:text-foreground hover:bg-muted/80 opacity-60 group-hover:opacity-100'
                                    }`}
                                    title={`Filtrar ou ordenar coluna ${col}`}
                                  >
                                    <Filter className="w-2.5 h-2.5" />
                                  </button>
                                </div>

                                {/* Menu Popover da Coluna (estilo DBeaver) */}
                                {isMenuOpen && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-20 cursor-default"
                                      onClick={() => setActiveColumnMenu(null)}
                                    />
                                    <div className="absolute left-0 top-full mt-1 w-64 bg-popover text-popover-foreground rounded-lg shadow-xl border border-border p-2.5 z-30 font-sans text-xs space-y-2">
                                      <div className="font-bold text-[11px] text-muted-foreground pb-1 border-b border-border flex items-center justify-between">
                                        <span>Opções: {col}</span>
                                        <button
                                          onClick={() => setActiveColumnMenu(null)}
                                          className="hover:text-foreground text-muted-foreground"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>

                                      <div className="space-y-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSortConfig({ column: col, direction: 'asc' });
                                            setActiveColumnMenu(null);
                                          }}
                                          className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded hover:bg-accent transition text-left ${
                                            sortConfig?.column === col && sortConfig.direction === 'asc'
                                              ? 'font-bold text-primary bg-primary/10'
                                              : ''
                                          }`}
                                        >
                                          <ArrowUp className="w-3.5 h-3.5 text-primary shrink-0" />
                                          <span>Order by {col} ASC</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSortConfig({ column: col, direction: 'desc' });
                                            setActiveColumnMenu(null);
                                          }}
                                          className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded hover:bg-accent transition text-left ${
                                            sortConfig?.column === col && sortConfig.direction === 'desc'
                                              ? 'font-bold text-primary bg-primary/10'
                                              : ''
                                          }`}
                                        >
                                          <ArrowDown className="w-3.5 h-3.5 text-primary shrink-0" />
                                          <span>Order by {col} DESC</span>
                                        </button>
                                      </div>

                                      <div className="pt-1.5 border-t border-border space-y-1.5">
                                        <label className="text-[10px] font-semibold text-muted-foreground block">
                                          Filtrar por valor nesta coluna:
                                        </label>
                                        <div className="relative">
                                          <input
                                            type="text"
                                            value={columnFilters[col] || ''}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              setColumnFilters((prev) => ({
                                                ...prev,
                                                [col]: val
                                              }));
                                            }}
                                            placeholder="Ex: texto, [null], !null..."
                                            className="w-full px-2 py-1 text-xs bg-background border border-border rounded font-mono"
                                            autoFocus
                                          />
                                          {columnFilters[col] && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setColumnFilters((prev) => {
                                                  const copy = { ...prev };
                                                  delete copy[col];
                                                  return copy;
                                                });
                                              }}
                                              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          )}
                                        </div>
                                      </div>

                                      <div className="pt-1.5 border-t border-border flex items-center justify-between text-[11px]">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setColumnFilters((prev) => ({
                                              ...prev,
                                              [col]: '[null]'
                                            }));
                                            setActiveColumnMenu(null);
                                          }}
                                          className="text-muted-foreground hover:text-foreground underline text-[10px]"
                                        >
                                          Apenas [NULL]
                                        </button>

                                        {(hasColFilter || isSorted) && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (isSorted) setSortConfig(null);
                                              setColumnFilters((prev) => {
                                                const copy = { ...prev };
                                                delete copy[col];
                                                return copy;
                                              });
                                              setActiveColumnMenu(null);
                                            }}
                                            className="text-rose-500 hover:text-rose-600 font-semibold text-[10px]"
                                          >
                                            Limpar coluna
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-border/40">
                        {processedRows.length === 0 ? (
                          <tr className="bg-background">
                            <td
                              colSpan={queryResult.columns.length + 1}
                              className="py-12 text-center text-muted-foreground text-xs font-sans"
                            >
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <FilterX className="w-8 h-8 opacity-30 text-amber-500" />
                                <p className="font-semibold text-foreground">Nenhum resultado corresponde aos filtros aplicados.</p>
                                <span className="text-[11px] opacity-70">Tente ajustar o termo de busca ou filtros de coluna.</span>
                                <button
                                  type="button"
                                  onClick={handleClearAllFilters}
                                  className="mt-2 px-3 py-1 bg-primary/15 text-primary hover:bg-primary/25 rounded text-xs font-semibold transition"
                                >
                                  Remover todos os filtros
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          processedRows.map((row, idx) => {
                            const isSelected = selectedRowIndex === idx;

                            return (
                              <tr
                                key={idx}
                                onClick={() => setSelectedRowIndex(idx)}
                                className={`transition-colors select-text cursor-pointer ${
                                  isSelected
                                    ? 'bg-sky-500/15 dark:bg-sky-500/25 border-l-4 border-sky-500 font-medium'
                                    : idx % 2 === 0
                                    ? 'bg-background hover:bg-muted/30'
                                    : 'bg-muted/15 dark:bg-muted/10 hover:bg-muted/30'
                                }`}
                              >
                                <td className="px-2 py-1.5 text-center text-muted-foreground text-[10px] border-r border-border/30 select-none">
                                  {idx + 1}
                                </td>
                                {queryResult.columns.map((col) => {
                                  const val = row[col];
                                  const isNull = val === null || val === undefined;
                                  const dType = columnDataTypes[col] || 'string';

                                  return (
                                    <td
                                      key={col}
                                      onClick={() => handleCopyCell(val, `cell_${idx}_${col}`)}
                                      onContextMenu={(e) => {
                                        e.preventDefault();
                                        setSelectedRowIndex(idx);
                                        setCellContextMenu({
                                          x: e.clientX,
                                          y: e.clientY,
                                          column: col,
                                          value: val,
                                          rowIndex: idx
                                        });
                                      }}
                                      title="Clique para copiar | Botão direito para filtrar por valor"
                                      className="px-3 py-1.5 border-r border-border/30 whitespace-nowrap max-w-xs truncate hover:bg-sky-500/10 dark:hover:bg-sky-500/20 transition-colors cursor-pointer"
                                    >
                                      {isNull ? (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono select-none bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400 italic border border-slate-300/70 dark:border-slate-700/70">
                                          [NULL]
                                        </span>
                                      ) : dType === 'number' || typeof val === 'number' ? (
                                        <span className="text-blue-700 dark:text-sky-300 font-mono font-medium">
                                          {String(val)}
                                        </span>
                                      ) : dType === 'date' ? (
                                        <span className="text-purple-700 dark:text-purple-300 font-mono font-medium">
                                          {String(val)}
                                        </span>
                                      ) : typeof val === 'boolean' ? (
                                        <span className="text-amber-700 dark:text-amber-400 font-mono font-semibold">
                                          {String(val)}
                                        </span>
                                      ) : typeof val === 'object' ? (
                                        <span className="text-teal-700 dark:text-teal-300 font-mono text-[11px]">
                                          {JSON.stringify(val)}
                                        </span>
                                      ) : (
                                        <span className="text-slate-800 dark:text-slate-100 font-mono">
                                          {String(val)}
                                        </span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Menu de Contexto ao Clicar com Botão Direito na Célula (estilo DBeaver: Filtrar por valor) */}
                  {cellContextMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40 cursor-default"
                        onClick={() => setCellContextMenu(null)}
                      />
                      <div
                        style={{
                          top: Math.min(cellContextMenu.y, window.innerHeight - 180),
                          left: Math.min(cellContextMenu.x, window.innerWidth - 250)
                        }}
                        className="fixed z-50 w-60 bg-popover text-popover-foreground rounded-lg shadow-2xl border border-border p-1.5 text-xs font-sans animate-fade-in space-y-1"
                      >
                        <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground border-b border-border/60">
                          Célula: {cellContextMenu.column}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleFilterByCellValue(cellContextMenu.column, cellContextMenu.value)}
                          className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded hover:bg-accent transition text-left text-foreground font-semibold"
                        >
                          <Filter className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="truncate">
                            Filtrar por "{cellContextMenu.value === null || cellContextMenu.value === undefined ? '[NULL]' : String(cellContextMenu.value)}"
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            handleCopyCell(cellContextMenu.value);
                            setCellContextMenu(null);
                          }}
                          className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded hover:bg-accent transition text-left text-muted-foreground hover:text-foreground"
                        >
                          <Copy className="w-3.5 h-3.5 shrink-0" />
                          <span>Copiar valor</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const row = processedRows[cellContextMenu.rowIndex];
                            if (row) {
                              copyCellToClipboard(JSON.stringify(row, null, 2), 'Linha copiada!');
                            }
                            setCellContextMenu(null);
                          }}
                          className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded hover:bg-accent transition text-left text-muted-foreground hover:text-foreground"
                        >
                          <FileCode className="w-3.5 h-3.5 shrink-0" />
                          <span>Copiar linha (JSON)</span>
                        </button>

                        <div className="pt-1 border-t border-border/60">
                          <button
                            type="button"
                            onClick={() => setCellContextMenu(null)}
                            className="w-full text-center py-1 text-[10px] text-muted-foreground hover:text-foreground"
                          >
                            Fechar
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : activeResultTab === 'explain' ? (
            /* Tab de Explain Plan */
            <div className="p-4 h-full overflow-auto font-mono text-xs">
              {!explainResult ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-xs space-y-2">
                  <Zap className="w-8 h-8 opacity-40 text-amber-500" />
                  <p>Clique em "Explain Plan" na barra superior para analisar o plano de execução e custo da query.</p>
                  <span className="text-[11px] opacity-60">Suporta Oracle (DBMS_XPLAN), PostgreSQL e MySQL.</span>
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
                          className="px-2 py-0.5 bg-muted hover:bg-muted/80 text-foreground rounded text-[10px] font-semibold transition"
                          title="Copiar SQL"
                        >
                          {copyFeedback === item.id ? 'Copiado!' : 'Copiar'}
                        </button>
                        <button
                          onClick={() => setSql(item.sql)}
                          className="px-2 py-0.5 bg-primary/20 hover:bg-primary text-primary hover:text-primary-foreground rounded text-[10px] font-semibold transition"
                          title="Carregar no editor"
                        >
                          Usar
                        </button>
                        <button
                          onClick={() => {
                            setSql(item.sql);
                            setTimeout(() => handleExecuteSql(), 50);
                          }}
                          className="px-2 py-0.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded text-[10px] font-semibold transition"
                          title="Executar imediatamente"
                        >
                          Executar
                        </button>
                        <button
                          onClick={() => handleOpenCreateSnippet(item.sql)}
                          className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500 text-amber-600 dark:text-amber-400 hover:text-black rounded text-[10px] font-semibold transition flex items-center gap-1"
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
      </main>

      {/* Modal de Adicionar / Editar Conexão */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  {editingConn.id ? 'Editar Conexão' : 'Nova Conexão de Banco'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConnection} className="p-4 space-y-3 text-xs">
              {/* Tipo de Banco */}
              <div>
                <label className="block font-bold text-foreground mb-1">Tipo de Banco</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['oracle', 'mysql', 'postgres'] as DatabaseType[]).map((type) => (
                    <button
                      type="button"
                      key={type}
                      onClick={() =>
                        setEditingConn({
                          ...editingConn,
                          type,
                          port: DEFAULT_PORTS[type]
                        })
                      }
                      className={`p-2 rounded-lg border text-center font-bold capitalize transition ${
                        editingConn.type === type
                          ? 'bg-primary/20 border-primary text-primary'
                          : 'bg-background border-border/70 text-muted-foreground hover:border-border'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nome Amigável */}
              <div>
                <label className="block font-medium text-foreground mb-1">Nome da Conexão</label>
                <input
                  type="text"
                  required
                  value={editingConn.name || ''}
                  onChange={(e) => setEditingConn({ ...editingConn, name: e.target.value })}
                  placeholder="Ex: Oracle Produção"
                  className="w-full bg-background border border-border/70 rounded-md p-2 text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              {/* Host e Porta */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block font-medium text-foreground mb-1">Host / Servidor / IP</label>
                  <input
                    type="text"
                    required
                    value={editingConn.host || ''}
                    onChange={(e) => setEditingConn({ ...editingConn, host: e.target.value })}
                    placeholder="localhost ou IP do WSL"
                    className="w-full bg-background border border-border/70 rounded-md p-2 text-foreground focus:outline-none focus:border-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-foreground mb-1">Porta</label>
                  <input
                    type="number"
                    required
                    value={editingConn.port || ''}
                    onChange={(e) => setEditingConn({ ...editingConn, port: Number(e.target.value) })}
                    className="w-full bg-background border border-border/70 rounded-md p-2 text-foreground focus:outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>

              {/* Database ou Service Name */}
              <div>
                <label className="block font-medium text-foreground mb-1">
                  {editingConn.type === 'oracle' ? 'Service Name ou SID' : 'Nome do Banco de Dados'}
                </label>
                <input
                  type="text"
                  required
                  value={editingConn.database || ''}
                  onChange={(e) => setEditingConn({ ...editingConn, database: e.target.value })}
                  placeholder={editingConn.type === 'oracle' ? 'Ex: XEPDB1 ou ORCL' : 'Ex: dev_db'}
                  className="w-full bg-background border border-border/70 rounded-md p-2 text-foreground focus:outline-none focus:border-primary font-mono"
                />
              </div>

              {/* Oracle: Opção Service Name vs SID */}
              {editingConn.type === 'oracle' && (
                <>
                  <div className="flex items-center space-x-4 pt-1">
                    <label className="flex items-center space-x-1.5 cursor-pointer text-muted-foreground">
                      <input
                        type="radio"
                        name="oracleMode"
                        checked={editingConn.oracleMode !== 'sid'}
                        onChange={() => setEditingConn({ ...editingConn, oracleMode: 'serviceName' })}
                        className="text-primary focus:ring-0"
                      />
                      <span>Service Name (Padrão)</span>
                    </label>
                    <label className="flex items-center space-x-1.5 cursor-pointer text-muted-foreground">
                      <input
                        type="radio"
                        name="oracleMode"
                        checked={editingConn.oracleMode === 'sid'}
                        onChange={() => setEditingConn({ ...editingConn, oracleMode: 'sid' })}
                        className="text-primary focus:ring-0"
                      />
                      <span>SID</span>
                    </label>
                  </div>

                  {/* Oracle: Modo Thick / Suporte a Oracle 11g */}
                  <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20 space-y-2 text-xs">
                    <label className="flex items-center space-x-2 cursor-pointer font-medium text-foreground">
                      <input
                        type="checkbox"
                        checked={Boolean(editingConn.oracleThickMode || editingConn.oracleClientPath)}
                        onChange={(e) =>
                          setEditingConn({
                            ...editingConn,
                            oracleThickMode: e.target.checked
                          })
                        }
                        className="rounded border-border text-primary focus:ring-0"
                      />
                      <span>Modo Thick / Suporte a Oracle 11g (Instant Client)</span>
                    </label>
                    <p className="text-[11px] text-muted-foreground leading-relaxed pl-5">
                      Obrigatório para Oracle 11g e anteriores para evitar o erro <span className="font-mono text-foreground font-semibold">NJS-138</span>. Requer bibliotecas nativas de 64 bits da Oracle.
                    </p>
                    {(editingConn.oracleThickMode || editingConn.oracleClientPath) && (
                      <div className="pl-5 pt-1 space-y-1">
                        <label className="block text-[11px] font-medium text-foreground">
                          Diretório do Oracle Instant Client (opcional se estiver no PATH):
                        </label>
                        <input
                          type="text"
                          value={editingConn.oracleClientPath || ''}
                          onChange={(e) =>
                            setEditingConn({ ...editingConn, oracleClientPath: e.target.value })
                          }
                          placeholder="Ex: C:\oracle\instantclient_19_25"
                          className="w-full bg-background border border-border/70 rounded-md p-1.5 text-foreground focus:outline-none focus:border-primary font-mono text-xs"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Usuário e Senha */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-foreground mb-1">Usuário</label>
                  <input
                    type="text"
                    required
                    value={editingConn.user || ''}
                    onChange={(e) => setEditingConn({ ...editingConn, user: e.target.value })}
                    placeholder="Ex: system, postgres, root"
                    className="w-full bg-background border border-border/70 rounded-md p-2 text-foreground focus:outline-none focus:border-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-foreground mb-1">Senha</label>
                  <input
                    type="password"
                    value={editingConn.password || ''}
                    onChange={(e) => setEditingConn({ ...editingConn, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-background border border-border/70 rounded-md p-2 text-foreground focus:outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>

              {/* Feedback de Teste de Conexão */}
              {testResult && (
                <div
                  className={`p-3 rounded-xl text-[11px] border ${
                    testResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  <div className="flex items-center space-x-2 font-bold">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                  {testResult.version && (
                    <p className="text-[10px] font-mono opacity-80 mt-1 truncate">
                      {testResult.version}
                    </p>
                  )}
                </div>
              )}

              {/* Botões de Ação */}
              <div className="pt-2 flex items-center justify-between border-t border-border/60">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg font-semibold transition disabled:opacity-50 flex items-center space-x-1"
                >
                  {isTesting ? (
                    <RotateCw className="w-3.5 h-3.5 animate-spin text-primary" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>Testar Conexão</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3 py-1.5 text-muted-foreground hover:text-foreground font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition shadow-sm"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal de Backup do Banco de Dados */}
      {isBackupModalOpen && activeConnection && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
              <div className="flex items-center space-x-2">
                <HardDriveDownload className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-foreground">
                  Backup — {activeConnection.name} {getDbBadge(activeConnection.type)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBackupModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs overflow-y-auto">
              <>
                <div>
                  <label className="block font-bold text-foreground mb-1">
                    {activeConnection.type === 'oracle' ? 'Pasta do DIRECTORY (no servidor Oracle)' : 'Pasta de Destino'}
                  </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={backupFolder}
                        onChange={(e) => setBackupFolder(e.target.value)}
                        placeholder="Ex: C:\Backups\Postgres"
                        className="flex-1 bg-background border border-border/70 rounded-md p-2 text-foreground focus:outline-none focus:border-primary font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleSelectBackupFolder}
                        className="p-2 bg-muted hover:bg-muted/80 text-foreground rounded-md transition shrink-0"
                        title="Selecionar pasta"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </button>
                    </div>
                    {activeConnection.type === 'oracle' ? (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        O <code>expdp</code> grava o dump no servidor Oracle, não nesta máquina. Essa pasta precisa
                        ser o mesmo caminho físico usado pelo objeto DIRECTORY abaixo (funciona direto quando o
                        banco roda na própria máquina).
                      </p>
                    ) : activeConnection.type === 'mysql' ? (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        A pasta é lembrada por conexão. O arquivo gerado usa <code>mysqldump</code> (precisa estar
                        instalado e acessível no PATH, ou configure o caminho em Configurações → mysqldumpPath).
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        A pasta é lembrada por conexão. O arquivo gerado usa <code>pg_dump</code> (precisa estar
                        instalado e acessível no PATH, ou configure o caminho em Configurações → pgDumpPath).
                      </p>
                    )}
                  </div>

                  {activeConnection.type === 'oracle' && (
                    <div>
                      <label className="block font-bold text-foreground mb-1">DIRECTORY Oracle</label>
                      <input
                        type="text"
                        value={backupOracleDirectory}
                        onChange={(e) => setBackupOracleDirectory(e.target.value)}
                        placeholder="DATA_PUMP_DIR"
                        className="w-full bg-background border border-border/70 rounded-md p-2 text-foreground focus:outline-none focus:border-primary font-mono"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Nome do objeto DIRECTORY já criado no Oracle (<code>CREATE DIRECTORY ... AS '...'</code>).
                        Padrão: <code>DATA_PUMP_DIR</code>. O schema exportado é o usuário da conexão (
                        {activeConnection.user}).
                      </p>
                    </div>
                  )}

                  <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={backupCompress}
                      onChange={(e) => setBackupCompress(e.target.checked)}
                      className="text-primary focus:ring-0"
                    />
                    <span>
                      Compactar backup
                      {activeConnection.type === 'postgres' && ' (formato custom, -Fc)'}
                      {activeConnection.type === 'mysql' && ' (.sql.gz)'}
                      {activeConnection.type === 'oracle' && ' (compression=ALL, requer Enterprise Edition)'}
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={handleRunBackup}
                    disabled={isRunningBackup || !backupFolder.trim()}
                    className="w-full flex items-center justify-center space-x-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold shadow-xs transition disabled:opacity-50"
                  >
                    {isRunningBackup ? (
                      <>
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Gerando backup...</span>
                      </>
                    ) : (
                      <>
                        <HardDriveDownload className="w-3.5 h-3.5" />
                        <span>Fazer Backup Agora</span>
                      </>
                    )}
                  </button>

                  {backupResult && (
                    <div
                      className={`p-3 rounded-xl border ${
                        backupResult.success
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2 font-bold">
                        {backupResult.success ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 shrink-0" />
                        )}
                        <span className="break-all">{backupResult.message}</span>
                      </div>
                      {backupResult.success && backupResult.sizeBytes !== undefined && (
                        <p className="text-[10px] font-mono opacity-80 mt-1">
                          {formatBytes(backupResult.sizeBytes)} · {backupResult.durationMs} ms
                        </p>
                      )}
                    </div>
                  )}

                  <div className="pt-2 border-t border-border/60 space-y-2">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                      <CalendarClock className="w-3 h-3" /> Agendamento Automático
                    </span>

                    <div className="flex items-center gap-2">
                      <select
                        value={backupCron}
                        onChange={(e) => setBackupCron(e.target.value)}
                        className="flex-1 bg-background border border-border/70 rounded-md p-2 text-foreground focus:outline-none focus:border-primary font-mono"
                      >
                        <option value="">Sem agendamento (só manual)</option>
                        <option value="0 * * * *">A cada hora</option>
                        <option value="0 */6 * * *">A cada 6 horas</option>
                        <option value="0 2 * * *">Diário às 02:00</option>
                        <option value="0 2 * * 0">Semanal (domingo às 02:00)</option>
                        {backupCron && !CRON_PRESETS.includes(backupCron) && (
                          <option value={backupCron}>Personalizado: {backupCron}</option>
                        )}
                      </select>
                      <input
                        type="text"
                        value={backupCron}
                        onChange={(e) => setBackupCron(e.target.value)}
                        placeholder="cron: 0 2 * * *"
                        className="w-32 bg-background border border-border/70 rounded-md p-2 text-foreground focus:outline-none focus:border-primary font-mono"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={backupScheduleEnabled}
                          onChange={(e) => setBackupScheduleEnabled(e.target.checked)}
                          disabled={!backupCron.trim()}
                          className="text-primary focus:ring-0"
                        />
                        <span>Ativo</span>
                      </label>
                      <div className="flex items-center gap-1.5 flex-1">
                        <span className="text-muted-foreground shrink-0">Manter últimos</span>
                        <input
                          type="number"
                          min={1}
                          value={backupRetentionCount}
                          onChange={(e) => setBackupRetentionCount(e.target.value)}
                          placeholder="todos"
                          className="w-16 bg-background border border-border/70 rounded-md p-1.5 text-foreground focus:outline-none focus:border-primary font-mono"
                        />
                        <span className="text-muted-foreground shrink-0">backups</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground shrink-0">Apagar com mais de</span>
                      <input
                        type="number"
                        min={1}
                        value={backupRetentionDays}
                        onChange={(e) => setBackupRetentionDays(e.target.value)}
                        placeholder="sem limite"
                        className="w-20 bg-background border border-border/70 rounded-md p-1.5 text-foreground focus:outline-none focus:border-primary font-mono"
                      />
                      <span className="text-muted-foreground shrink-0">dias</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveBackupSchedule}
                      disabled={isSavingSchedule || !backupFolder.trim()}
                      className="w-full flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg font-bold shadow-xs transition disabled:opacity-50"
                    >
                      <CalendarClock className={`w-3.5 h-3.5 ${isSavingSchedule ? 'animate-spin' : ''}`} />
                      <span>{isSavingSchedule ? 'Salvando...' : 'Salvar Agendamento'}</span>
                    </button>

                    {scheduleSaveResult && (
                      <div
                        className={`p-2 rounded-lg border text-[11px] ${
                          scheduleSaveResult.success
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
                        }`}
                      >
                        {scheduleSaveResult.message}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <FileArchive className="w-3 h-3" /> Backups na Pasta
                      </span>
                      <button
                        type="button"
                        onClick={() => refreshBackupFiles(backupFolder)}
                        disabled={!backupFolder.trim() || isLoadingBackupFiles}
                        className="p-1 hover:text-foreground text-muted-foreground rounded hover:bg-muted/50 transition disabled:opacity-50"
                        title="Recarregar lista"
                      >
                        <RotateCw className={`w-3 h-3 ${isLoadingBackupFiles ? 'animate-spin text-primary' : ''}`} />
                      </button>
                    </div>
                    {restoreResult && (
                      <div
                        className={`mb-2 p-2 rounded-lg border text-[11px] ${
                          restoreResult.success
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
                        }`}
                      >
                        {restoreResult.message}
                      </div>
                    )}
                    {backupFiles.length === 0 ? (
                      <div className="text-center py-3 text-[11px] text-muted-foreground">
                        Nenhum backup encontrado nesta pasta.
                      </div>
                    ) : (
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {backupFiles.map((f) => (
                          <div
                            key={f.filePath}
                            className="flex items-center justify-between p-2 bg-background/60 border border-border/50 rounded-lg gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="font-mono text-[10px] truncate block" title={f.filePath}>
                                {f.fileName}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {formatBytes(f.sizeBytes)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRestoreBackup(f)}
                              disabled={restoringFilePath !== null}
                              title="Restaurar este backup na conexão ativa (sobrescreve dados existentes)"
                              className="shrink-0 flex items-center gap-1 px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-md text-[10px] font-bold transition disabled:opacity-50"
                            >
                              {restoringFilePath === f.filePath ? (
                                <RotateCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3 h-3" />
                              )}
                              <span>Restaurar</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <History className="w-3 h-3" /> Histórico de Execuções
                      </span>
                      <button
                        type="button"
                        onClick={() => activeConnection && refreshBackupHistory(activeConnection.id)}
                        disabled={isLoadingBackupHistory}
                        className="p-1 hover:text-foreground text-muted-foreground rounded hover:bg-muted/50 transition disabled:opacity-50"
                        title="Recarregar histórico"
                      >
                        <RotateCw className={`w-3 h-3 ${isLoadingBackupHistory ? 'animate-spin text-primary' : ''}`} />
                      </button>
                    </div>
                    {backupHistory.length === 0 ? (
                      <div className="text-center py-3 text-[11px] text-muted-foreground">
                        Nenhuma execução registrada ainda para esta conexão.
                      </div>
                    ) : (
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {backupHistory.map((h) => (
                          <div
                            key={h.id}
                            className={`flex items-center justify-between p-2 bg-background/60 border rounded-lg gap-2 ${
                              h.success ? 'border-emerald-500/20' : 'border-rose-500/30'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <span className="flex items-center gap-1 text-[10px] font-bold">
                                {h.success ? (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                ) : (
                                  <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                                )}
                                <span className="text-muted-foreground">
                                  {h.action === 'backup' ? 'Backup' : 'Restauração'} ·{' '}
                                  {h.trigger === 'scheduled' ? 'agendado' : 'manual'}
                                </span>
                              </span>
                              <span className="block text-[10px] text-muted-foreground/80 truncate" title={h.message}>
                                {new Date(h.startedAt).toLocaleString()} — {h.message}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
              </>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Salvar / Editar Consulta Personalizada */}
      {isSaveSnippetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in flex flex-col font-sans">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
              <div className="flex items-center space-x-2">
                <BookmarkPlus className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-foreground">
                  {editingSnippetId ? 'Editar Consulta Salva' : 'Salvar Nova Consulta'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveSnippetModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 rounded"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveCustomSnippet} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-foreground mb-1">Título da Consulta *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Consulta de Clientes Ativos"
                  value={snippetTitle}
                  onChange={(e) => setSnippetTitle(e.target.value)}
                  className="w-full bg-background border border-border rounded-md p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-sans"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-foreground mb-1">Categoria / Pasta</label>
                  <input
                    type="text"
                    placeholder="Ex: Vendas, Auditoria, Relatórios"
                    value={snippetCategory}
                    onChange={(e) => setSnippetCategory(e.target.value)}
                    className="w-full bg-background border border-border rounded-md p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-sans"
                  />
                </div>
                <div>
                  <label className="block font-bold text-foreground mb-1">Descrição (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Filtra por filial e status"
                    value={snippetDesc}
                    onChange={(e) => setSnippetDesc(e.target.value)}
                    className="w-full bg-background border border-border rounded-md p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-sans"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-foreground">Comando SQL *</label>
                  <span className="text-[10px] text-muted-foreground">Você pode ajustar a query livremente</span>
                </div>
                <textarea
                  required
                  rows={5}
                  value={snippetSql}
                  onChange={(e) => setSnippetSql(e.target.value)}
                  placeholder="SELECT * FROM ..."
                  className="w-full bg-[#0B0F17] text-emerald-300 font-mono text-xs p-2.5 rounded-md border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                  spellCheck={false}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setIsSaveSnippetModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-border/70 text-muted-foreground hover:text-foreground transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  <span>{editingSnippetId ? 'Atualizar Consulta' : 'Salvar Consulta'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
