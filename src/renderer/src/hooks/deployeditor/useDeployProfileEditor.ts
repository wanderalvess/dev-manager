import { useEffect, useState } from 'react';
import { showToast } from '../../components/ToastHost';
import type {
  DeployProfile,
  DeployStep,
  DeployStepType
} from '../../../../shared/types';
import {
  buildInitialEditorState,
  createDeployStep,
  duplicateStepAt,
  generateStepId,
  moveTargetIndex,
  patchStepAt,
  removeStepAt,
  selectionAfterMove,
  selectionAfterRemove,
  swapSteps
} from '../../utils/deployEditorUtils';

interface UseDeployProfileEditorParams {
  profile: DeployProfile | null;
  isOpen: boolean;
  onSave: (savedProfile: DeployProfile) => Promise<void>;
  onClose: () => void;
}

export type DeployDirectoryField = 'projectPath' | 'cwd' | 'dockerContextPath';

export function useDeployProfileEditor({
  profile,
  isOpen,
  onSave,
  onClose
}: UseDeployProfileEditorParams) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<DeployStep[]>([]);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [suggestProjectPath, setSuggestProjectPath] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);

  useEffect(() => {
    const initial = buildInitialEditorState(profile, Date.now());
    setName(initial.name);
    setDescription(initial.description);
    setSteps(initial.steps);
    setEditingStepIndex(initial.editingStepIndex);
    setSuggestProjectPath('');
  }, [profile, isOpen]);

  const editingStep = editingStepIndex !== null ? steps[editingStepIndex] : null;

  const addStep = (type: DeployStepType = 'command') => {
    setSteps((prev) => [...prev, createDeployStep(type, generateStepId())]);
    setEditingStepIndex(steps.length);
  };

  const removeStep = (index: number) => {
    setSteps((prev) => removeStepAt(prev, index));
    setEditingStepIndex(selectionAfterRemove(editingStepIndex, index));
  };

  const duplicateStep = (index: number) => {
    const next = duplicateStepAt(steps, index, generateStepId());
    if (!next) return;
    setSteps(next);
    setEditingStepIndex(index + 1);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const target = moveTargetIndex(index, direction, steps.length);
    if (target === null) return;
    setSteps((prev) => swapSteps(prev, index, target));
    setEditingStepIndex(selectionAfterMove(editingStepIndex, index, target));
  };

  const updateCurrentStep = (fields: Partial<DeployStep>) => {
    if (editingStepIndex === null || !steps[editingStepIndex]) return;
    setSteps((prev) => patchStepAt(prev, editingStepIndex, fields));
  };

  const selectDirectory = async (field: DeployDirectoryField) => {
    if (window.electronAPI && window.electronAPI.selectDirectory) {
      const current = editingStep?.[field];
      const selected = await window.electronAPI.selectDirectory(current);
      if (selected) {
        updateCurrentStep({ [field]: selected } as Partial<DeployStep>);
      }
    }
  };

  const suggestFromPom = async (target: 'repo' | 'install') => {
    if (!window.electronAPI || !window.electronAPI.parsePom || !suggestProjectPath) return;
    setIsSuggesting(true);
    try {
      const pomInfo = await window.electronAPI.parsePom(suggestProjectPath);
      if (pomInfo) {
        const suggestion =
          target === 'repo' ? pomInfo.suggestedRepoCommand : pomInfo.suggestedInstallCommand;
        if (suggestion) {
          updateCurrentStep({ command: suggestion });
        }
      }
    } finally {
      setIsSuggesting(false);
    }
  };

  const save = async () => {
    if (!name.trim()) {
      showToast('Por favor, informe um nome para o perfil.', 'info');
      return;
    }

    setIsSaving(true);
    try {
      const savedProfile: DeployProfile = {
        id: profile?.id || `deploy-profile-${Date.now()}`,
        name: name.trim(),
        description: description.trim(),
        steps
      };
      await onSave(savedProfile);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return {
    name,
    setName,
    description,
    setDescription,
    steps,
    editingStepIndex,
    setEditingStepIndex,
    editingStep,
    isSaving,
    suggestProjectPath,
    setSuggestProjectPath,
    isSuggesting,
    addStep,
    removeStep,
    duplicateStep,
    moveStep,
    updateCurrentStep,
    selectDirectory,
    suggestFromPom,
    save
  };
}
