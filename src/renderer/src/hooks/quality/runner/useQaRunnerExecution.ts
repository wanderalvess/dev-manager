import { useState, useMemo } from 'react';
import type { QaExecutionResult, QaRegressionTemplate } from '../../../../../shared/types';
import { api } from '../../../services/apiBridge';
import { showToast } from '../../../components/ToastHost';
import { useCopyToClipboard } from '../../useCopyToClipboard';
import {
  filterStepResults,
  buildJiraEvidenceClipboardText,
  generateMarkdownEvidence
} from '../../../utils/qaRegressionRendererUtils';
import { computeInitialExpandedSteps, toggleStepId } from '../../../utils/qaRunnerUtils';

interface RunnerExecutionInputs {
  selectedTemplate: QaRegressionTemplate | null;
  selectedConnectionId: string;
  rawJson: string;
  variables: Record<string, string>;
}

export function useQaRunnerExecution({
  selectedTemplate,
  selectedConnectionId,
  rawJson,
  variables
}: RunnerExecutionInputs) {
  const [issueKey, setIssueKey] = useState<string>('DDWMISSI-T966');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<QaExecutionResult | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [resultFilter, setResultFilter] = useState<'all' | 'failed' | 'passed'>('all');
  const [resultSearch, setResultSearch] = useState<string>('');

  const { copy, copiedKey } = useCopyToClipboard(2000);

  const handleRunSuite = async () => {
    if (!selectedTemplate) {
      showToast('Selecione um cenário de teste para executar.', 'info');
      return;
    }
    if (!selectedConnectionId) {
      showToast('Selecione uma conexão Oracle para executar as queries.', 'info');
      return;
    }

    setIsRunning(true);
    setExecutionResult(null);

    try {
      if (api?.qaExecuteSuite) {
        const result = await api.qaExecuteSuite({
          templateId: selectedTemplate.id,
          connectionId: selectedConnectionId,
          rawJson: rawJson.trim() ? rawJson : undefined,
          variables
        });

        setExecutionResult(result);
        setExpandedSteps(computeInitialExpandedSteps(result));

        if (result.success) {
          showToast(`Suite concluída! Todas as ${result.totalAssertions} asserções passaram.`, 'success');
        } else {
          showToast(
            `Validação concluída com divergências: ${result.failedAssertions} asserção(ões) falharam.`,
            'error'
          );
        }
      }
    } catch (err: any) {
      showToast(`Falha ao executar validação regressiva: ${err.message}`, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const toggleStepExpanded = (stepId: string) => {
    setExpandedSteps((prev) => toggleStepId(prev, stepId));
  };

  const expandAllSteps = () => {
    if (executionResult) {
      setExpandedSteps(new Set(executionResult.stepResults.map((s) => s.stepId)));
    }
  };

  const collapseAllSteps = () => {
    setExpandedSteps(new Set());
  };

  const handleCopyMarkdownReport = () => {
    if (!executionResult) return;
    const md = generateMarkdownEvidence(executionResult, {
      issueKey: issueKey.trim() || undefined,
      includeSql: true
    });
    copy(md, 'markdown-report');
    showToast('Evidência formatada em Markdown copiada com sucesso!', 'success');
  };

  const handleCopyJiraMarkup = () => {
    if (!executionResult) return;
    const markup = buildJiraEvidenceClipboardText(executionResult, issueKey.trim() || undefined);
    copy(markup, 'jira-markup');
    showToast('Tabela formatada para Jira copiada para a área de transferência!', 'success');
  };

  const filteredSteps = useMemo(() => {
    if (!executionResult) return [];
    return filterStepResults(executionResult.stepResults, resultFilter, resultSearch);
  }, [executionResult, resultFilter, resultSearch]);

  return {
    issueKey,
    setIssueKey,
    isRunning,
    executionResult,
    expandedSteps,
    resultFilter,
    setResultFilter,
    resultSearch,
    setResultSearch,
    filteredSteps,
    copy,
    copiedKey,
    handleRunSuite,
    toggleStepExpanded,
    expandAllSteps,
    collapseAllSteps,
    handleCopyMarkdownReport,
    handleCopyJiraMarkup
  };
}
