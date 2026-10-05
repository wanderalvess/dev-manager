import React from 'react';
import { AppSettings, TestExecutionResult } from '../../../../shared/types';
import { QualityValidationItem } from '../../utils/qualityPageUtils';
import { useTestRunners } from '../../hooks/quality/testrunners/useTestRunners';
import { RunnerListPanel } from './testrunners/RunnerListPanel';
import { ConsolePanel } from './testrunners/ConsolePanel';
import { RunnerEditorModal } from './testrunners/RunnerEditorModal';

interface AutomatedTestRunnersProps {
  settings: AppSettings | null;
  validationItems: QualityValidationItem[];
  onSyncWithValidationMatrix?: (runnerId: string, result: TestExecutionResult) => void;
  onNavigate?: (tab: string) => void;
}

export const AutomatedTestRunners: React.FC<AutomatedTestRunnersProps> = ({
  settings: _settings,
  validationItems,
  onSyncWithValidationMatrix,
  onNavigate: _onNavigate
}) => {
  const state = useTestRunners();

  const handleSyncWithMatrix = (runnerId: string, result: TestExecutionResult) => {
    if (onSyncWithValidationMatrix) {
      onSyncWithValidationMatrix(runnerId, result);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-background">
      <RunnerListPanel
        runners={state.runners}
        loading={state.loading}
        runningRunnerId={state.runningRunnerId}
        onCreate={state.openNewRunner}
        onAddPreset={state.handleAddPreset}
        onExecute={state.handleExecute}
        onEdit={state.openEditRunner}
        onDelete={state.handleDeleteRunner}
      />

      <ConsolePanel
        activeTab={state.activeRightTab}
        onTabChange={state.setActiveRightTab}
        history={state.history}
        runningRunnerId={state.runningRunnerId}
        activeOutput={state.activeOutput}
        activeExecutionResult={state.activeExecutionResult}
        terminalBottomRef={state.terminalBottomRef}
        canSync={!!onSyncWithValidationMatrix}
        onAbort={state.handleAbort}
        onClearConsole={state.clearConsole}
        onClearHistory={state.handleClearHistory}
        onViewLog={state.viewHistoryLog}
        onSync={handleSyncWithMatrix}
      />

      {state.isEditorModalOpen && (
        <RunnerEditorModal
          runner={state.editingRunner}
          validationItems={validationItems}
          onChange={state.setEditingRunner}
          onClose={state.closeEditor}
          onSave={state.handleSaveRunner}
        />
      )}
    </div>
  );
};
