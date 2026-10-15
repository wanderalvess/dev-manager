import React from 'react';
import {
  AppSettings,
  LlmProviderConfig,
  LlmTestResult
} from '../../../../../shared/types';
import { createNewLlmProviderDraft, findActiveLlmProvider } from '../../../utils/aiTabUtils';
import { AiTabHeader } from '../ai/AiTabHeader';
import { AiPresetGrid } from '../ai/AiPresetGrid';
import { AiProviderList } from '../ai/AiProviderList';
import { AiProviderForm } from '../ai/AiProviderForm';

interface AiTabProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  editingLlmProvider: Partial<LlmProviderConfig> | null;
  setEditingLlmProvider: (provider: Partial<LlmProviderConfig> | null) => void;
  isTestingLlmId: string | null;
  llmTestResults: Record<string, LlmTestResult>;
  showLlmFormKey: boolean;
  setShowLlmFormKey: (show: boolean) => void;
  handleApplyLlmTemplate: (template: Omit<LlmProviderConfig, 'id'>) => void;
  handleSaveLlmProvider: () => void;
  handleDeleteLlmProvider: (id: string) => void;
  handleToggleLlmProvider: (id: string, enabled: boolean) => void;
  handleSetActiveLlmProvider: (id: string) => void;
  handleTestLlmConnection: (provider: LlmProviderConfig) => Promise<void>;
}

export const AiTab: React.FC<AiTabProps> = ({
  settings,
  editingLlmProvider,
  setEditingLlmProvider,
  isTestingLlmId,
  llmTestResults,
  showLlmFormKey,
  setShowLlmFormKey,
  handleApplyLlmTemplate,
  handleSaveLlmProvider,
  handleDeleteLlmProvider,
  handleToggleLlmProvider,
  handleSetActiveLlmProvider,
  handleTestLlmConnection
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1" id="field-ai">
      <div className="lg:col-span-12 space-y-4 flex flex-col">
        <div className="cockpit-panel rounded-xl p-5 space-y-4 shadow-xl border border-border bg-card">
          <AiTabHeader
            activeProvider={findActiveLlmProvider(settings.llmProviders, settings.activeLlmProviderId)}
            onNewProvider={() => setEditingLlmProvider(createNewLlmProviderDraft(Date.now()))}
          />

          <AiPresetGrid onApplyTemplate={handleApplyLlmTemplate} />

          <AiProviderList
            settings={settings}
            isTestingLlmId={isTestingLlmId}
            llmTestResults={llmTestResults}
            onSetActive={handleSetActiveLlmProvider}
            onTest={handleTestLlmConnection}
            onToggle={handleToggleLlmProvider}
            onEdit={setEditingLlmProvider}
            onDelete={handleDeleteLlmProvider}
          />

          {editingLlmProvider && (
            <AiProviderForm
              provider={editingLlmProvider}
              onChange={setEditingLlmProvider}
              showKey={showLlmFormKey}
              onToggleShowKey={setShowLlmFormKey}
              onSave={handleSaveLlmProvider}
            />
          )}
        </div>
      </div>
    </div>
  );
};
