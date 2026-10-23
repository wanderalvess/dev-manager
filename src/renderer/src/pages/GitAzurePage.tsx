import React, { useMemo } from 'react';
import type { GitProjectInfo } from '../../../shared/types';
import { OnboardingTour } from '../components/onboarding/OnboardingTour';
import { usePageTour } from '../components/onboarding/usePageTour';
import { GIT_TOUR_STEPS, GIT_TOUR_STORAGE_KEY } from '../components/onboarding/pageTours/gitAzureTour';
import { buildTargetBranchOptions } from '../utils/gitPageUtils';
import { getPrBlockedReason } from '../utils/gitViewUtils';
import { useGitOutput } from '../hooks/git/useGitOutput';
import { useGitSettingsSync } from '../hooks/git/useGitSettingsSync';
import { useGitProjectState } from '../hooks/git/useGitProjectState';
import { useGitOperations } from '../hooks/git/useGitOperations';
import { useGitPublish } from '../hooks/git/useGitPublish';
import { useGitUnpushedCounts } from '../hooks/git/useGitUnpushedCounts';
import { useGitRepoFilter } from '../hooks/git/useGitRepoFilter';
import { isBranchLocalOnly } from '../utils/gitPublishViewUtils';
import { useGitBranchModal } from '../hooks/git/useGitBranchModal';
import { useGitCommit } from '../hooks/git/useGitCommit';
import { useGitHistory } from '../hooks/git/useGitHistory';
import { useGitDiff } from '../hooks/git/useGitDiff';
import { useGitTaskBranch } from '../hooks/git/useGitTaskBranch';
import { GitPageHeader } from '../components/git/GitPageHeader';
import { GitRepoList } from '../components/git/GitRepoList';
import { GitProjectTitleBar } from '../components/git/GitProjectTitleBar';
import { GitBranchActionsBar } from '../components/git/GitBranchActionsBar';
import { GitPendingChangesPanel } from '../components/git/GitPendingChangesPanel';
import { GitPullRequestPanel } from '../components/git/GitPullRequestPanel';
import { GitOutputConsole } from '../components/git/GitOutputConsole';
import { GitEmptyState } from '../components/git/GitEmptyState';
import { GitBranchModal } from '../components/git/modals/GitBranchModal';
import { GitCommitModal } from '../components/git/modals/GitCommitModal';
import { useAlteredPoms } from '../hooks/deploy/useAlteredPoms';
import { alteredPomsInCommit } from '../utils/alteredPoms';
import { GitHistoryModal } from '../components/git/modals/GitHistoryModal';
import { GitDiffModal } from '../components/git/modals/GitDiffModal';
import { GitTaskBranchModal } from '../components/git/modals/GitTaskBranchModal';
import { AzureArtifactsModal } from '../components/git/modals/AzureArtifactsModal';
import { useAzureArtifacts } from '../hooks/git/useAzureArtifacts';

interface GitAzurePageProps {
  projects: GitProjectInfo[];
  onRefreshProjects: () => void | Promise<void>;
  isRefreshing: boolean;
  onNavigateToSettings?: () => void;
  settingsVersion?: number;
}

