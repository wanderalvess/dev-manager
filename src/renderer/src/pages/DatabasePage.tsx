import React, { useEffect, useState } from 'react';
import { Database, Play, Table2, Clock, HardDriveDownload, CheckCircle2, AlertCircle } from 'lucide-react';
import type { DatabaseConnectionConfig, DbObjectInfo, QueryResult } from '../../../shared/types';
import { showToast } from '../components/ToastHost';

interface DatabasePageProps {
  settingsVersion: number;
  onNavigateToSettings: () => void;
  onNavigateToBackups: () => void;
}

const SNIPPETS = [
  { label: 'Pedidos Recentes', sql: 'SELECT NUMPED, CODCLI, CODFILIAL, VLTOTAL, POSICAO FROM PCPEDC ORDER BY NUMPED DESC' },
  { label: 'Produtos Estoque Baixo', sql: 'SELECT CODPROD, DESCRICAO, PVENDA, ESTOQUE FROM PCPRODUT WHERE ESTOQUE < 250' },
  { label: 'Filiais Ativas', sql: 'SELECT * FROM PCFILIAL WHERE ATIVA = \'S\'' },
  { label: 'Parâmetros PCCONSUM', sql: 'SELECT * FROM PCCONSUM' }
];

export const DatabasePage: React.FC<DatabasePageProps> = ({ onNavigateToBackups }) => {
  const [connections, setConnections] = useState<DatabaseConnectionConfig[]>([]);
  const [activeConn, setActiveConn] = useState<DatabaseConnectionConfig | null>(null);
  const [tables, setTables] = useState<DbObjectInfo[]>([]);
  const [sql, setSql] = useState(SNIPPETS[0].sql);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [running, setRunning] = useState(false);

  const loadMeta = async () => {
    const [connsRes, tblRes, histRes] = await Promise.all([
      fetch('/api/db/connections').then((r) => r.json()),
      window.electronAPI.listDbTables(activeConn as any),
      fetch('/api/db/history').then((r) => r.json())
    ]);
    if (Array.isArray(connsRes)) {
      setConnections(connsRes);
      if (!activeConn && connsRes[0]) setActiveConn(connsRes[0]);
    }
    if (tblRes?.tables) setTables(tblRes.tables);
    if (Array.isArray(histRes)) setHistory(histRes);
  };

  useEffect(() => {
    void loadMeta();
  }, []);

  const runSql = async (queryText = sql) => {
    setRunning(true);
    try {
      const res = await window.electronAPI.executeDbQuery(activeConn || connections[0], queryText, 500);
      setResult(res);
      const histRes = await fetch('/api/db/history').then((r) => r.json());
      if (Array.isArray(histRes)) setHistory(histRes);
    } finally {
      setRunning(false);
    }
  };

  const testConn = async () => {
    if (!activeConn) return;
    const res = await window.electronAPI.testDbConnection(activeConn);
    showToast(res.message, res.success ? 'success' : 'error');
  };

  return (
    <div className="h-full flex overflow-hidden">
      <aside className="w-64 border-r border-border bg-card p-3 flex flex-col gap-3 overflow-y-auto shrink-0">
        <div>
          <div className="text-2xs font-bold uppercase text-muted-foreground mb-1.5">Conexão Ativa</div>
          <select
            value={activeConn?.id || ''}
            onChange={(e) => setActiveConn(connections.find((c) => c.id === e.target.value) || null)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-semibold text-foreground"
          >
            {connections.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={testConn}
            className="mt-1.5 w-full py-1.5 rounded-lg border border-border hover:bg-muted text-2xs font-semibold text-foreground cursor-pointer"
          >
            Testar Conexão
          </button>
        </div>

        <div>
          <div className="text-2xs font-bold uppercase text-muted-foreground mb-1.5 flex items-center gap-1">
            <Table2 className="w-3.5 h-3.5 text-primary" /> Tabelas ({tables.length})
          </div>
          <div className="space-y-1">
            {tables.map((t) => (
              <button
                key={t.name}
                type="button"
                onClick={() => {
                  const q = `SELECT * FROM ${t.name}`;
                  setSql(q);
                  void runSql(q);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-muted text-xs text-left cursor-pointer"
              >
                <span className="font-mono font-semibold text-foreground truncate">{t.name}</span>
                <span className="text-2xs font-mono text-muted-foreground">{t.rowCount ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-2xs font-bold uppercase text-muted-foreground mb-1.5 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-primary" /> Histórico Recente
          </div>
          <div className="space-y-1">
            {history.slice(0, 6).map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setSql(h.sql)}
                className="w-full p-2 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted text-left cursor-pointer"
              >
                <div className="font-mono text-2xs text-foreground truncate">{h.sql}</div>
                <div className="text-2xs text-muted-foreground mt-0.5">{h.rowCount} linhas • {h.executionTimeMs}ms</div>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 p-4 gap-3 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            <h1 className="text-base font-extrabold text-foreground">Database Studio Multi-Vendor</h1>
          </div>
          <div className="flex items-center gap-2">
            {SNIPPETS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setSql(s.sql)}
                className="px-2.5 py-1 rounded-lg border border-border bg-card hover:bg-muted text-2xs font-semibold cursor-pointer"
              >
                {s.label}
              </button>
            ))}
            <button
              type="button"
              onClick={onNavigateToBackups}
              className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <HardDriveDownload className="w-3.5 h-3.5 text-primary" /> Backups
            </button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3 space-y-2 shrink-0">
          <textarea
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                void runSql();
              }
            }}
            rows={4}
            className="w-full bg-background border border-input rounded-lg p-3 font-mono text-xs text-foreground focus:outline-none focus:border-primary"
            placeholder="Digite seu SQL (Ctrl+Enter para executar)..."
          />
          <div className="flex items-center justify-between">
            <span className="text-2xs text-muted-foreground font-mono">Atalho: Ctrl + Enter para executar</span>
            <button
              type="button"
              onClick={() => void runSql()}
              disabled={running}
              className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-90"
            >
              <Play className="w-3.5 h-3.5" /> Executar SQL
            </button>
          </div>
        </div>

        <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden flex flex-col min-h-0">
          {!result ? (
            <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
              Execute uma query ou selecione uma tabela ao lado para visualizar os registros.
            </div>
          ) : !result.success ? (
            <div className="p-4 flex items-start gap-2 text-xs text-danger">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-mono">{result.error}</span>
            </div>
          ) : (
            <>
              <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between text-2xs">
                <span className="flex items-center gap-1.5 font-semibold text-success">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {result.rowCount} registros retornados
                </span>
                <span className="font-mono text-muted-foreground">{result.executionTimeMs} ms</span>
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      {result.columns.map((col) => (
                        <th key={col} className="px-3 py-2 border-b border-border font-mono font-bold text-foreground whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-muted/30 border-b border-border/50">
                        {result.columns.map((col) => (
                          <td key={col} className="px-3 py-1.5 font-mono text-foreground/90 whitespace-nowrap">
                            {row[col] === null || row[col] === undefined ? <span className="text-muted-foreground italic">NULL</span> : String(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
