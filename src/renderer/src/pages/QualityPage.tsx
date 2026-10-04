import React, { useState } from 'react';
import { QaRegressionRunner } from '../components/quality/QaRegressionRunner';
import { QaRegressionTemplatesManager } from '../components/quality/QaRegressionTemplatesManager';
import { AutomatedTestRunners } from '../components/quality/AutomatedTestRunners';
import { TautAutomationPanel } from '../components/quality/TautAutomationPanel';
import { QualityPageHeader } from '../components/quality/page/QualityPageHeader';
import { QualityPageTabs } from '../components/quality/page/QualityPageTabs';
import { QualityMetricsStrip } from '../components/quality/page/QualityMetricsStrip';
import { QualityMatrixPanel } from '../components/quality/page/QualityMatrixPanel';
import { QualityReadinessPanel } from '../components/quality/page/QualityReadinessPanel';
import { QualityRoadmapPanel } from '../components/quality/page/QualityRoadmapPanel';
import { QualityAddItemModal } from '../components/quality/page/QualityAddItemModal';
import { useQualityPageSettings } from '../hooks/quality/page/useQualityPageSettings';
import { useQualityValidationItems } from '../hooks/quality/page/useQualityValidationItems';
import { useQualityAddItemForm } from '../hooks/quality/page/useQualityAddItemForm';
import type { QualityTabMode } from '../utils/qualityPageView';

interface QualityPageProps {
  onNavigate?: (tab: string) => void;
  settingsVersion?: number;
  isActive?: boolean;
}

export const QualityPage: React.FC<QualityPageProps> = ({ onNavigate, settingsVersion }) => {
  const [tabMode, setTabMode] = useState<QualityTabMode>('matrix');
  const [isTemplatesManagerOpen, setIsTemplatesManagerOpen] = useState<boolean>(false);

  const { settings, qualitySources, activeQualitySource } = useQualityPageSettings(settingsVersion);
  const validation = useQualityValidationItems();
  const { items, metrics } = validation;
  const addForm = useQualityAddItemForm(validation.addItem);

  const handleTabChange = (tab: QualityTabMode) => {
    setTabMode(tab);
    if (tab === 'regression') setIsTemplatesManagerOpen(false);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      <QualityPageHeader
        activeQualitySource={activeQualitySource}
        releaseVersion={validation.releaseVersion}
        onReleaseVersionChange={validation.setReleaseVersion}
        copiedKey={validation.copiedKey}
        onCopyReport={validation.handleCopyReport}
        onOpenAddModal={() => addForm.setIsAddModalOpen(true)}
        onNavigate={onNavigate}
      />

      <QualityPageTabs
        tabMode={tabMode}
        onTabChange={handleTabChange}
        itemsCount={items.length}
        readinessScore={metrics.readinessScore}
        onNavigate={onNavigate}
      />

      {/* Conteúdo Principal */}
      {tabMode === 'taut' ? (
        <div className="flex-1 overflow-y-auto p-6">
          <TautAutomationPanel
            settings={settings}
            onNavigateToSettings={() => onNavigate?.('settings')}
          />
        </div>
      ) : tabMode === 'runners' ? (
        <AutomatedTestRunners
          settings={settings}
          validationItems={items}
          onSyncWithValidationMatrix={validation.handleSyncWithValidationMatrix}
          onNavigate={onNavigate}
        />
      ) : tabMode === 'regression' ? (
        isTemplatesManagerOpen ? (
          <QaRegressionTemplatesManager
            onBack={() => setIsTemplatesManagerOpen(false)}
          />
        ) : (
          <QaRegressionRunner
            settings={settings}
            onNavigate={onNavigate}
            onOpenTemplatesManager={() => setIsTemplatesManagerOpen(true)}
          />
        )
      ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <QualityMetricsStrip metrics={metrics} />

          {tabMode === 'matrix' && (
            <QualityMatrixPanel
              qualitySources={qualitySources}
              filteredItems={validation.filteredItems}
              searchTerm={validation.searchTerm}
              onSearchTermChange={validation.setSearchTerm}
              statusFilter={validation.statusFilter}
              onStatusFilterChange={validation.setStatusFilter}
              categoryFilter={validation.categoryFilter}
              onCategoryFilterChange={validation.setCategoryFilter}
              onResetDefaults={validation.handleResetDefaults}
              onStatusChange={validation.handleStatusChange}
              onDeleteItem={validation.handleDeleteItem}
              onNavigate={onNavigate}
            />
          )}

          {tabMode === 'readiness' && <QualityReadinessPanel metrics={metrics} />}

          {tabMode === 'roadmap' && <QualityRoadmapPanel />}
        </div>
      )}

      {addForm.isAddModalOpen && (
        <QualityAddItemModal
          title={addForm.newTitle}
          onTitleChange={addForm.setNewTitle}
          target={addForm.newTarget}
          onTargetChange={addForm.setNewTarget}
          category={addForm.newCategory}
          onCategoryChange={addForm.setNewCategory}
          notes={addForm.newNotes}
          onNotesChange={addForm.setNewNotes}
          onSubmit={addForm.handleAddItem}
          onClose={() => addForm.setIsAddModalOpen(false)}
        />
      )}
    </div>
  );
};
