import { useState, useEffect, useMemo, useRef } from 'react';
import type { TestExecutionResult } from '../../../../../shared/types';
import { api } from '../../../services/apiBridge';
import { showToast } from '../../../components/ToastHost';
import { buildEffectiveTagsString, toggleTautTag } from '../../../utils/tautPanelUtils';

export function useTautRunner() {
  const [selectedTags, setSelectedTags] = useState<string[]>(['esteira', '-develop']);
  const [customTagInput, setCustomTagInput] = useState<string>('');
  const [customSpecInput, setCustomSpecInput] = useState<string>('');
  const [apiUrlMode, setApiUrlMode] = useState<'v39' | 'legacy'>('v39');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeOutput, setActiveOutput] = useState<string>('');
  const [lastExecutionResult, setLastExecutionResult] = useState<TestExecutionResult | null>(null);

  const terminalBottomRef = useRef<HTMLDivElement | null>(null);

  // Listener para chunks de console em tempo real
  useEffect(() => {
    if (api.onTautChunk) {
      const unsub = api.onTautChunk((data) => {
        setActiveOutput((prev) => prev + data.chunk);
        if (terminalBottomRef.current) {
          terminalBottomRef.current.scrollTop = terminalBottomRef.current.scrollHeight;
        }
      });
      return () => {
        unsub?.();
      };
    }
  }, []);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => toggleTautTag(prev, tag));
  };

  // Monta a string final de tags para o Cypress
  const effectiveTagsString = useMemo(
    () => buildEffectiveTagsString(selectedTags, customTagInput),
    [selectedTags, customTagInput]
  );

  // Disparo de Testes Headless
  const handleRunTests = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setActiveOutput('');
    setLastExecutionResult(null);

    try {
      if (api.tautRunTests) {
        const res = await api.tautRunTests({
          tags: effectiveTagsString || undefined,
          spec: customSpecInput.trim() || undefined,
          apiUrlMode,
          openInteractive: false
        });
        setLastExecutionResult(res);
        if (res.status === 'passed') {
          showToast(`Suíte TAUT concluída com sucesso! (${res.passedCount} testes aprovados)`, 'success');
        } else if (res.status === 'aborted') {
          showToast('Execução do Cypress cancelada.', 'info');
        } else {
          showToast(`Suíte finalizada com falhas (${res.failedCount} falhas de ${res.totalTests}).`, 'error');
        }
      }
    } catch (err: any) {
      showToast(`Erro ao disparar Cypress: ${err.message}`, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  // Abrir Cypress com interface gráfica (cy:open)
  const handleOpenInteractive = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setActiveOutput('');
    try {
      if (api.tautRunTests) {
        showToast('Iniciando Cypress em modo interativo...', 'info');
        await api.tautRunTests({
          apiUrlMode,
          openInteractive: true
        });
      }
    } catch (err: any) {
      showToast(`Falha ao abrir Cypress: ${err.message}`, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  // Abortar execução
  const handleAbort = async () => {
    try {
      if (api.tautAbortTests) {
        await api.tautAbortTests();
        showToast('Solicitação de cancelamento enviada.', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao abortar', 'error');
    }
  };

  return {
    selectedTags,
    customSpecInput,
    setCustomSpecInput,
    setCustomTagInput,
    apiUrlMode,
    setApiUrlMode,
    isRunning,
    activeOutput,
    setActiveOutput,
    lastExecutionResult,
    terminalBottomRef,
    effectiveTagsString,
    toggleTag,
    handleRunTests,
    handleOpenInteractive,
    handleAbort
  };
}
