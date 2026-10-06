import React, { useEffect, useState } from 'react';
import type {
  DatabaseConnectionConfig,
  ExplainPlanResult,
  QueryResult,
  TableColumnInfo
} from '../../../../shared/types';
import { parseSingleTableSelect } from '../../utils/databaseMutationUtils';
import type { EditableTableState, ExecutionHistoryItem, ResultTab } from '../../utils/dbPageTypes';
import { useDatabaseBinds } from './useDatabaseBinds';
import { useDatabaseHistory } from './useDatabaseHistory';
import { useDatabaseResultView } from './useDatabaseResultView';
import { useDatabaseRowMutations } from './useDatabaseRowMutations';
import { findRiskyStatement, normalizeSqlForExecution } from '../../../../shared/sqlStatementUtils';
import { splitSqlStatements } from '../../../../shared/sqlSplitUtils';
import { extractSqlVariables } from '../../utils/sqlBinds';
import { showToast } from '../../components/ToastHost';
import { buildRiskConfirmMessage } from '../../utils/databaseSessionUtils';
import { useDatabaseSession } from './useDatabaseSession';

interface UseDatabaseQueryParams {
  sql: string;
  setSql: React.Dispatch<React.SetStateAction<string>>;
  activeConnection: DatabaseConnectionConfig | null;
  activeConnectionId: string;
  tableColumns: Record<string, TableColumnInfo[]>;
  setTableColumns: React.Dispatch<React.SetStateAction<Record<string, TableColumnInfo[]>>>;
}

/** Execução de SQL, Explain Plan e estado do resultado (grid, binds, histórico e mutações de linha). */
export function useDatabaseQuery({
  sql,
  setSql,
  activeConnection,
  activeConnectionId,
  tableColumns,
  setTableColumns
}: UseDatabaseQueryParams) {
  const [maxRows, setMaxRows] = useState<number>(100);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<ResultTab>('grid');
  const [isExplaining, setIsExplaining] = useState<boolean>(false);
  const [explainResult, setExplainResult] = useState<ExplainPlanResult | null>(null);
  // Só existe quando o resultado atual veio de um SELECT * FROM <tabela única>
  const [editableTable, setEditableTable] = useState<EditableTableState | null>(null);

  const tx = useDatabaseSession(activeConnection);
  const view = useDatabaseResultView(queryResult);
  const historyState = useDatabaseHistory();
  const binds = useDatabaseBinds({
    sql,
    setSql,
    onExecute: (sqlToRun, overrideBinds) => {
      handleExecuteSql(sqlToRun, overrideBinds);
    }
  });
  const mutations = useDatabaseRowMutations({
    activeConnection,
    editableTable,
    reexecute: () => handleExecuteSql(),
    getSessionId: tx.getSessionId
  });

  // Sempre que a seleção de conexão ativa mudar (não a cada refresh da lista), limpa resultado
  useEffect(() => {
    if (activeConnectionId) {
      setQueryResult(null);
      setEditableTable(null);
    }
  }, [activeConnectionId]);

  const handleExecuteSql = async (customSql?: string, overrideBinds?: Record<string, any>): Promise<void> => {
    if (!activeConnection) {
      alert('Selecione ou crie uma conexão antes de executar consultas.');
      return;
    }

    // Em Oracle, blocos PL/SQL mantêm o ';' final (BEGIN ... END; sem ele dá ORA-06550)
    const cleanSql = normalizeSqlForExecution(customSql ?? sql, activeConnection.type);
    if (!cleanSql) return;

    if (!overrideBinds && binds.promptIfHasVariables(cleanSql)) return;

    const riskMessage = buildRiskConfirmMessage(findRiskyStatement(cleanSql), tx.mode);
    if (riskMessage && !window.confirm(riskMessage)) return;

    setIsExecuting(true);
    setQueryResult(null);
    setActiveResultTab('grid');
    view.handleClearAllFilters();

    try {
      const res = await tx.execute(cleanSql, maxRows, overrideBinds);
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
      historyState.addHistoryItem(historyItem);
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

  /** F5: executa todos os comandos em sequência, parando no primeiro erro. Mostra o resultado do último comando. */
  const handleExecuteScript = async (script: string): Promise<void> => {
    if (!activeConnection) {
      alert('Selecione ou crie uma conexão antes de executar consultas.');
      return;
    }
    const statements = splitSqlStatements(script);
    if (statements.length === 0) return;
    if (statements.length === 1) {
      await handleExecuteSql(statements[0].text);
      return;
    }
    if (extractSqlVariables(script).length > 0) {
      showToast('Scripts com variáveis (:VAR, &VAR) não são suportados. Execute cada comando com Ctrl+Enter.', 'info');
      return;
    }

    const cleaned = statements.map((s) => normalizeSqlForExecution(s.text, activeConnection.type));
    const risky = cleaned
      .map((sqlText, i) => ({ i, message: buildRiskConfirmMessage(findRiskyStatement(sqlText), tx.mode) }))
      .filter((r) => r.message);
    if (risky.length > 0) {
      const list = risky.map((r) => `  • comando ${r.i + 1}: ${cleaned[r.i].split('\n')[0].slice(0, 70)}`).join('\n');
      if (!window.confirm(`Este script tem ${risky.length} comando(s) que exigem atenção:\n${list}\n\nExecutar o script mesmo assim?`)) return;
    }

    setIsExecuting(true);
    setQueryResult(null);
    setEditableTable(null);
    setActiveResultTab('grid');
    view.handleClearAllFilters();

    let last: QueryResult | null = null;
    let done = 0;
    try {
      for (let i = 0; i < cleaned.length; i++) {
        const res = await tx.execute(cleaned[i], maxRows);
        historyState.addHistoryItem({
          id: `hist_${Date.now()}_${i}`,
          sql: cleaned[i],
          connectionName: activeConnection.name,
          timestamp: new Date().toLocaleTimeString('pt-BR'),
          success: res.success,
          timeMs: res.executionTimeMs,
          rowCount: res.rowCount,
          affectedRows: res.affectedRows,
          error: res.error
        });
        last = res;
        if (!res.success) {
          setQueryResult({ ...res, error: `Comando ${i + 1} de ${cleaned.length} falhou (${done} executado(s) antes):\n${res.error ?? ''}` });
          return;
        }
        done++;
      }
      if (last) setQueryResult(last);
      showToast(`Script concluído: ${done} comando(s) executado(s).`, 'success');
    } catch (err: any) {
      setQueryResult({
        success: false,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        isQuery: false,
        error: err.message || 'Erro inesperado ao executar o script.'
      });
    } finally {
      setIsExecuting(false);
    }
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

  return {
    maxRows,
    setMaxRows,
    isExecuting,
    queryResult,
    activeResultTab,
    setActiveResultTab,
    isExplaining,
    explainResult,
    editableTable,
    handleExecuteSql,
    handleExecuteScript,
    handleExplainPlan,
    tx,
    view,
    historyState,
    binds,
    mutations
  };
}
