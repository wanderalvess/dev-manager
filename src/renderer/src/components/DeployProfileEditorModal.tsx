import React from 'react';
import { DeployProfile, GitProjectInfo } from '../../../shared/types';
import { useDeployProfileEditor } from '../hooks/deployeditor/useDeployProfileEditor';
import { DeployEditorHeader } from './deployeditor/DeployEditorHeader';
import { DeployEditorBasicInfo } from './deployeditor/DeployEditorBasicInfo';
import { DeployStepList } from './deployeditor/DeployStepList';
import { DeployStepEditor } from './deployeditor/DeployStepEditor';
import { DeployEditorFooter } from './deployeditor/DeployEditorFooter';
import { Modal } from './ui/Modal';

interface DeployProfileEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: DeployProfile | null;
  projects: GitProjectInfo[];
  onSave: (savedProfile: DeployProfile) => Promise<void>;
  onDelete?: (profileId: string) => Promise<void>;
}

export const DeployProfileEditorModal: React.FC<DeployProfileEditorModalProps> = ({
  isOpen,
  onClose,
  profile,
  projects,
  onSave,
  onDelete
}) => {
  const editor = useDeployProfileEditor({ profile, isOpen, onSave, onClose });

  if (!isOpen) return null;

  return (
    <Modal
      open
      onClose={onClose}
      bare
      panelClassName="bg-card border border-border rounded-xl shadow-2xl w-full max-w-[96vw] xl:max-w-[1540px] h-[93vh] flex flex-col overflow-hidden"
      closeOnBackdrop={false}
      closeOnEscape={false}
    >
      <DeployEditorHeader isEditing={!!profile} onClose={onClose} />

      <DeployEditorBasicInfo
        name={editor.name}
        description={editor.description}
        onNameChange={editor.setName}
        onDescriptionChange={editor.setDescription}
      />

      {/* Corpo: Lista de Etapas à esquerda + Editor da Etapa selecionada à direita */}
      <div className="flex-1 flex overflow-hidden">
        <DeployStepList
          steps={editor.steps}
          editingStepIndex={editor.editingStepIndex}
          onSelect={editor.setEditingStepIndex}
          onAdd={() => editor.addStep('command')}
          onMove={editor.moveStep}
          onDuplicate={editor.duplicateStep}
          onRemove={editor.removeStep}
        />

        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-background">
          <DeployStepEditor
            step={editor.editingStep}
            stepIndex={editor.editingStepIndex}
            projects={projects}
            suggestProjectPath={editor.suggestProjectPath}
            onSuggestProjectPathChange={editor.setSuggestProjectPath}
            isSuggesting={editor.isSuggesting}
            onSuggestFromPom={editor.suggestFromPom}
            onUpdate={editor.updateCurrentStep}
            onSelectDirectory={editor.selectDirectory}
          />
        </div>
      </div>

      <DeployEditorFooter
        profile={profile}
        isSaving={editor.isSaving}
        onClose={onClose}
        onSave={editor.save}
        onDelete={onDelete}
      />
    </Modal>
  );
};
