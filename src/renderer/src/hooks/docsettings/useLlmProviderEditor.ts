import React, { useState } from 'react';
import type { LlmProviderConfig, LlmTestResult } from '../../../../shared/types';
import type { ProviderPreset } from '../../utils/docSettingsPresets';
import {
  applyProviderPreset,
  createNewLlmDraft,
  buildLlmProvider,
  buildLlmTestConfig
} from '../../utils/docSettingsUtils';

interface Params {
  onSaveLlmProvider: (provider: LlmProviderConfig) => Promise<void>;
  onTestLlmConnection: (provider: LlmProviderConfig) => Promise<LlmTestResult>;
}

export function useLlmProviderEditor({ onSaveLlmProvider, onTestLlmConnection }: Params) {
  const [editingLlmProvider, setEditingLlmProvider] = useState<Partial<LlmProviderConfig> | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingLlm, setIsTestingLlm] = useState(false);
  const [llmTestResult, setLlmTestResult] = useState<LlmTestResult | null>(null);
  const [llmSaveSuccess, setLlmSaveSuccess] = useState(false);

  const handleSelectPreset = (preset: ProviderPreset) => {
    setEditingLlmProvider((prev) => applyProviderPreset(prev, preset));
    setLlmTestResult(null);
  };

  const handleStartNewLlmProvider = () => {
    setEditingLlmProvider(createNewLlmDraft());
    setLlmTestResult(null);
  };

  const handleSaveLlm = async (e: React.FormEvent) => {
    e.preventDefault();
    const providerToSave = buildLlmProvider(editingLlmProvider);
    if (!providerToSave) return;

    await onSaveLlmProvider(providerToSave);
    setLlmSaveSuccess(true);
    setTimeout(() => setLlmSaveSuccess(false), 3000);
    setEditingLlmProvider(null);
  };

  const handleTestLlm = async () => {
    if (!editingLlmProvider) return;
    setIsTestingLlm(true);
    setLlmTestResult(null);
    try {
      const result = await onTestLlmConnection(buildLlmTestConfig(editingLlmProvider));
      setLlmTestResult(result);
    } catch (err: any) {
      setLlmTestResult({
        success: false,
        message: `Falha na requisição de teste: ${err?.message || err}`
      });
    } finally {
      setIsTestingLlm(false);
    }
  };

  return {
    editingLlmProvider,
    setEditingLlmProvider,
    showApiKey,
    setShowApiKey,
    isTestingLlm,
    llmTestResult,
    llmSaveSuccess,
    handleSelectPreset,
    handleStartNewLlmProvider,
    handleSaveLlm,
    handleTestLlm
  };
}
