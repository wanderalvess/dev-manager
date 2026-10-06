import { useState, useEffect, useRef, useCallback } from 'react';
import type { TestRunnerConfig, TestExecutionResult, TestRunnerPreset } from '../../../../../shared/types';
import { api } from '../../../services/apiBridge';
import { showToast } from '../../../components/ToastHost';
import { requestConfirm } from '../../../components/ui/confirmService';
import {
  createEmptyRunner,
  presetToRunner,
  getExecutionToast,
  buildExecutionStartMessage
} from '../../../utils/testRunnersUtils';

export type TestRunnersRightTab = 'console' | 'history';

export function useTestRunners() {
  const [runners, setRunners] = useState<TestRunnerConfig[]>([]);
  const [history, setHistory] = useState<TestExecutionResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Execução ativa
  const [runningRunnerId, setRunningRunnerId] = useState<string | null>(null);
  const [activeOutput, setActiveOutput] = useState<string>('');
  const [activeExecutionResult, setActiveExecutionResult] = useState<TestExecutionResult | null>(null);

  const [activeRightTab, setActiveRightTab] = useState<TestRunnersRightTab>('console');

  const [isEditorModalOpen, setIsEditorModalOpen] = useState<boolean>(false);
  const [editingRunner, setEditingRunner] = useState<Partial<TestRunnerConfig>>(createEmptyRunner());

  const terminalBottomRef = useRef<HTMLDivElement | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      if (api.testRunnerList) {
        const list = await api.testRunnerList();
        setRunners(list || []);
      }
      if (api.testRunnerGetHistory) {
        const hist = await api.testRunnerGetHistory();
        setHistory(hist || []);
      }
    } catch (err: any) {
      console.warn('Erro ao carregar runners:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Streaming de chunk de output via WebSocket / IPC
  useEffect(() => {
    if (api.onTestRunnerChunk) {
      const unsub = api.onTestRunnerChunk((data) => {
        setActiveOutput((prev) => prev + data.chunk);
        if (terminalBottomRef.current) {
          terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      });
      return () => {
        if (unsub) unsub();
      };
    }
    return undefined;
  }, []);

  const handleExecute = async (runner: TestRunnerConfig) => {
    if (runningRunnerId) {
      showToast('Já existe uma execução em andamento.', 'info');
      return;
    }

    setRunningRunnerId(runner.id);
    setActiveOutput(buildExecutionStartMessage(runner));
    setActiveExecutionResult(null);
    setActiveRightTab('console');

    try {
      const result = await api.testRunnerExecute(runner.id);
      setActiveExecutionResult(result);
      const toast = getExecutionToast(runner.name, result);
      showToast(toast.message, toast.kind);
      if (api.testRunnerGetHistory) {
        const hist = await api.testRunnerGetHistory();
        setHistory(hist || []);
      }
    } catch (err: any) {
      showToast(`Erro ao executar runner: ${err.message}`, 'error');
      setActiveOutput((prev) => prev + `\n\nErro: ${err.message}\n`);
    } finally {
      setRunningRunnerId(null);
    }
  };

  const handleAbort = async () => {
    try {
      await api.testRunnerAbort();
      showToast('Solicitação de abort cancelada enviada...', 'info');
    } catch (err: any) {
      showToast(`Falha ao abortar: ${err.message}`, 'error');
    }
  };

  const openNewRunner = () => {
    setEditingRunner(createEmptyRunner());
    setIsEditorModalOpen(true);
  };

  const openEditRunner = (runner: TestRunnerConfig) => {
    setEditingRunner(runner);
    setIsEditorModalOpen(true);
  };

  const closeEditor = useCallback(() => setIsEditorModalOpen(false), []);

  const handleAddPreset = (preset: TestRunnerPreset) => {
    setEditingRunner(presetToRunner(preset));
    setIsEditorModalOpen(true);
  };

  const handleSaveRunner = async () => {
    if (!editingRunner.name?.trim()) {
      showToast('Nome do runner é obrigatório.', 'error');
      return;
    }
    if (!editingRunner.workingDir?.trim()) {
      showToast('Diretório de trabalho é obrigatório.', 'error');
      return;
    }

    try {
      await api.testRunnerSave(editingRunner);
      showToast('Configuração de runner salva com sucesso!', 'success');
      setIsEditorModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(`Erro ao salvar runner: ${err.message}`, 'error');
    }
  };

  const handleDeleteRunner = async (id: string, name: string) => {
    const confirmed = await requestConfirm({
      title: 'Excluir runner?',
      message: `Tem certeza que deseja excluir o runner "${name}"?`,
      confirmLabel: 'Excluir',
      tone: 'danger'
    });
    if (!confirmed) return;

    try {
      await api.testRunnerDelete(id);
      showToast(`Runner "${name}" excluído.`, 'info');
      loadData();
    } catch (err: any) {
      showToast(`Erro ao excluir: ${err.message}`, 'error');
    }
  };

  const handleClearHistory = async () => {
    const confirmed = await requestConfirm({
      title: 'Limpar histórico?',
      message: 'Deseja limpar todo o histórico de execuções de testes?',
      confirmLabel: 'Limpar',
      tone: 'danger'
    });
    if (!confirmed) return;
    try {
      await api.testRunnerClearHistory();
      setHistory([]);
      showToast('Histórico de testes limpo com sucesso.', 'info');
    } catch (err: any) {
      showToast(`Erro ao limpar histórico: ${err.message}`, 'error');
    }
  };

  const clearConsole = () => setActiveOutput('');

  const viewHistoryLog = (item: TestExecutionResult) => {
    setActiveOutput(item.output || '');
    setActiveExecutionResult(item);
    setActiveRightTab('console');
  };

  return {
    runners,
    history,
    loading,
    runningRunnerId,
    activeOutput,
    activeExecutionResult,
    activeRightTab,
    setActiveRightTab,
    isEditorModalOpen,
    editingRunner,
    setEditingRunner,
    terminalBottomRef,
    handleExecute,
    handleAbort,
    openNewRunner,
    openEditRunner,
    closeEditor,
    handleAddPreset,
    handleSaveRunner,
    handleDeleteRunner,
    handleClearHistory,
    clearConsole,
    viewHistoryLog
  };
}
