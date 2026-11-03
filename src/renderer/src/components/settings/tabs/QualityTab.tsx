import React from 'react';
import {
  AppSettings,
  QualitySourceConfig,
  QualitySourceTemplate
} from '../../../../../shared/types';
import { createNewQualitySourceDraft, findActiveQualitySource } from '../../../utils/qualityTabUtils';
import { QualityTautPanel } from '../quality/QualityTautPanel';
import { QualityTabHeader } from '../quality/QualityTabHeader';
import { QualityTemplateGrid } from '../quality/QualityTemplateGrid';
import { QualitySourceForm } from '../quality/QualitySourceForm';
import { QualitySourceList } from '../quality/QualitySourceList';

interface QualityTabProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  editingQualitySource: Partial<QualitySourceConfig> | null;
  setEditingQualitySource: (source: Partial<QualitySourceConfig> | null) => void;
  showQualityToken: boolean;
  setShowQualityToken: (show: boolean) => void;
  handleApplyQualityTemplate: (template: QualitySourceTemplate) => void;
  handleSaveQualitySource: () => void;
  handleDeleteQualitySource: (id: string) => void;
  handleToggleQualitySource: (id: string, enabled: boolean) => void;
  handleSetActiveQualitySource: (id: string) => void;
  handleTestQualityConnection: (source: QualitySourceConfig) => void;
  testingQualityId: string | null;
  testResults: Record<string, { success: boolean; message: string }>;
  renderPathStatusBadge: (field: keyof AppSettings) => React.ReactNode;
  validateSinglePath: (field: keyof AppSettings, value: string) => Promise<void>;
  handleBrowseDirectory: (field: keyof AppSettings) => Promise<void>;
}

export const QualityTab: React.FC<QualityTabProps> = ({
  settings,
  setSettings,
  renderPathStatusBadge,
  validateSinglePath,
  handleBrowseDirectory,
  editingQualitySource,
  setEditingQualitySource,
  showQualityToken,
  setShowQualityToken,
  handleApplyQualityTemplate,
  handleSaveQualitySource,
  handleDeleteQualitySource,
  handleToggleQualitySource: _handleToggleQualitySource,
  handleSetActiveQualitySource,
  handleTestQualityConnection,
  testingQualityId,
  testResults
}) => {
  const sources = settings.qualitySources || [];
  const activeSourceId = settings.activeQualitySourceId;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1" id="field-quality">
      <div className="lg:col-span-12 space-y-4 flex flex-col">
        <QualityTautPanel
          settings={settings}
          setSettings={setSettings}
          renderPathStatusBadge={renderPathStatusBadge}
          validateSinglePath={validateSinglePath}
          handleBrowseDirectory={handleBrowseDirectory}
        />

        <div className="cockpit-panel rounded-xl p-5 space-y-4 border border-border bg-card">
          <QualityTabHeader
            activeSource={findActiveQualitySource(sources, activeSourceId)}
            onAddManual={() => setEditingQualitySource(createNewQualitySourceDraft(Date.now()))}
          />

          <QualityTemplateGrid onApplyTemplate={handleApplyQualityTemplate} />

          {editingQualitySource && (
            <QualitySourceForm
              source={editingQualitySource}
              isExisting={sources.some((s) => s.id === editingQualitySource.id)}
              onChange={setEditingQualitySource}
              showToken={showQualityToken}
              onToggleShowToken={setShowQualityToken}
              onSave={handleSaveQualitySource}
            />
          )}

          <QualitySourceList
            sources={sources}
            activeSourceId={activeSourceId}
            testingQualityId={testingQualityId}
            testResults={testResults}
            onTest={handleTestQualityConnection}
            onSetActive={handleSetActiveQualitySource}
            onEdit={setEditingQualitySource}
            onDelete={handleDeleteQualitySource}
          />
        </div>
      </div>
    </div>
  );
};
