import React, { useState } from 'react';
import type { AppSettings } from '../../../../shared/types';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { useTautProject } from '../../hooks/quality/taut/useTautProject';
import { useTautRunner } from '../../hooks/quality/taut/useTautRunner';
import { useTautIntake } from '../../hooks/quality/taut/useTautIntake';
import { useTautCoverageFilter } from '../../hooks/quality/taut/useTautCoverageFilter';
import { TautProjectHeader } from './taut/TautProjectHeader';
import { TautSubTabs, type TautSubTab } from './taut/TautSubTabs';
import { TautRunnerControls } from './taut/TautRunnerControls';
import { TautConsole } from './taut/TautConsole';
import { TautCoverageTab } from './taut/TautCoverageTab';
import { TautSpecsTab } from './taut/TautSpecsTab';
import { TautIntakeTab } from './taut/TautIntakeTab';

interface TautAutomationPanelProps {
  settings: AppSettings | null;
  onNavigateToSettings?: () => void;
}

export const TautAutomationPanel: React.FC<TautAutomationPanelProps> = ({
  settings,
  onNavigateToSettings
}) => {
  const project = useTautProject(settings);
  const runner = useTautRunner();
  const intake = useTautIntake();
  const coverageFilter = useTautCoverageFilter(project.coverageReport);

  const [activeSubTab, setActiveSubTab] = useState<TautSubTab>('runner');
  const { copy: copyToClipboard, copiedKey } = useCopyToClipboard(2000);

  return (
    <div className="space-y-4">
      <TautProjectHeader
        projectStatus={project.projectStatus}
        specs={project.specs}
        loading={project.loading}
        syncingEnv={project.syncingEnv}
        onSyncEnv={project.handleSyncEnv}
        onReload={project.loadProjectData}
        onNavigateToSettings={onNavigateToSettings}
      />

      <TautSubTabs
        activeSubTab={activeSubTab}
        onChange={setActiveSubTab}
        coverageReport={project.coverageReport}
        specsCount={project.specs.length}
      />

      {activeSubTab === 'runner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <TautRunnerControls
            selectedTags={runner.selectedTags}
            onToggleTag={runner.toggleTag}
            effectiveTagsString={runner.effectiveTagsString}
            onCustomTagChange={runner.setCustomTagInput}
            customSpecInput={runner.customSpecInput}
            onCustomSpecChange={runner.setCustomSpecInput}
            apiUrlMode={runner.apiUrlMode}
            onApiUrlModeChange={runner.setApiUrlMode}
            isRunning={runner.isRunning}
            projectExists={!!project.projectStatus?.exists}
            onRun={runner.handleRunTests}
            onOpenInteractive={runner.handleOpenInteractive}
            onAbort={runner.handleAbort}
          />
          <TautConsole
            isRunning={runner.isRunning}
            activeOutput={runner.activeOutput}
            lastExecutionResult={runner.lastExecutionResult}
            terminalRef={runner.terminalBottomRef}
            copiedKey={copiedKey}
            onCopy={copyToClipboard}
            onClear={() => runner.setActiveOutput('')}
          />
        </div>
      )}

      {activeSubTab === 'coverage' && (
        <TautCoverageTab
          coverageReport={project.coverageReport}
          loadingCoverage={project.loadingCoverage}
          onRecalculate={project.loadCoverage}
          filteredCoverageItems={coverageFilter.filteredCoverageItems}
          coverageSearch={coverageFilter.coverageSearch}
          onSearchChange={coverageFilter.setCoverageSearch}
          coverageStatusFilter={coverageFilter.coverageStatusFilter}
          onStatusFilterChange={coverageFilter.setCoverageStatusFilter}
        />
      )}

      {activeSubTab === 'specs' && <TautSpecsTab specs={project.specs} />}

      {activeSubTab === 'intake' && (
        <TautIntakeTab
          csvFileName={intake.csvFileName}
          onCsvFileNameChange={intake.setCsvFileName}
          processingIntake={intake.processingIntake}
          onProcess={intake.handleProcessIntake}
          intakeResult={intake.intakeResult}
          copiedKey={copiedKey}
          onCopy={copyToClipboard}
        />
      )}
    </div>
  );
};
