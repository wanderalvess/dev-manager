import { useEffect, useState } from 'react';
import type { AutomationProfile, AutomationStep, AutomationStepType } from '../../../../shared/types';
import { showToast } from '../../components/ToastHost';
import {
  applyStepUpdate,
  createDefaultProfileSteps,
  createProfileEditorStep,
  isStepIncomplete,
  normalizeStepForSave
} from '../../utils/profileEditorSteps';
import { useStepListEditor } from '../useStepListEditor';

interface UseProfileEditorStateParams {
  isOpen: boolean;
  onClose: () => void;
  profile: AutomationProfile | null;
  onSave: (savedProfile: AutomationProfile) => Promise<void>;
  onExport?: (profile: AutomationProfile) => void;
}

export function useProfileEditorState({
  isOpen,
  onClose,
  profile,
  onSave,
  onExport
}: UseProfileEditorStateParams) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const {
    steps,
    editingStep,
    editingStepIndex,
    setEditingStepIndex,
    reset,
    addStep,
    removeStep: handleRemoveStep,
    moveStep: handleMoveStep,
    updateCurrentStep
  } = useStepListEditor<AutomationStep>();

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setDescription(profile.description || '');
      reset(
        profile.steps ? structuredClone(profile.steps) : [],
        profile.steps && profile.steps.length > 0 ? 0 : null
      );
    } else {
      setName('Novo Perfil de Ambiente');
      setDescription('Descrição das automações e serviços');
      reset(createDefaultProfileSteps(), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, isOpen]);

  const handleAddStep = (type: AutomationStepType = 'command') => addStep(createProfileEditorStep(type));

  const handleUpdateCurrentStep = (fields: Partial<AutomationStep>) =>
    updateCurrentStep((step) => applyStepUpdate(step, fields));

  const handleSelectDirectory = async () => {
    if (window.electronAPI && window.electronAPI.selectDirectory) {
      const selected = await window.electronAPI.selectDirectory(editingStep?.cwd);
      if (selected) {
        handleUpdateCurrentStep({ cwd: selected });
      }
    }
  };

  const handleSelectFile = async () => {
    if (window.electronAPI && window.electronAPI.selectFile) {
      const selected = await window.electronAPI.selectFile({
        filters: [
          { name: 'Scripts e Bat (*.bat, *.cmd)', extensions: ['bat', 'cmd'] },
          { name: 'Todos os arquivos (*.*)', extensions: ['*'] }
        ]
      });
      if (selected) {
        handleUpdateCurrentStep({ command: selected });
      }
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showToast('Por favor, informe um nome para o perfil.', 'info');
      return;
    }

    const incompleteSteps = steps.filter(isStepIncomplete);
    if (incompleteSteps.length > 0) {
      const nomes = incompleteSteps.map((s) => s.name || 'Sem nome').join(', ');
      showToast(
        `As seguintes etapas de "Executar SQL" estão incompletas (falta conexão de banco e/ou SQL): ${nomes}. Preencha-as antes de salvar.`,
        'error'
      );
      return;
    }

    setIsSaving(true);
    try {
      const savedProfile: AutomationProfile = {
        id: profile?.id || `profile-${Date.now()}`,
        name: name.trim(),
        description: description.trim(),
        steps: steps.map(normalizeStepForSave),
        isDefault: profile?.isDefault ?? false
      };
      await onSave(savedProfile);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    if (!name.trim()) {
      showToast('Por favor, informe ao menos um nome para o perfil antes de exportar.', 'info');
      return;
    }
    if (onExport) {
      onExport({
        id: profile?.id || `profile-${Date.now()}`,
        name: name.trim(),
        description: description.trim(),
        steps: steps,
        isDefault: profile?.isDefault ?? false
      });
    }
  };

  return {
    name,
    setName,
    description,
    setDescription,
    steps,
    editingStep,
    editingStepIndex,
    setEditingStepIndex,
    isSaving,
    handleAddStep,
    handleRemoveStep,
    handleMoveStep,
    handleUpdateCurrentStep,
    handleSelectDirectory,
    handleSelectFile,
    handleSave,
    handleExport
  };
}
