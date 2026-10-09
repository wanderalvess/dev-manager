import React, { useEffect, useRef, useState } from 'react';
import type {
  DatabaseConnectionConfig,
  ExplainPlanResult,
  QueryResult,
  TableColumnInfo
} from '../../../../shared/types';
import { attachRowIds, lacksPrimaryKey, parseSingleTableSelect } from '../../utils/databaseMutationUtils';
import { buildRowIdSelect } from '../../../../shared/rowIdentity';
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
import { nextRowLimit } from '../../utils/rowLimitUtils';
import { pendingCount } from '../../utils/gridPendingChanges';
import { requestConfirm } from '../../components/ui/confirmService';

interface UseDatabaseQueryParams {
  sql: string;
  setSql: React.Dispatch<React.SetStateAction<string>>;
  activeConnection: DatabaseConnectionConfig | null;
  activeConnectionId: string;
  tableColumns: Record<string, TableColumnInfo[]>;
  setTableColumns: React.Dispatch<React.SetStateAction<Record<string, TableColumnInfo[]>>>;
  /** Histórico único da página, compartilhado entre as abas (várias instâncias sobrescreveriam o mesmo localStorage). */
  historyState: ReturnType<typeof useDatabaseHistory>;
}

/** Execução de SQL, Explain Plan e estado do resultado (grid, binds, histórico e mutações de linha). */
export function useDatabaseQuery({
  sql,
  setSql,
  activeConnection,
  activeConnectionId,
  tableColumns,
  setTableColumns,
  historyState
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
    getSessionId: tx.getSessionId,
    txMode: tx.mode
  });

  // Sempre que a seleção de conexão ativa mudar (não a cada refresh da lista), limpa resultado
  useEffect(() => {
    if (activeConnectionId) {
      setQueryResult(null);
      setEditableTable(null);
      mutations.discardPending();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConnectionId]);

  // Última consulta executada com sucesso, para "carregar mais" repetir com um limite maior
  const lastRun = useRef<{ sql: string; binds?: Record<string, any> } | null>(null);

  /**
   * Oracle: ROWID existe em toda tabela (em view a consulta reescrita falha e cai no fallback). PostgreSQL: ctid só serve
   * em tabela comum (relkind 'r'); a checagem prévia evita errar um SELECT dentro da transação manual, o que a abortaria.
   */
  const canUseRowId = async (table: string): Promise<boolean> => {
    if (activeConnection?.type === 'oracle') return true;
    if (activeConnection?.type !== 'postgres') return false;
    try {
      const probe = await tx.execute(`SELECT relkind FROM pg_class WHERE oid = to_regclass('${table}')`, 1);
      return probe.success && probe.rows[0]?.relkind === 'r';
    } catch {
      return false;
    }
  };

  const handleExecuteSql = async (
    customSql?: string,
    overrideBinds?: Record<string, any>,
    limitOverride?: number
  ): Promise<void> => {
    if (!activeConnection) {
      showToast('Selecione ou crie uma conexão antes de executar consultas.', 'info');
      return;
    }

    // Em Oracle, blocos PL/SQL mantêm o ';' final (BEGIN ... END; sem ele dá ORA-06550)
    const cleanSql = normalizeSqlForExecution(customSql ?? sql, activeConnection.type);
    if (!cleanSql) return;

    if (!overrideBinds && binds.promptIfHasVariables(cleanSql)) return;

    const riskMessage = buildRiskConfirmMessage(findRiskyStatement(cleanSql), tx.mode);
    if (riskMessage && !(await requestConfirm({ title: 'Comando de risco', message: riskMessage, confirmLabel: 'Executar', tone: 'warning' }))) return;

    // Alterações do grid ainda não aplicadas se perderiam com o novo resultado
    const pendingChanges = mutations.pendingRef.current;
    if (pendingCount(pendingChanges) > 0) {
      const discard = await requestConfirm({
        title: 'Alterações do grid pendentes',
        message: `Há ${pendingCount(pendingChanges)} alteração(ões) no grid ainda não aplicadas.\n\nDescartá-las e executar a consulta?`,
        confirmLabel: 'Descartar e executar',
        tone: 'warning'
      });
      if (!discard) return;
      mutations.discardPending();
    }

    setIsExecuting(true);
    setQueryResult(null);
    setActiveResultTab('grid');
    view.handleClearAllFilters();

    try {
      const rowLimit = limitOverride ?? maxRows;
      let res = await tx.execute(cleanSql, rowLimit, overrideBinds);
      if (res.success && res.isQuery) lastRun.current = { sql: cleanSql, binds: overrideBinds };

      // Detecta se o resultado veio de um SELECT * FROM <tabela única> — só nesse caso a grid
      // consegue editar/inserir/excluir linhas com segurança (sabe de qual tabela e, com sorte,
      // qual é a chave primária de cada linha).
      const editableTableName = res.success && res.isQuery ? parseSingleTableSelect(cleanSql) : null;
      let nextEditable: EditableTableState | null = null;
      if (editableTableName) {
        let cols = tableColumns[editableTableName];
        if (!cols && window.electronAPI?.getDbTableColumns) {
          try {
            const colsResult = await window.electronAPI.getDbTableColumns(activeConnection, editableTableName);
            cols = colsResult.columns;
            if (!colsResult.error) setTableColumns((prev) => ({ ...prev, [editableTableName]: cols || [] }));
          } catch (err) {
            console.error('Erro ao carregar colunas para edição inline:', err);
            cols = [];
          }
        }
        cols = cols || [];
        nextEditable = { name: editableTableName, columns: cols, identity: lacksPrimaryKey(cols) ? 'all-columns' : 'pk' };

        // Sem PK: busca de novo trazendo ROWID/ctid (oculto) para localizar cada linha com exatidão
        if (nextEditable.identity === 'all-columns' && (await canUseRowId(editableTableName))) {
          const withRowId = buildRowIdSelect(cleanSql, editableTableName, activeConnection.type);
          const rowIdRes = withRowId ? await tx.execute(withRowId, rowLimit, overrideBinds) : null;
          if (rowIdRes?.success && rowIdRes.isQuery) {
            res = attachRowIds(rowIdRes);
            nextEditable.identity = 'rowid';
          }
        }
        if (nextEditable.identity === 'all-columns') {
          showToast(
            'Tabela sem chave primária: as linhas são localizadas por todas as colunas. Duplicatas ou valores formatados (datas, BLOB, números grandes) podem impedir a alteração.',
            'info'
          );
        }
      }
      setQueryResult(res);
      setEditableTable(nextEditable);

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

  /** Repete a última consulta com o próximo limite de linhas (ex.: 100 → 250). */
  const handleLoadMore = async (): Promise<void> => {
    const next = nextRowLimit(maxRows);
    const last = lastRun.current;
    if (next === null || !last) return;
    setMaxRows(next);
    await handleExecuteSql(last.sql, last.binds ?? {}, next);
  };

  /** F5: executa todos os comandos em sequência, parando no primeiro erro. Mostra o resultado do último comando. */
  const handleExecuteScript = async (script: string): Promise<void> => {
    if (!activeConnection) {
      showToast('Selecione ou crie uma conexão antes de executar consultas.', 'info');
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
      const proceed = await requestConfirm({
        title: 'Script com comandos de risco',
        message: `Este script tem ${risky.length} comando(s) que exigem atenção:\n${list}\n\nExecutar o script mesmo assim?`,
        confirmLabel: 'Executar mesmo assim',
        tone: 'warning'
      });
      if (!proceed) return;
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
      showToast('Selecione ou crie uma conexão antes de gerar o Explain Plan.', 'info');
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
    handleLoadMore,
    nextLimit: nextRowLimit(maxRows),
    handleExecuteScript,
    handleExplainPlan,
    tx,
    view,
    historyState,
    binds,
    mutations
  };
}
