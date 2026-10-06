import React, { useState } from 'react';
import { QualityPageHeader } from '../components/quality/page/QualityPageHeader';
import { QualityPageTabs } from '../components/quality/page/QualityPageTabs';
import { QualityMetricsStrip } from '../components/quality/page/QualityMetricsStrip';
import { QualityMatrixPanel } from '../components/quality/page/QualityMatrixPanel';
import { QualityReadinessPanel } from '../components/quality/page/QualityReadinessPanel';
import { QualityRoadmapPanel } from '../components/quality/page/QualityRoadmapPanel';
import { QualityAddItemModal } from '../components/quality/page/QualityAddItemModal';
import { useQualityPageSettings } from '../hooks/quality/page/useQualityPageSettings';
import { useQualityValidation } from '../hooks/quality/page/useQualityValidation';
import { useQualityAddItemForm } from '../hooks/quality/page/useQualityAddItemForm';
import type { QualityTabMode } from '../utils/qualityPageView';

interface QualityPageProps {
  onNavigate?: (tab: string) => void;
  settingsVersion?: number;
  isActive?: boolean;
}

// Homologação: matriz de cenários, prontidão da release e roadmap. TAUT, Test Runners e Validador
// Regressivo têm página própria (QualityTautPage, QualityRunnersPage, QualityRegressionPage).
export const QualityPage: React.FC<QualityPageProps> = ({ onNavigate, settingsVersion }) => {
  const [tabMode, setTabMode] = useState<QualityTabMode>('matrix');

  const { qualitySources, activeQualitySource } = useQualityPageSettings(settingsVersion);
  const validation = useQualityValidation();
  const { items, metrics } = validation;
  const addForm = useQualityAddItemForm(validation.addItem, validation.updateItem);

  const handleFilterByStatus = (status: string) => {
    validation.setStatusFilter(status);
    setTabMode('matrix');
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      <QualityPageHeader
        activeQualitySource={activeQualitySource}
        releaseVersion={validation.releaseVersion}
        onReleaseVersionChange={validation.setReleaseVersion}
        copiedKey={validation.copiedKey}
        onCopyReport={validation.handleCopyReport}
        onOpenAddModal={addForm.openCreate}
        onNavigate={onNavigate}
      />

      <QualityPageTabs
        tabMode={tabMode}
        onTabChange={setTabMode}
        itemsCount={items.length}
        readinessScore={metrics.readinessScore}
        onNavigate={onNavigate}
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <QualityMetricsStrip metrics={metrics} onFilterStatus={handleFilterByStatus} />

        {tabMode === 'matrix' && (
          <QualityMatrixPanel
            qualitySources={qualitySources}
            filteredItems={validation.filteredItems}
            totalCount={items.length}
            searchTerm={validation.searchTerm}
            onSearchTermChange={validation.setSearchTerm}
            statusFilter={validation.statusFilter}
            onStatusFilterChange={validation.setStatusFilter}
            categoryFilter={validation.categoryFilter}
            onCategoryFilterChange={validation.setCategoryFilter}
            onResetDefaults={validation.handleResetDefaults}
            onStatusChange={validation.handleStatusChange}
            onDeleteItem={validation.handleDeleteItem}
            onEditItem={addForm.openEdit}
            onExportCsv={validation.handleExportCsv}
            sortKey={validation.sortKey}
            sortDir={validation.sortDir}
            onSort={validation.handleSort}
            onNavigate={onNavigate}
          />
        )}

        {tabMode === 'readiness' && <QualityReadinessPanel metrics={metrics} items={items} />}

        {tabMode === 'roadmap' && <QualityRoadmapPanel />}
      </div>

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
          onClose={addForm.closeModal}
          isEditing={addForm.isEditing}
        />
      )}
    </div>
  );
};
