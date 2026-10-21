import React from 'react';
import { RealtimeLogSource } from '../../../../shared/types';
import { OnboardingTour } from '../onboarding/OnboardingTour';
import { LOGS_TOUR_STEPS, LOGS_TOUR_STORAGE_KEY } from '../onboarding/pageTours/logsTour';
import { LogExceptionAnalyzerDrawer } from '../LogExceptionAnalyzerDrawer';
import { ManageLogSourcesModal } from './modals/ManageLogSourcesModal';
import { ClearLogFileModal } from './modals/ClearLogFileModal';

interface LogsModalsHostProps {
  isManageModalOpen: boolean;
  isClearFileConfirmOpen: boolean;
  isAnalyzerOpen: boolean;
  isTourOpen: boolean;
  sources: RealtimeLogSource[];
  activeSource: RealtimeLogSource;
  editingSource: Partial<RealtimeLogSource> | null;
  lines: string[];
  setEditingSource: React.Dispatch<React.SetStateAction<Partial<RealtimeLogSource> | null>>;
  persistSources: (sources: RealtimeLogSource[], newActiveId?: string) => Promise<void>;
  onBrowseLogFile: () => void | Promise<void>;
  onSaveSource: () => void;
  onConfirmClearFile: () => void | Promise<void>;
  onScrollToLine: (targetLineIndex: number) => void;
  onCloseManage: () => void;
  onCloseClearFile: () => void;
  onCloseAnalyzer: () => void;
  onCloseTour: () => void;
}

export const LogsModalsHost: React.FC<LogsModalsHostProps> = ({
  isManageModalOpen,
  isClearFileConfirmOpen,
  isAnalyzerOpen,
  isTourOpen,
  sources,
  activeSource,
  editingSource,
  lines,
  setEditingSource,
  persistSources,
  onBrowseLogFile,
  onSaveSource,
  onConfirmClearFile,
  onScrollToLine,
  onCloseManage,
  onCloseClearFile,
  onCloseAnalyzer,
  onCloseTour
}) => (
  <>
    {isManageModalOpen && (
      <ManageLogSourcesModal
        sources={sources}
        editingSource={editingSource}
        setEditingSource={setEditingSource}
        persistSources={persistSources}
        onBrowse={onBrowseLogFile}
        onSave={onSaveSource}
        onClose={onCloseManage}
      />
    )}

    {isClearFileConfirmOpen && (
      <ClearLogFileModal
        filePath={activeSource.filePath}
        onCancel={onCloseClearFile}
        onConfirm={onConfirmClearFile}
      />
    )}

    <LogExceptionAnalyzerDrawer
      isOpen={isAnalyzerOpen}
      onClose={onCloseAnalyzer}
      lines={lines}
      onScrollToLine={onScrollToLine}
    />

    <OnboardingTour
      steps={LOGS_TOUR_STEPS}
      isOpen={isTourOpen}
      onClose={onCloseTour}
      storageKey={LOGS_TOUR_STORAGE_KEY}
    />
  </>
);
