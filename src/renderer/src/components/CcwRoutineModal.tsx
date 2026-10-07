import React, { useState, useEffect } from 'react';
import type { RoutineDownloadResult } from '../../../shared/types';
import type { CcwModalTab } from '../utils/ccwModalUtils';
import { useCcwInstall } from '../hooks/ccw/useCcwInstall';
import { useCcwCatalog } from '../hooks/ccw/useCcwCatalog';
import { useCcwRollback } from '../hooks/ccw/useCcwRollback';
import { useCcwBatch } from '../hooks/ccw/useCcwBatch';
import { CcwModalHeader } from './ccw/CcwModalHeader';
import { CcwModalTabs } from './ccw/CcwModalTabs';
import { CcwFeedbackAlerts } from './ccw/CcwFeedbackAlerts';
import { CcwDownloadTab } from './ccw/CcwDownloadTab';
import { CcwLocalFileTab } from './ccw/CcwLocalFileTab';
import { CcwCatalogTab } from './ccw/CcwCatalogTab';
import { CcwRollbackTab } from './ccw/CcwRollbackTab';
import { CcwBatchTab } from './ccw/CcwBatchTab';
import { Modal } from './ui/Modal';

interface CcwRoutineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialRoutineName?: string;
  initialTab?: 'download' | 'file' | 'catalog' | 'rollback' | 'batch';
  appPath?: string;
}

export const CcwRoutineModal: React.FC<CcwRoutineModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialRoutineName = '',
  initialTab = 'download',
  appPath = ''
}) => {
  const [activeTab, setActiveTab] = useState<CcwModalTab>(initialTab);
  const [result, setResult] = useState<RoutineDownloadResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const install = useCcwInstall({ onSuccess, setResult, setErrorMsg });
  const catalog = useCcwCatalog();
  const rollback = useCcwRollback({ initialRoutineName, onSuccess, setErrorMsg });
  const batch = useCcwBatch(onSuccess);

  const { setRoutineInput } = install;
  const { setRollbackRoutine, setRollbackSuccessMsg, fetchBackups } = rollback;
  const { resetBatchFeedback } = batch;

  useEffect(() => {
    if (isOpen) {
      if (initialRoutineName) {
        setRoutineInput(initialRoutineName);
        setRollbackRoutine(initialRoutineName);
      }
      if (initialTab) {
        setActiveTab(initialTab);
      }
      setResult(null);
      setErrorMsg(null);
      setRollbackSuccessMsg(null);
      resetBatchFeedback();

      if (initialTab === 'rollback' && initialRoutineName) {
        fetchBackups(initialRoutineName);
      }
    }
  }, [isOpen, initialRoutineName, initialTab, fetchBackups, resetBatchFeedback, setRollbackRoutine, setRollbackSuccessMsg, setRoutineInput]);

  if (!isOpen) return null;

  const selectTab = (tab: CcwModalTab) => {
    setActiveTab(tab);
    setResult(null);
    setErrorMsg(null);
    if (tab === 'rollback' && rollback.rollbackRoutine) fetchBackups(rollback.rollbackRoutine);
  };

  return (
    <Modal
      open
      onClose={onClose}
      bare
      panelClassName="cockpit-panel border border-border/80 w-full max-w-2xl rounded-xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden"
      closeOnBackdrop={false}
      closeOnEscape={false}
    >
      <CcwModalHeader appPath={appPath} onClose={onClose} />
      <CcwModalTabs activeTab={activeTab} onSelect={selectTab} />

      {/* Conteúdo rolável */}
      <div className="p-5 flex-1 overflow-y-auto space-y-4">
        <CcwFeedbackAlerts result={result} errorMsg={errorMsg} />

        {activeTab === 'download' && (
          <CcwDownloadTab
            appPath={appPath}
            routineInput={install.routineInput}
            onRoutineInputChange={install.setRoutineInput}
            normalized={install.normalized}
            winthorVersion={install.winthorVersion}
            onWinthorVersionChange={install.setWinthorVersion}
            targetModule={install.targetModule}
            onTargetModuleChange={install.setTargetModule}
            customDownloadUrl={install.customDownloadUrl}
            onCustomDownloadUrlChange={install.setCustomDownloadUrl}
            estimatedDownloadUrl={install.estimatedDownloadUrl}
            backupExisting={install.backupExisting}
            onBackupExistingChange={install.setBackupExisting}
            isSubmitting={install.isSubmitting}
            onSubmit={install.handleDownload}
          />
        )}

        {activeTab === 'file' && (
          <CcwLocalFileTab
            appPath={appPath}
            localFilePath={install.localFilePath}
            onSelectFile={install.handleSelectLocalFile}
            localRoutineName={install.localRoutineName}
            onLocalRoutineNameChange={install.setLocalRoutineName}
            localTargetModule={install.localTargetModule}
            onLocalTargetModuleChange={install.setLocalTargetModule}
            localBackup={install.localBackup}
            onLocalBackupChange={install.setLocalBackup}
            isSubmitting={install.isSubmitting}
            onSubmit={install.handleInstallLocal}
          />
        )}

        {activeTab === 'catalog' && (
          <CcwCatalogTab
            catalogItems={catalog.catalogItems}
            filteredCatalog={catalog.filteredCatalog}
            isLoadingCatalog={catalog.isLoadingCatalog}
            catalogSearch={catalog.catalogSearch}
            onCatalogSearchChange={catalog.setCatalogSearch}
            catalogMessage={catalog.catalogMessage}
            catalogAuthCookie={catalog.catalogAuthCookie}
            onCatalogAuthCookieChange={catalog.setCatalogAuthCookie}
            onLoadCatalog={catalog.handleLoadCatalog}
            onPickRoutine={(rotina) => {
              setRoutineInput(rotina);
              setActiveTab('download');
            }}
          />
        )}

        {activeTab === 'rollback' && (
          <CcwRollbackTab
            rollbackRoutine={rollback.rollbackRoutine}
            onRollbackRoutineChange={setRollbackRoutine}
            onSearch={() => fetchBackups(rollback.rollbackRoutine)}
            isLoadingBackups={rollback.isLoadingBackups}
            rollbackSuccessMsg={rollback.rollbackSuccessMsg}
            backups={rollback.backups}
            restoringBackupPath={rollback.restoringBackupPath}
            deletingBackupPath={rollback.deletingBackupPath}
            confirmingRestorePath={rollback.confirmingRestorePath}
            confirmingDeletePath={rollback.confirmingDeletePath}
            onRestore={rollback.handleRestoreBackup}
            onDelete={rollback.handleDeleteBackup}
            onCancelRestore={() => rollback.setConfirmingRestorePath(null)}
            onCancelDelete={() => rollback.setConfirmingDeletePath(null)}
          />
        )}

        {activeTab === 'batch' && (
          <CcwBatchTab
            targetType={batch.batchTargetType}
            onTargetTypeChange={batch.setBatchTargetType}
            moduleFolder={batch.batchModuleFolder}
            onModuleFolderChange={batch.setBatchModuleFolder}
            customCodes={batch.batchCustomCodes}
            onCustomCodesChange={batch.setBatchCustomCodes}
            winthorVersion={batch.batchWinthorVersion}
            onWinthorVersionChange={batch.setBatchWinthorVersion}
            backupExisting={batch.batchBackupExisting}
            onBackupExistingChange={batch.setBatchBackupExisting}
            isRunning={batch.isBatchRunning}
            onStart={batch.handleStartBatchDownload}
            error={batch.batchError}
            summary={batch.batchSummary}
            progressList={batch.batchProgressList}
          />
        )}
      </div>
    </Modal>
  );
};
