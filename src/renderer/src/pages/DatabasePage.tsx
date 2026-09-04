import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Database,
  Play,
  RotateCw,
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
  Info
} from 'lucide-react';
import {
  DatabaseConnectionConfig,
  DatabaseType,
  QueryResult,
  AppSettings
} from '../../../shared/types';

const DEFAULT_PORTS: Record<DatabaseType, number> = {
  oracle: 1521,
  mysql: 3306,
  postgres: 5432
};

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
  const [sql, setSql] = useState<string>('SELECT 1;');
  const [maxRows, setMaxRows] = useState<number>(100);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<'grid' | 'history'>('grid');

  // Histórico
  const [history, setHistory] = useState<ExecutionHistoryItem[]>([]);

  // Tabelas do Schema
  const [tables, setTables] = useState<string[]>([]);
  const [tableFilter, setTableFilter] = useState<string>('');
  const [isLoadingTables, setIsLoadingTables] = useState<boolean>(false);

  // Modal de Conexão
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingConn, setEditingConn] = useState<Partial<DatabaseConnectionConfig>>({
    type: 'oracle',
    name: 'Oracle WinThor',
    host: 'localhost',
    port: 1521,
    database: 'XEPDB1',
    user: 'system',
    password: '',
    oracleMode: 'serviceName'
  });
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; version?: string } | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

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

        if (conns.length > 0 && !activeConnectionId) {
          const defaultConn = conns.find((c) => c.isDefault) || conns[0];
          setActiveConnectionId(defaultConn.id);
          // Pré-ajusta query inicial baseado no tipo de banco
          if (defaultConn.type === 'oracle') {
            setSql('SELECT 1 FROM DUAL;');
          } else {
            setSql('SELECT 1;');
          }
        }
      } catch (err) {
        console.error('Erro ao carregar configurações de conexões:', err);
      }
    }
  }, [activeConnectionId]);

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
      name: 'Oracle WinThor Local',
      host: 'localhost',
      port: 1521,
      database: 'XEPDB1',
      user: 'system',
      password: '',
      oracleMode: 'serviceName'
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

  // Executar SQL
  const handleExecuteSql = async () => {
    if (!activeConnection) {
      alert('Selecione ou crie uma conexão antes de executar consultas.');
      return;
    }

    if (!sql.trim()) return;

    setIsExecuting(true);
    setActiveResultTab('grid');
    try {
      const res = await window.electronAPI.executeDbQuery(activeConnection, sql, maxRows);
      setQueryResult(res);

      // Adicionar ao histórico
      const historyItem: ExecutionHistoryItem = {
        id: `hist_${Date.now()}`,
        sql: sql.trim(),
        connectionName: activeConnection.name,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        success: res.success,
        timeMs: res.executionTimeMs,
        rowCount: res.rowCount,
        affectedRows: res.affectedRows,
        error: res.error
      };

      setHistory((prev) => [historyItem, ...prev.slice(0, 49)]);
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

  // Atalho de Teclado Ctrl+Enter para Executar
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleExecuteSql();
    }
  };

  // Snippet rápido de consulta para tabela
  const handleTableClick = (tableName: string) => {
    let query = '';
    if (activeConnection?.type === 'oracle') {
      query = `SELECT * FROM ${tableName} WHERE ROWNUM <= 100;`;
    } else if (activeConnection?.type === 'postgres' || activeConnection?.type === 'mysql') {
      query = `SELECT * FROM ${tableName} LIMIT 100;`;
    } else {
      query = `SELECT * FROM ${tableName};`;
    }
    setSql(query);
  };

  // Exportar para CSV
  const handleExportCsv = () => {
    if (!queryResult || !queryResult.rows || queryResult.rows.length === 0) return;

    const cols = queryResult.columns;
    const csvLines = [cols.join(',')];

    for (const row of queryResult.rows) {
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
  const handleCopyCell = (text: any) => {
    const str = typeof text === 'object' ? JSON.stringify(text) : String(text ?? '');
    navigator.clipboard.writeText(str);
    setCopyFeedback('Copiado!');
    setTimeout(() => setCopyFeedback(null), 1500);
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
              filteredTables.map((tbl) => (
                <button
                  key={tbl}
                  onClick={() => handleTableClick(tbl)}
                  title={`Inserir query para ${tbl}`}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground flex items-center justify-between group transition truncate"
                >
                  <span className="truncate">{tbl}</span>
                  <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-primary shrink-0 ml-1 transition" />
                </button>
              ))
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
            {/* Snippets rápidos */}
            <div className="hidden lg:flex items-center space-x-1 text-[11px]">
              <button
                onClick={() => setSql(activeConnection?.type === 'oracle' ? 'SELECT * FROM DUAL;' : 'SELECT 1;')}
                className="px-2 py-1 bg-card hover:bg-muted border border-border/60 rounded text-muted-foreground hover:text-foreground font-mono transition"
              >
                SELECT
              </button>
              <button
                onClick={() => setSql('UPDATE tabela SET coluna = valor WHERE condicao;')}
                className="px-2 py-1 bg-card hover:bg-muted border border-border/60 rounded text-muted-foreground hover:text-foreground font-mono transition"
              >
                UPDATE
              </button>
              <button
                onClick={() => setSql('INSERT INTO tabela (col1, col2) VALUES (val1, val2);')}
                className="px-2 py-1 bg-card hover:bg-muted border border-border/60 rounded text-muted-foreground hover:text-foreground font-mono transition"
              >
                INSERT
              </button>
            </div>

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
                /* Grid de Dados com Tabela */
                <div className="min-w-full inline-block align-middle">
                  <table className="min-w-full divide-y divide-border/60 text-xs font-mono">
                    <thead className="bg-muted/80 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase border-r border-border/40 w-12 text-center">
                          #
                        </th>
                        {queryResult.columns.map((col) => (
                          <th
                            key={col}
                            className="px-3 py-2 text-left text-[11px] font-bold text-foreground border-r border-border/40 whitespace-nowrap"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 bg-background/50">
                      {queryResult.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-muted/40 transition">
                          <td className="px-2 py-1.5 text-center text-muted-foreground text-[10px] border-r border-border/30 select-none">
                            {idx + 1}
                          </td>
                          {queryResult.columns.map((col) => {
                            const val = row[col];
                            const isNull = val === null || val === undefined;
                            return (
                              <td
                                key={col}
                                onClick={() => handleCopyCell(val)}
                                title="Clique para copiar valor"
                                className="px-3 py-1.5 border-r border-border/30 whitespace-nowrap max-w-xs truncate cursor-pointer hover:bg-primary/10 transition"
                              >
                                {isNull ? (
                                  <span className="text-muted-foreground/60 italic text-[10px]">NULL</span>
                                ) : typeof val === 'object' ? (
                                  <span className="text-sky-300">{JSON.stringify(val)}</span>
                                ) : typeof val === 'number' ? (
                                  <span className="text-amber-300">{val}</span>
                                ) : (
                                  <span>{String(val)}</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* Tab de Histórico */
            <div className="p-3 space-y-2">
              {history.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  Nenhuma consulta executada nesta sessão.
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
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                        )}
                        <span className="font-bold text-foreground">{item.connectionName}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{item.timestamp}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] text-muted-foreground font-mono">{item.timeMs} ms</span>
                        <button
                          onClick={() => setSql(item.sql)}
                          className="px-2 py-0.5 bg-primary/20 hover:bg-primary text-primary hover:text-primary-foreground rounded text-[10px] font-semibold transition"
                        >
                          Usar
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
                  placeholder="Ex: Oracle WinThor Produção"
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
    </div>
  );
};
