import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_TRACE_LOOKBACK_MINUTES,
  type IntegrationFlowDefinition,
  type IntegrationTraceListItem,
  type IntegrationTraceResult
} from '../../../../shared/integrationTypes';
import { validateBatchRequest } from '../../../../shared/integrationBatchRequest';
import { requestConfirm } from '../../components/ui/confirmService';
import { showToast } from '../../components/ToastHost';

/** Rastreio parcial de um lote: formulário, execução, resultado atual e histórico em arquivo. */
export function useBatchTrace(settingsVersion?: number) {
  const [flows, setFlows] = useState<IntegrationFlowDefinition[]>([]);
  const [history, setHistory] = useState<IntegrationTraceListItem[]>([]);
  const [current, setCurrent] = useState<IntegrationTraceResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flowId, setFlowId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [lookbackMinutes, setLookbackMinutes] = useState(DEFAULT_TRACE_LOOKBACK_MINUTES);
  const [branchId, setBranchId] = useState('');

  const reloadHistory = useCallback(async () => {
    try {
      setHistory((await window.electronAPI?.integrationListTraces?.()) ?? []);
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve(window.electronAPI?.integrationListFlows?.() ?? [])
      .then((list) => {
        if (cancelled) return;
        setFlows(list);
        // Mantém a escolha enquanto o fluxo existir; senão cai no primeiro
        setFlowId((previous) => (list.some((flow) => flow.id === previous) ? previous : (list[0]?.id ?? '')));
      })
      .catch(() => {
        if (!cancelled) setFlows([]);
      });
    void reloadHistory();
    return () => {
      cancelled = true;
    };
  }, [settingsVersion, reloadHistory]);

  const run = useCallback(async () => {
    const validation = validateBatchRequest({ flowId, batchNumber, lookbackMinutes, branchId });
    if (!validation.ok) {
      setError(validation.error);
      return;
    }
    const trace = window.electronAPI?.integrationTraceBatch;
    if (!trace) {
      setError('O rastreio de lote não está disponível neste ambiente.');
      return;
    }
    setRunning(true);
    setError(null);
    try {
      const response = await trace(validation.value);
      if (response.success) {
        setCurrent(response.trace);
        void reloadHistory();
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError((err as Error)?.message || 'Não foi possível rastrear o lote.');
    } finally {
      setRunning(false);
    }
  }, [flowId, batchNumber, lookbackMinutes, branchId, reloadHistory]);

  const open = useCallback(async (id: string) => {
    const trace = await window.electronAPI?.integrationGetTrace?.(id);
    if (trace) {
      setCurrent(trace);
      setError(null);
    } else {
      showToast('Esse rastreio não está mais no histórico.', 'error');
      void reloadHistory();
    }
  }, [reloadHistory]);

  const remove = useCallback(async (id: string) => {
    const confirmed = await requestConfirm({
      title: 'Apagar rastreio?',
      message: 'O rastreio sai do histórico desta máquina. Essa ação não pode ser desfeita.',
      confirmLabel: 'Apagar',
      tone: 'danger'
    });
    if (!confirmed) return;
    await window.electronAPI?.integrationDeleteTrace?.(id);
    setCurrent((trace) => (trace?.id === id ? null : trace));
    void reloadHistory();
  }, [reloadHistory]);

  const copyReport = useCallback(async () => {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current.evidenceMarkdown);
      showToast('Relatório copiado para colar no Jira.', 'success');
    } catch {
      showToast('Não foi possível copiar o relatório.', 'error');
    }
  }, [current]);

  return {
    flows, history, current, running, error,
    form: { flowId, batchNumber, lookbackMinutes, branchId, setFlowId, setBatchNumber, setLookbackMinutes, setBranchId },
    run, open, remove, copyReport,
    // Usados pelo modo ao vivo: a reconsulta troca o rastreio atual e o resumo dele no histórico
    replaceCurrent: setCurrent, reloadHistory
  };
}
