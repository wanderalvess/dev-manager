import { useState } from 'react';
import type { LlmProviderConfig, LlmProviderType, LlmTestResult } from '../../../../shared/types';
import { removeById, upsertById } from '../../utils/settingsListEditors';
import type { SetSettings } from './settingsHookTypes';

/** Provedores de IA (BYOK): formulário de edição, ativo/habilitado e teste de conexão. */
export function useLlmProviders(setSettings: SetSettings) {
  const [editingLlmProvider, setEditingLlmProvider] = useState<Partial<LlmProviderConfig> | null>(null);
  const [isTestingLlmId, setIsTestingLlmId] = useState<string | null>(null);
  const [llmTestResults, setLlmTestResults] = useState<Record<string, LlmTestResult>>({});
  const [showLlmFormKey, setShowLlmFormKey] = useState(false);

  const handleApplyLlmTemplate = (template: Omit<LlmProviderConfig, 'id'>) => {
    setEditingLlmProvider({ ...template, id: editingLlmProvider?.id || `llm-${Date.now()}` });
  };

  const handleSaveLlmProvider = () => {
    if (!editingLlmProvider) return;
    const providerType: LlmProviderType = editingLlmProvider.provider || 'openai';
    const id = editingLlmProvider.id || `llm-${Date.now()}`;
    const provider: LlmProviderConfig = {
      id,
      name: editingLlmProvider.name?.trim() || 'Provedor Personalizado',
      provider: providerType,
      apiKey: editingLlmProvider.apiKey?.trim() || '',
      baseUrl: editingLlmProvider.baseUrl?.trim() || undefined,
      model: editingLlmProvider.model?.trim() || 'gpt-4o-mini',
      temperature: editingLlmProvider.temperature ?? 0.7,
      maxTokens: editingLlmProvider.maxTokens ?? 2048,
      timeoutMs: editingLlmProvider.timeoutMs ?? 30000,
      enabled: editingLlmProvider.enabled ?? true,
      isDefault: editingLlmProvider.isDefault ?? false
    };

    setSettings((prev) => ({
      ...prev,
      llmProviders: upsertById(prev.llmProviders, provider),
      activeLlmProviderId: prev.activeLlmProviderId || id
    }));
    setEditingLlmProvider(null);
  };

  const handleDeleteLlmProvider = (id: string) => {
    setSettings((prev) => {
      const { list, activeId } = removeById(prev.llmProviders, id, prev.activeLlmProviderId);
      return { ...prev, llmProviders: list, activeLlmProviderId: activeId };
    });
  };

  const handleToggleLlmProvider = (id: string, enabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      llmProviders: (prev.llmProviders || []).map((p) => (p.id === id ? { ...p, enabled } : p))
    }));
  };

  const handleSetActiveLlmProvider = (id: string) => {
    setSettings((prev) => ({ ...prev, activeLlmProviderId: id }));
  };

  const handleTestLlmConnection = async (provider: LlmProviderConfig) => {
    setIsTestingLlmId(provider.id);
    try {
      const tester = window.electronAPI?.testLlmConnection;
      if (!tester) throw new Error('API não disponível no ambiente atual.');
      const result = await tester(provider);
      setLlmTestResults((prev) => ({ ...prev, [provider.id]: result }));
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setLlmTestResults((prev) => ({ ...prev, [provider.id]: { success: false, message: message || 'Falha ao testar conexão' } }));
    } finally {
      setIsTestingLlmId(null);
    }
  };

  return {
    editingLlmProvider,
    setEditingLlmProvider,
    isTestingLlmId,
    llmTestResults,
    showLlmFormKey,
    setShowLlmFormKey,
    handleApplyLlmTemplate,
    handleSaveLlmProvider,
    handleDeleteLlmProvider,
    handleToggleLlmProvider,
    handleSetActiveLlmProvider,
    handleTestLlmConnection
  };
}
