import React from 'react';
import { Check } from 'lucide-react';
import type { LlmProviderConfig, LlmTestResult } from '../../../../shared/types';
import type { ProviderPreset } from '../../utils/docSettingsPresets';
import { DocSettingsLlmProviderList } from './DocSettingsLlmProviderList';
import { DocSettingsLlmProviderForm } from './DocSettingsLlmProviderForm';

interface DocSettingsLlmTabProps {
  llmProviders: LlmProviderConfig[];
  activeLlmProviderId?: string;
  editingLlmProvider: Partial<LlmProviderConfig> | null;
  setEditingLlmProvider: (value: Partial<LlmProviderConfig> | null) => void;
  showApiKey: boolean;
  setShowApiKey: (value: boolean) => void;
  isTestingLlm: boolean;
  llmTestResult: LlmTestResult | null;
  llmSaveSuccess: boolean;
  onStartNew: () => void;
  onSelectPreset: (preset: ProviderPreset) => void;
  onSubmit: (e: React.FormEvent) => void;
  onTest: () => void;
  onDeleteLlmProvider: (id: string) => Promise<void>;
  onSetActiveLlmProvider: (id: string) => Promise<void>;
}

export const DocSettingsLlmTab: React.FC<DocSettingsLlmTabProps> = (p) => (
  <div className="space-y-4">
    <DocSettingsLlmProviderList
      llmProviders={p.llmProviders}
      activeLlmProviderId={p.activeLlmProviderId}
      isEditing={!!p.editingLlmProvider}
      onStartNew={p.onStartNew}
      onEdit={p.setEditingLlmProvider}
      onDelete={p.onDeleteLlmProvider}
      onSetActive={p.onSetActiveLlmProvider}
    />

    {p.llmSaveSuccess && (
      <div className="p-3 rounded-xl bg-success/10 border border-success/30 text-success text-xs flex items-center gap-2">
        <Check className="w-4 h-4 text-success shrink-0" />
        <span>Configuração do modelo de IA salva com sucesso!</span>
      </div>
    )}

    {p.editingLlmProvider && (
      <DocSettingsLlmProviderForm
        editing={p.editingLlmProvider}
        setEditing={p.setEditingLlmProvider}
        showApiKey={p.showApiKey}
        setShowApiKey={p.setShowApiKey}
        isTesting={p.isTestingLlm}
        testResult={p.llmTestResult}
        onSelectPreset={p.onSelectPreset}
        onSubmit={p.onSubmit}
        onTest={p.onTest}
      />
    )}
  </div>
);
