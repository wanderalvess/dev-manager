import { useCallback, useEffect, useState } from 'react';
import type {
  DatabaseConnectionConfig,
  OracleCaptureState,
  OracleRecentStatement,
  OracleSessionCaptureEntry
} from '../../../../shared/types';
import { apiBridge } from '../../services/apiBridge';
import {
  EMPTY_STATE,
  UI_REFRESH_MS,
  buildSelectionFromSessionEvent,
  buildSelectionFromStatement,
  computeElapsedSec,
  mergeSnapshotBinds,
  type SelectedStatementInfo,
  type TracerView
} from '../../utils/statementTracerUtils';

export function useStatementTracer(activeConnection: DatabaseConnectionConfig | undefined) {
  const [view, setView] = useState<TracerView>('sessions');
  const [schemaFilter, setSchemaFilter] = useState('');
  const [textFilter, setTextFilter] = useState('');
  const [intervalMs, setIntervalMs] = useState(5000);
  const [state, setState] = useState<OracleCaptureState>(EMPTY_STATE);
  const [isBusy, setIsBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [selectedItem, setSelectedItem] = useState<SelectedStatementInfo | null>(null);
  const [isFetchingBinds, setIsFetchingBinds] = useState(false);

  const isOracle = activeConnection?.type === 'oracle';
  const connectionId = activeConnection?.id;

  const refreshState = useCallback(async () => {
    if (!connectionId) return;
    try {
      const res = await apiBridge.getOracleCaptureState(connectionId);
      setState(res);

      // Se há um item selecionado, atualiza binds se disponíveis no novo snapshot
      const merged = mergeSnapshotBinds(selectedItem, res.statements);
      if (merged) {
        setSelectedItem((prev) =>
          prev
            ? {
                ...prev,
                binds: merged.binds,
                interpolatedSql: merged.interpolatedSql || prev.interpolatedSql
              }
            : null
        );
      }
    } catch {
      // Falha pontual de leitura de estado não deve derrubar a UI; a próxima leva tenta de novo.
    }
  }, [connectionId, selectedItem]);

  // Hidrata o estado assim que a conexão muda
  useEffect(() => {
    setState(EMPTY_STATE);
    setSelectedItem(null);
    if (connectionId) refreshState();
  }, [connectionId, refreshState]);

  useEffect(() => {
    if (!connectionId) return;
    const timer = setInterval(refreshState, UI_REFRESH_MS);
    return () => clearInterval(timer);
  }, [connectionId, refreshState]);

  // Recalcular tempo decorrido
  useEffect(() => {
    if (!state.isCapturing) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [state.isCapturing]);

  const handleStart = async () => {
    if (!activeConnection) return;
    setIsBusy(true);
    try {
      const res = await apiBridge.startOracleCapture(activeConnection, {
        intervalMs,
        schemaFilter: schemaFilter.trim() || undefined,
        textFilter: textFilter.trim() || undefined
      });
      setState(res);
    } catch (err: any) {
      setState((prev) => ({ ...prev, lastError: err?.message || 'Falha ao iniciar a captura.' }));
    } finally {
      setIsBusy(false);
    }
  };

  const handleStop = async () => {
    if (!connectionId) return;
    setIsBusy(true);
    try {
      const res = await apiBridge.stopOracleCapture(connectionId);
      setState(res);
    } catch (err: any) {
      setState((prev) => ({ ...prev, isCapturing: false, lastError: err?.message || 'Falha ao parar a captura.' }));
    } finally {
      setIsBusy(false);
    }
  };

  const handleClear = async () => {
    if (!connectionId) return;
    setIsBusy(true);
    try {
      const res = await apiBridge.clearOracleCapture(connectionId);
      setState(res);
      setSelectedItem(null);
    } catch (err: any) {
      setState((prev) => ({ ...prev, lastError: err?.message || 'Falha ao limpar a captura.' }));
    } finally {
      setIsBusy(false);
    }
  };

  const handleFetchBinds = async (sqlId: string, sqlText?: string) => {
    if (!activeConnection) return;
    setIsFetchingBinds(true);
    try {
      const res = await apiBridge.getOracleStatementBinds(activeConnection, sqlId, sqlText);
      if (res.success && res.binds) {
        setSelectedItem((prev) => {
          if (!prev || prev.sqlId !== sqlId) return prev;
          return {
            ...prev,
            binds: res.binds,
            interpolatedSql: res.interpolatedSql || prev.interpolatedSql
          };
        });
      }
    } catch (err) {
      console.warn('[StatementTracer] Falha ao consultar binds no Oracle:', err);
    } finally {
      setIsFetchingBinds(false);
    }
  };

  const handleSelectSessionEvent = (ev: OracleSessionCaptureEntry) => {
    setSelectedItem(buildSelectionFromSessionEvent(ev));
    if (ev.sqlId && (!ev.binds || ev.binds.length === 0)) {
      handleFetchBinds(ev.sqlId, ev.sqlText || undefined);
    }
  };

  const handleSelectStatement = (st: OracleRecentStatement) => {
    setSelectedItem(buildSelectionFromStatement(st));
    if (st.sqlId && (!st.binds || st.binds.length === 0)) {
      handleFetchBinds(st.sqlId, st.sqlText);
    }
  };

  return {
    view,
    setView,
    schemaFilter,
    setSchemaFilter,
    textFilter,
    setTextFilter,
    intervalMs,
    setIntervalMs,
    state,
    isBusy,
    isOracle,
    selectedItem,
    clearSelection: () => setSelectedItem(null),
    isFetchingBinds,
    elapsedSec: computeElapsedSec(state.startedAt, now),
    handleStart,
    handleStop,
    handleClear,
    handleFetchBinds,
    handleSelectSessionEvent,
    handleSelectStatement
  };
}
