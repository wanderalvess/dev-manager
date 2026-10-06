import { useState } from 'react';
import type { QualitySourceConfig, QualitySourceTemplate } from '../../../../shared/types';
import { removeById, upsertById } from '../../utils/settingsListEditors';
import type { SetSettings } from './settingsHookTypes';

type QualityTestResult = { success: boolean; message: string };

/** Valida só os parâmetros preenchidos: nenhuma requisição é feita (a sincronização com a fonte ainda não existe). */
export function validateQualitySourceLocally(source: QualitySourceConfig): QualityTestResult {
  if (!source.baseUrl || !source.baseUrl.startsWith('http')) {
    return { success: false, message: 'URL Base inválida. Deve iniciar com http:// ou https://' };
  }
  if (!source.apiToken && !source.hasApiToken) {
    return { success: false, message: 'Token de autenticação não configurado.' };
  }
  return {
    success: true,
    message: `Parâmetros preenchidos para ${source.type} (${source.projectKey || 'Projeto Geral'}). Validação apenas local: nenhuma requisição foi feita e a sincronização com esta fonte ainda não está implementada.`
  };
}

/** Fontes de teste (Zephyr / Jira / Azure Test Plans): formulário de edição, ativa/habilitada e checagem local. */
export function useQualitySources(setSettings: SetSettings) {
  const [editingQualitySource, setEditingQualitySource] = useState<Partial<QualitySourceConfig> | null>(null);
  const [showQualityToken, setShowQualityToken] = useState(false);
  const [testingQualityId, setTestingQualityId] = useState<string | null>(null);
  const [qualityTestResults, setQualityTestResults] = useState<Record<string, QualityTestResult>>({});

  const handleApplyQualityTemplate = (template: QualitySourceTemplate) => {
    setEditingQualitySource({
      id: editingQualitySource?.id || `quality-${Date.now()}`,
      name: template.name,
      type: template.type,
      baseUrl: template.baseUrl,
      projectKey: template.defaultProjectKey,
      jqlFilter: template.defaultJqlFilter,
      enabled: true
    });
  };

  const handleSaveQualitySource = () => {
    if (!editingQualitySource) return;
    const id = editingQualitySource.id || `quality-${Date.now()}`;
    const source: QualitySourceConfig = {
      id,
      name: editingQualitySource.name?.trim() || 'Nova Fonte de Teste',
      type: editingQualitySource.type || 'zephyr-scale',
      baseUrl: editingQualitySource.baseUrl?.trim() || '',
      projectKey: editingQualitySource.projectKey?.trim() || undefined,
      testPlanKey: editingQualitySource.testPlanKey?.trim() || undefined,
      userEmail: editingQualitySource.userEmail?.trim() || undefined,
      apiToken: editingQualitySource.apiToken?.trim() || '',
      hasApiToken: editingQualitySource.hasApiToken,
      jqlFilter: editingQualitySource.jqlFilter?.trim() || undefined,
      enabled: editingQualitySource.enabled ?? true,
      isDefault: editingQualitySource.isDefault ?? false
    };

    setSettings((prev) => ({
      ...prev,
      qualitySources: upsertById(prev.qualitySources, source),
      activeQualitySourceId: prev.activeQualitySourceId || id
    }));
    setEditingQualitySource(null);
  };

  const handleDeleteQualitySource = (id: string) => {
    setSettings((prev) => {
      const { list, activeId } = removeById(prev.qualitySources, id, prev.activeQualitySourceId);
      return { ...prev, qualitySources: list, activeQualitySourceId: activeId };
    });
  };

  const handleToggleQualitySource = (id: string, enabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      qualitySources: (prev.qualitySources || []).map((s) => (s.id === id ? { ...s, enabled } : s))
    }));
  };

  const handleSetActiveQualitySource = (id: string) => {
    setSettings((prev) => ({ ...prev, activeQualitySourceId: id }));
  };

  const handleTestQualityConnection = (source: QualitySourceConfig) => {
    setTestingQualityId(source.id);
    // Atraso curto só para o indicador de "testando" aparecer: a checagem é local e instantânea
    window.setTimeout(() => {
      setQualityTestResults((prev) => ({ ...prev, [source.id]: validateQualitySourceLocally(source) }));
      setTestingQualityId(null);
    }, 600);
  };

  return {
    editingQualitySource,
    setEditingQualitySource,
    showQualityToken,
    setShowQualityToken,
    testingQualityId,
    qualityTestResults,
    handleApplyQualityTemplate,
    handleSaveQualitySource,
    handleDeleteQualitySource,
    handleToggleQualitySource,
    handleSetActiveQualitySource,
    handleTestQualityConnection
  };
}
