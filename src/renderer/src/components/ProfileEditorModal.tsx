import React from 'react';
import { AutomationProfile } from '../../../shared/types';
import { useProfileEditorSettings } from '../hooks/profileeditor/useProfileEditorSettings';
import { useProfileEditorState } from '../hooks/profileeditor/useProfileEditorState';
import { ProfileEditorHeader } from './profileeditor/ProfileEditorHeader';
import { ProfileEditorBasicInfo } from './profileeditor/ProfileEditorBasicInfo';
import { ProfileEditorStepList } from './profileeditor/ProfileEditorStepList';
import { ProfileEditorStepDetails } from './profileeditor/ProfileEditorStepDetails';
import { ProfileEditorFooter } from './profileeditor/ProfileEditorFooter';

interface ProfileEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: AutomationProfile | null;
  onSave: (savedProfile: AutomationProfile) => Promise<void>;
  onDelete?: (profileId: string) => Promise<void>;
  onExport?: (profile: AutomationProfile) => void;
}

export const ProfileEditorModal: React.FC<ProfileEditorModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSave,
  onDelete,
  onExport
}) => {
  const { dbConnections, globalDebugPort } = useProfileEditorSettings(isOpen);
  const editor = useProfileEditorState({ isOpen, onClose, profile, onSave, onExport });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        <ProfileEditorHeader isEditing={!!profile} onClose={onClose} />

        <ProfileEditorBasicInfo
          name={editor.name}
          description={editor.description}
          onNameChange={editor.setName}
          onDescriptionChange={editor.setDescription}
        />

        <div className="flex-1 flex overflow-hidden">
          <ProfileEditorStepList
            steps={editor.steps}
            editingStepIndex={editor.editingStepIndex}
            globalDebugPort={globalDebugPort}
            onSelect={editor.setEditingStepIndex}
            onAdd={editor.handleAddStep}
            onMove={editor.handleMoveStep}
            onRemove={editor.handleRemoveStep}
          />
          <ProfileEditorStepDetails
            step={editor.editingStep}
            stepIndex={editor.editingStepIndex}
            dbConnections={dbConnections}
            globalDebugPort={globalDebugPort}
            onUpdate={editor.handleUpdateCurrentStep}
            onSelectFile={editor.handleSelectFile}
            onSelectDirectory={editor.handleSelectDirectory}
          />
        </div>

        <ProfileEditorFooter
          profileId={profile?.id}
          profileName={profile?.name}
          isSaving={editor.isSaving}
          onClose={onClose}
          onSave={editor.handleSave}
          onDelete={onDelete}
          onExport={onExport ? editor.handleExport : undefined}
        />
      </div>
    </div>
  );
};
