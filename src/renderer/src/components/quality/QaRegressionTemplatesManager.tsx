import React from 'react';
import { useQaTemplatesManager } from '../../hooks/quality/templates/useQaTemplatesManager';
import { QaRegressionTemplatesHelpModal } from './modals/QaRegressionTemplatesHelpModal';
import { QaTemplatesManagerHeader } from './templates/QaTemplatesManagerHeader';
import { QaTemplatesGrid } from './templates/QaTemplatesGrid';
import { QaTemplateEditorBar } from './templates/QaTemplateEditorBar';
import { QaTemplateStepList } from './templates/QaTemplateStepList';
import { QaTemplateStepEditor } from './templates/QaTemplateStepEditor';

interface QaRegressionTemplatesManagerProps {
  onBack: () => void;
  onSelectTemplate?: (templateId: string) => void;
}

export const QaRegressionTemplatesManager: React.FC<QaRegressionTemplatesManagerProps> = ({
  onBack,
  onSelectTemplate
}) => {
  const m = useQaTemplatesManager();
  const { editingTemplate, activeStepIndex } = m;
  const currentStep = editingTemplate?.steps[activeStepIndex];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <QaTemplatesManagerHeader
        templatesDir={m.templatesDir}
        showExportAll={m.templates.length > 0 && !editingTemplate}
        onBack={onBack}
        onExportAll={m.handleExportAllTemplates}
        onImport={m.handleImportTemplateJson}
        onCreate={m.handleCreateNewTemplate}
        onOpenHelp={() => m.setIsHelpModalOpen(true)}
      />

      {editingTemplate ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <QaTemplateEditorBar
            template={editingTemplate}
            onChange={m.setEditingTemplate}
            onExport={m.handleExportTemplateJson}
            onCancel={() => m.setEditingTemplate(null)}
            onSave={m.handleSaveTemplate}
          />

          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            <QaTemplateStepList
              steps={editingTemplate.steps}
              activeStepIndex={activeStepIndex}
              onSelect={m.setActiveStepIndex}
              onAdd={m.handleAddStep}
              onRemove={m.handleRemoveStep}
            />

            {currentStep && (
              <QaTemplateStepEditor
                step={currentStep}
                onChange={(step) => m.handleUpdateStep(activeStepIndex, step)}
                onAddAssertion={() => m.handleAddAssertion(activeStepIndex)}
                onUpdateAssertion={(aIdx, ass) => m.handleUpdateAssertion(activeStepIndex, aIdx, ass)}
                onRemoveAssertion={(aIdx) => m.handleRemoveAssertion(activeStepIndex, aIdx)}
              />
            )}
          </div>
        </div>
      ) : (
        <QaTemplatesGrid
          templates={m.templates}
          onEdit={m.startEditing}
          onDuplicate={m.handleDuplicateTemplate}
          onExport={m.handleExportTemplateJson}
          onDelete={m.handleDeleteTemplate}
          onSelectTemplate={onSelectTemplate}
          onBack={onBack}
        />
      )}

      {/* Modal Guia de Ajuda de Templates */}
      <QaRegressionTemplatesHelpModal
        isOpen={m.isHelpModalOpen}
        onClose={() => m.setIsHelpModalOpen(false)}
      />
    </div>
  );
};
