import React, { useState } from 'react';
import { AppSettings } from '../../../../shared/types';
import { useQaRunnerInputs } from '../../hooks/quality/runner/useQaRunnerInputs';
import { useQaRunnerExecution } from '../../hooks/quality/runner/useQaRunnerExecution';
import { QaRegressionTemplatesHelpModal } from './modals/QaRegressionTemplatesHelpModal';
import { QaFetchPayloadModal } from './modals/QaFetchPayloadModal';
import { QaRunnerToolbar } from './runner/QaRunnerToolbar';
import { QaRunnerInputPanel } from './runner/QaRunnerInputPanel';
import { QaRunnerIdleState, QaRunnerRunningState } from './runner/QaRunnerPlaceholders';
import { QaRunnerResultHeader } from './runner/QaRunnerResultHeader';
import { QaRunnerResultFilters } from './runner/QaRunnerResultFilters';
import { QaRunnerStepCard } from './runner/QaRunnerStepCard';
import { QaRunnerSqlModal, QaRunnerRowsModal } from './runner/QaRunnerInspectModals';

interface QaRegressionRunnerProps {
  settings: AppSettings | null;
  onNavigate?: (tab: string) => void;
  onOpenTemplatesManager?: () => void;
}

export const QaRegressionRunner: React.FC<QaRegressionRunnerProps> = ({
  settings,
  onNavigate,
  onOpenTemplatesManager
}) => {
  const inputs = useQaRunnerInputs(settings);
  const { selectedTemplate, selectedConnectionId, variables } = inputs;
  const exec = useQaRunnerExecution({
    selectedTemplate,
    selectedConnectionId,
    rawJson: inputs.rawJson,
    variables
  });
  const { executionResult, isRunning } = exec;

  const [stepSqlModal, setStepSqlModal] = useState<{ title: string; sql: string } | null>(null);
  const [rowsModal, setRowsModal] = useState<{ title: string; rows: any[] } | null>(null);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);
  const [isFetchPayloadModalOpen, setIsFetchPayloadModalOpen] = useState<boolean>(false);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <QaRunnerToolbar
        dbConnections={inputs.dbConnections}
        templates={inputs.templates}
        selectedTemplate={selectedTemplate}
        selectedTemplateId={inputs.selectedTemplateId}
        selectedConnectionId={selectedConnectionId}
        isRunning={isRunning}
        onSelectConnection={inputs.setSelectedConnectionId}
        onSelectTemplate={inputs.setSelectedTemplateId}
        onExportTemplate={inputs.handleExportCurrentTemplate}
        onOpenHelp={() => setIsHelpModalOpen(true)}
        onRun={exec.handleRunSuite}
        onNavigate={onNavigate}
        onOpenTemplatesManager={onOpenTemplatesManager}
      />

      {/* Conteúdo Principal Dividido: Painel de Inputs vs Resultados */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <QaRunnerInputPanel
          rawJson={inputs.rawJson}
          onChangeJson={inputs.setRawJson}
          variables={variables}
          setVariables={inputs.setVariables}
          onOpenFetchPayload={() => setIsFetchPayloadModalOpen(true)}
          onLoadSample={inputs.handleLoadSampleJson}
          onAutoExtract={inputs.handleAutoExtractVariables}
        />

        {/* Painel Principal de Resultados da Execução */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
          {!executionResult && !isRunning && (
            <QaRunnerIdleState
              selectedTemplate={selectedTemplate}
              variablesCount={Object.keys(variables).length}
              canRun={!!selectedConnectionId && !!selectedTemplate}
              onRun={exec.handleRunSuite}
            />
          )}

          {isRunning && <QaRunnerRunningState />}

          {executionResult && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <QaRunnerResultHeader
                result={executionResult}
                issueKey={exec.issueKey}
                onChangeIssueKey={exec.setIssueKey}
                copiedKey={exec.copiedKey}
                onCopyMarkdown={exec.handleCopyMarkdownReport}
                onCopyJira={exec.handleCopyJiraMarkup}
              />

              <QaRunnerResultFilters
                stepResults={executionResult.stepResults}
                resultFilter={exec.resultFilter}
                onChangeFilter={exec.setResultFilter}
                resultSearch={exec.resultSearch}
                onChangeSearch={exec.setResultSearch}
                onExpandAll={exec.expandAllSteps}
                onCollapseAll={exec.collapseAllSteps}
              />

              {/* Lista dos Passos e Asserções */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {exec.filteredSteps.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-xs font-mono">
                    Nenhum passo corresponde aos filtros selecionados.
                  </div>
                ) : (
                  exec.filteredSteps.map((step) => (
                    <QaRunnerStepCard
                      key={step.stepId}
                      step={step}
                      isExpanded={exec.expandedSteps.has(step.stepId)}
                      onToggle={exec.toggleStepExpanded}
                      onShowSql={(title, sql) => setStepSqlModal({ title, sql })}
                      onShowRows={(title, rows) => setRowsModal({ title, rows })}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {stepSqlModal && (
        <QaRunnerSqlModal
          title={stepSqlModal.title}
          sql={stepSqlModal.sql}
          onClose={() => setStepSqlModal(null)}
          onCopy={exec.copy}
        />
      )}

      {rowsModal && (
        <QaRunnerRowsModal
          title={rowsModal.title}
          rows={rowsModal.rows}
          onClose={() => setRowsModal(null)}
        />
      )}

      <QaRegressionTemplatesHelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      <QaFetchPayloadModal
        isOpen={isFetchPayloadModalOpen}
        onClose={() => setIsFetchPayloadModalOpen(false)}
        onSelectPayload={inputs.handleSelectIncomingPayload}
        connectionId={selectedConnectionId}
        defaultFilial={variables.codFilial || '1'}
        defaultCupom={variables.numCupom || ''}
      />
    </div>
  );
};
