import React, { useState, useEffect, useCallback } from 'react';
import type {
  QaRegressionAssertion,
  QaRegressionStep,
  QaRegressionTemplate
} from '../../../../../shared/types';
import { api } from '../../../services/apiBridge';
import { showToast } from '../../../components/ToastHost';
import { requestConfirm } from '../../../components/ui/confirmService';
import {
  exportTemplateAsJsonFile,
  exportTemplatesBundleAsJsonFile
} from '../../../utils/qaTemplateExportUtils';
import {
  clampActiveIndex,
  createBlankTemplate,
  createNewAssertion,
  createNewStep,
  duplicateTemplate,
  isValidImportedTemplate,
  replaceAssertionAt,
  replaceStepAt
} from '../../../utils/qaTemplatesManagerUtils';

export function useQaTemplatesManager() {
  const [templates, setTemplates] = useState<QaRegressionTemplate[]>([]);
  const [templatesDir, setTemplatesDir] = useState<string>('');
  const [editingTemplate, setEditingTemplate] = useState<QaRegressionTemplate | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);

  const loadTemplates = useCallback(async () => {
    try {
      if (api?.qaListTemplates) {
        const list = await api.qaListTemplates();
        setTemplates(list);
      }
      if (api?.qaGetTemplatesDir) {
        const dir = await api.qaGetTemplatesDir();
        setTemplatesDir(dir);
      }
    } catch (err: any) {
      console.warn('Erro ao carregar templates:', err);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const startEditing = (tmpl: QaRegressionTemplate) => {
    setEditingTemplate(tmpl);
    setActiveStepIndex(0);
  };

  const handleCreateNewTemplate = () => startEditing(createBlankTemplate());

  const handleDuplicateTemplate = (tmpl: QaRegressionTemplate) =>
    startEditing(duplicateTemplate(tmpl));

  const handleDeleteTemplate = async (tmpl: QaRegressionTemplate) => {
    const confirmed = await requestConfirm({
      title: 'Excluir template?',
      message: `Deseja realmente excluir o template "${tmpl.name}"?`,
      confirmLabel: 'Excluir',
      tone: 'danger'
    });
    if (!confirmed) return;

    try {
      if (api?.qaDeleteTemplate) {
        const ok = await api.qaDeleteTemplate(tmpl.id);
        if (ok) {
          showToast(`Template "${tmpl.name}" removido com sucesso.`, 'info');
          loadTemplates();
          if (editingTemplate?.id === tmpl.id) setEditingTemplate(null);
        }
      }
    } catch (err: any) {
      showToast(`Falha ao excluir template: ${err.message}`, 'error');
    }
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    if (!editingTemplate.name.trim()) {
      showToast('Informe um nome para o template.', 'info');
      return;
    }

    try {
      if (api?.qaSaveTemplate) {
        await api.qaSaveTemplate(editingTemplate);
        showToast('Template salvo com sucesso na pasta dedicada!', 'success');
        loadTemplates();
        setEditingTemplate(null);
      }
    } catch (err: any) {
      showToast(`Falha ao salvar template: ${err.message}`, 'error');
    }
  };

  const handleExportTemplateJson = (tmpl: QaRegressionTemplate) => {
    exportTemplateAsJsonFile(tmpl);
    showToast(`Template "${tmpl.name}" exportado com sucesso!`, 'success');
  };

  const handleExportAllTemplates = () => {
    if (templates.length === 0) {
      showToast('Nenhum template disponível para exportação.', 'info');
      return;
    }
    exportTemplatesBundleAsJsonFile(templates);
    showToast(`${templates.length} templates exportados com sucesso em lote!`, 'success');
  };

  const handleImportTemplateJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text) as QaRegressionTemplate;
        if (!isValidImportedTemplate(parsed)) {
          showToast('Arquivo JSON de template inválido ou incompatível.', 'error');
          return;
        }
        if (api?.qaSaveTemplate) {
          await api.qaSaveTemplate(parsed);
          showToast(`Template "${parsed.name}" importado com sucesso!`, 'success');
          loadTemplates();
        }
      } catch (err: any) {
        showToast(`Erro ao importar template JSON: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleAddStep = () => {
    if (!editingTemplate) return;
    const newStep: QaRegressionStep = createNewStep(editingTemplate.steps.length);
    setEditingTemplate({
      ...editingTemplate,
      steps: [...editingTemplate.steps, newStep]
    });
    setActiveStepIndex(editingTemplate.steps.length);
  };

  const handleRemoveStep = (idx: number) => {
    if (!editingTemplate) return;
    const updated = editingTemplate.steps.filter((_, i) => i !== idx);
    setEditingTemplate({ ...editingTemplate, steps: updated });
    if (activeStepIndex >= updated.length) {
      setActiveStepIndex(clampActiveIndex(activeStepIndex, updated.length));
    }
  };

  const handleUpdateStep = (stepIndex: number, step: QaRegressionStep) => {
    if (!editingTemplate) return;
    setEditingTemplate(replaceStepAt(editingTemplate, stepIndex, step));
  };

  const handleAddAssertion = (stepIndex: number) => {
    if (!editingTemplate) return;
    const targetStep = editingTemplate.steps[stepIndex];
    if (!targetStep) return;

    const newAss: QaRegressionAssertion = createNewAssertion();
    handleUpdateStep(stepIndex, {
      ...targetStep,
      assertions: [...targetStep.assertions, newAss]
    });
  };

  const handleRemoveAssertion = (stepIndex: number, assIndex: number) => {
    if (!editingTemplate) return;
    const targetStep = editingTemplate.steps[stepIndex];
    if (!targetStep) return;

    handleUpdateStep(stepIndex, {
      ...targetStep,
      assertions: targetStep.assertions.filter((_, i) => i !== assIndex)
    });
  };

  const handleUpdateAssertion = (
    stepIndex: number,
    assIndex: number,
    assertion: QaRegressionAssertion
  ) => {
    if (!editingTemplate) return;
    setEditingTemplate(replaceAssertionAt(editingTemplate, stepIndex, assIndex, assertion));
  };

  return {
    templates,
    templatesDir,
    editingTemplate,
    setEditingTemplate,
    activeStepIndex,
    setActiveStepIndex,
    isHelpModalOpen,
    setIsHelpModalOpen,
    startEditing,
    handleCreateNewTemplate,
    handleDuplicateTemplate,
    handleDeleteTemplate,
    handleSaveTemplate,
    handleExportTemplateJson,
    handleExportAllTemplates,
    handleImportTemplateJson,
    handleAddStep,
    handleRemoveStep,
    handleUpdateStep,
    handleAddAssertion,
    handleRemoveAssertion,
    handleUpdateAssertion
  };
}