export const GitAzurePage: React.FC<GitAzurePageProps> = ({
  projects,
  onRefreshProjects,
  isRefreshing,
  onNavigateToSettings,
  settingsVersion
}) => {
  const alteredPoms = useAlteredPoms();
  const tour = usePageTour(GIT_TOUR_STORAGE_KEY);
  const { gitOutput, gitOutputIsError, setGitOutput, setGitOutputIsError, resetOutput } = useGitOutput();
  const outputControls = { setGitOutput, setGitOutputIsError };

  const { targetBranch, setTargetBranch, preferredTarget } = useGitSettingsSync(settingsVersion, onRefreshProjects);

  const { unpushedCounts, refreshUnpushedCounts } = useGitUnpushedCounts(settingsVersion);

  const {
    selectedPath,
    setSelectedPath,
    searchTerm,
    setSearchTerm,
    filteredProjects,
    currentProject,
    uncommittedCounts,
    pendingChanges,
    isLoadingPendingChanges,
    refreshUncommittedCounts,
    refreshAfterGitChange
  } = useGitProjectState({
    projects,
    settingsVersion,
    onRefreshProjects,
    refreshUnpushedCounts,
    resetOutput
  });
  const repoFilter = useGitRepoFilter({
    projects,
    searchedProjects: filteredProjects,
    uncommittedCounts,
    unpushedCounts
  });

  const targetBranchOptions = useMemo(
    () =>
      currentProject
        ? buildTargetBranchOptions({
            remoteBranches: currentProject.remoteBranches,
            currentBranch: currentProject.currentBranch,
            selected: targetBranch,
            preferred: preferredTarget
          })
        : [],
    [currentProject, targetBranch, preferredTarget]
  );

  const prBlockedReason = getPrBlockedReason(currentProject, targetBranch);

  const publish = useGitPublish({ currentProject, ...outputControls, refreshAfterGitChange });
  const isLocalOnly = isBranchLocalOnly(currentProject);

  const ops = useGitOperations({
    currentProject,
    selectedPath,
    targetBranch,
    prBlockedReason,
    ensurePublishedForPr: publish.ensurePublishedForPr,
    ...outputControls,
    refreshAfterGitChange,
    refreshUncommittedCounts
  });
  const branchModal = useGitBranchModal({
    currentProject,
    isExecutingGit: ops.isExecutingGit,
    setIsExecutingGit: ops.setIsExecutingGit,
    ...outputControls,
    refreshAfterGitChange
  });
  const commit = useGitCommit({ currentProject, ...outputControls, refreshAfterGitChange });
  const history = useGitHistory(currentProject);
  const diff = useGitDiff(currentProject);
  const taskBranch = useGitTaskBranch({ currentProject, ...outputControls, refreshAfterGitChange });
  const artifacts = useAzureArtifacts(currentProject);

  return (
    <div className="h-full flex flex-col p-5 space-y-4 overflow-hidden">
      <GitPageHeader
        projectCount={projects.length}
        localOnlyCount={repoFilter.filterCounts['local-only']}
        changesCount={repoFilter.filterCounts.changes}
        isBusy={isRefreshing || ops.isSyncing}
        onOpenTour={tour.open}
        onSync={ops.handleSyncRepositories}
      />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
        <GitRepoList
          projects={repoFilter.visibleProjects}
          selectedPath={currentProject?.path}
          uncommittedCounts={uncommittedCounts}
          unpushedCounts={unpushedCounts}
          filter={repoFilter.filter}
          filterCounts={repoFilter.filterCounts}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onFilterChange={repoFilter.setFilter}
          onSelect={setSelectedPath}
        />

        {/* Coluna Direita: Detalhes do Repositório e Criador de Pull Request */}
        <div className="lg:col-span-8 flex flex-col space-y-3 overflow-y-auto pr-1">
          {currentProject ? (
            <>
              <div className="cockpit-panel rounded-xl p-5 space-y-4 border border-border">
                <GitProjectTitleBar
                  project={currentProject}
                  onOpenAzurePipelines={ops.handleOpenAzurePipelines}
                  onOpenRemoteRepo={ops.handleOpenRemoteRepo}
                  onOpenArtifacts={artifacts.canOpen ? artifacts.open : undefined}
                />
                <GitBranchActionsBar
                  project={currentProject}
                  isExecutingGit={ops.isExecutingGit || publish.isPublishing}
                  isPublishing={publish.isPublishing}
                  isLocalOnly={isLocalOnly}
                  hasPendingChanges={pendingChanges.length > 0}
                  onPublish={publish.handlePublish}
                  onOpenBranchModal={() => branchModal.setIsBranchModalOpen(true)}
                  onOpenTaskBranchModal={taskBranch.openTaskBranchModal}
                  onOpenDiff={() => diff.handleOpenDiff()}
                  onOpenHistory={history.handleOpenHistory}
                  onOpenCommit={commit.openCommitModal}
                  onExecGit={ops.handleExecGit}
                />
                <GitPendingChangesPanel
                  files={pendingChanges}
                  isLoading={isLoadingPendingChanges}
                  ideFeedback={ops.ideFeedback}
                  onOpenDiff={diff.handleOpenDiff}
                  onOpenCommit={commit.openCommitModal}
                  onOpenFileInIde={ops.handleOpenFileInIde}
                />
                <GitPullRequestPanel
                  project={currentProject}
                  targetBranch={targetBranch}
                  targetBranchOptions={targetBranchOptions}
                  prBlockedReason={prBlockedReason}
                  isLocalOnly={isLocalOnly}
                  unpushedCount={unpushedCounts[currentProject.path] ?? 0}
                  isBusy={ops.isOpeningPr || publish.isPublishing}
                  onTargetBranchChange={setTargetBranch}
                  onOpenPr={ops.handleOpenPr}
                />
              </div>

              {gitOutput && <GitOutputConsole output={gitOutput} isError={gitOutputIsError} />}
            </>
          ) : (
            <GitEmptyState hasProjects={projects.length > 0} onNavigateToSettings={onNavigateToSettings} />
          )}
        </div>
      </div>

      {branchModal.isBranchModalOpen && currentProject && (
        <GitBranchModal
          project={currentProject}
          newBranchName={branchModal.newBranchName}
          branchFilter={branchModal.branchFilter}
          branchError={branchModal.branchError}
          isExecutingGit={ops.isExecutingGit}
          onNewBranchNameChange={branchModal.setNewBranchName}
          onBranchFilterChange={branchModal.setBranchFilter}
          onCheckout={branchModal.handleCheckoutBranch}
          onClose={branchModal.closeBranchModal}
        />
      )}

      {commit.isCommitModalOpen && currentProject && (
        <GitCommitModal
          project={currentProject}
          commitMessage={commit.commitMessage}
          commitError={commit.commitError}
          commitFiles={commit.commitFiles}
          alteredPoms={alteredPomsInCommit(alteredPoms, currentProject.path, commit.commitFiles.map((f) => f.path))}
          isLoadingFiles={commit.isLoadingCommitFiles}
          isCommitting={commit.isCommitting}
          onMessageChange={commit.setCommitMessage}
          onInspectFile={(filePath) => {
            commit.setIsCommitModalOpen(false);
            diff.handleOpenDiff(filePath);
          }}
          onConfirm={commit.handleCommitAndPush}
          onClose={() => commit.setIsCommitModalOpen(false)}
        />
      )}

      {history.isHistoryModalOpen && currentProject && (
        <GitHistoryModal
          project={currentProject}
          commits={history.commitHistory}
          isLoading={history.isLoadingHistory}
          error={history.historyError}
          copiedHash={history.copiedHash}
          onCopyHash={history.copyHash}
          onClose={() => history.setIsHistoryModalOpen(false)}
        />
      )}

      {diff.isDiffModalOpen && currentProject && (
        <GitDiffModal
          project={currentProject}
          files={diff.diffFiles}
          selectedFile={diff.selectedDiffFile}
          diffText={diff.diffText}
          renderedDiff={diff.renderedDiff}
          isLoading={diff.isLoadingDiff}
          error={diff.diffError}
          copiedKey={diff.copiedDiffKey}
          onCopyDiff={diff.copyDiff}
          onSelectFile={diff.handleSelectDiffFile}
          onOpenFileInIde={ops.handleOpenFileInIde}
          onCommit={() => {
            diff.setIsDiffModalOpen(false);
            commit.openCommitModal();
          }}
          onClose={() => diff.setIsDiffModalOpen(false)}
        />
      )}

      {taskBranch.isTaskBranchModalOpen && currentProject && (
        <GitTaskBranchModal
          project={currentProject}
          task={taskBranch}
          copiedKey={diff.copiedDiffKey}
          onCopy={diff.copyDiff}
        />
      )}

      {artifacts.isOpen && currentProject && <AzureArtifactsModal project={currentProject} state={artifacts} />}

      <OnboardingTour
        steps={GIT_TOUR_STEPS}
        isOpen={tour.isOpen}
        onClose={tour.close}
        storageKey={GIT_TOUR_STORAGE_KEY}
      />
    </div>
  );
};
