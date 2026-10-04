import { useCallback, useState } from 'react';
import type {
  ConfluenceSourceConfig,
  DocFolderConfig,
  DocSyncTargetConfig,
  JiraSourceConfig,
  LlmProviderConfig
} from '../../../../shared/types';
import { deriveDocFolderLabel, upsertById } from '../../utils/docsFileMeta';

/** Configurações persistidas da página de documentação (pastas, fontes, destinos e LLM). */
export function useDocsSettings() {
  const [docFolders, setDocFolders] = useState<DocFolderConfig[]>([]);
  const [indexProjectsDocs, setIndexProjectsDocs] = useState<boolean>(false);
  const [autoReindexOnChange, setAutoReindexOnChange] = useState<boolean>(false);
  const [isAddingFolder, setIsAddingFolder] = useState<boolean>(false);
  const [syncTargets, setSyncTargets] = useState<DocSyncTargetConfig[]>([]);
  const [confluenceSources, setConfluenceSources] = useState<ConfluenceSourceConfig[]>([]);
  const [jiraSources, setJiraSources] = useState<JiraSourceConfig[]>([]);
  const [llmProviders, setLlmProviders] = useState<LlmProviderConfig[]>([]);
  const [activeLlmProviderId, setActiveLlmProviderId] = useState<string | undefined>(undefined);

  const loadDocSettings = useCallback(async () => {
    if (window.electronAPI) {
      const settings = await window.electronAPI.getSettings();
      setDocFolders(settings.docFolders || []);
      setIndexProjectsDocs(Boolean(settings.indexProjectsDocs));
      setAutoReindexOnChange(Boolean(settings.autoReindexOnChange));
      setSyncTargets(settings.docSyncTargets || []);
      setConfluenceSources(settings.confluenceSources || []);
      setJiraSources(settings.jiraSources || []);
      setLlmProviders(settings.llmProviders || []);
      setActiveLlmProviderId(settings.activeLlmProviderId);
    }
  }, []);

  const handleToggleIndexProjects = async (checked: boolean) => {
    setIndexProjectsDocs(checked);
    if (window.electronAPI) {
      await window.electronAPI.saveSettings({ indexProjectsDocs: checked });
    }
  };

  const handleToggleAutoReindex = async (checked: boolean) => {
    setAutoReindexOnChange(checked);
    if (window.electronAPI) {
      await window.electronAPI.saveSettings({ autoReindexOnChange: checked });
    }
  };

  const handleAddFolder = async () => {
    if (!window.electronAPI?.selectDirectory) return;
    const selected = await window.electronAPI.selectDirectory();
    if (!selected) return;
    if (docFolders.some((f) => f.path === selected)) return;
    setIsAddingFolder(true);
    try {
      const updated = [...docFolders, { path: selected, label: deriveDocFolderLabel(selected) }];
      await window.electronAPI.saveSettings({ docFolders: updated });
      setDocFolders(updated);
    } finally {
      setIsAddingFolder(false);
    }
  };

  const handleRemoveFolder = async (path: string) => {
    const updated = docFolders.filter((f) => f.path !== path);
    await window.electronAPI?.saveSettings({ docFolders: updated });
    setDocFolders(updated);
  };

  const handleSaveConfluenceSource = async (source: ConfluenceSourceConfig) => {
    const updated = upsertById(confluenceSources, source);
    setConfluenceSources(updated);
    await window.electronAPI?.saveSettings({ confluenceSources: updated });
  };

  const handleDeleteConfluenceSource = async (id: string) => {
    const updated = confluenceSources.filter((s) => s.id !== id);
    setConfluenceSources(updated);
    await window.electronAPI?.saveSettings({ confluenceSources: updated });
  };

  const handleToggleConfluenceEnabled = async (source: ConfluenceSourceConfig, enabled: boolean) => {
    const updated = confluenceSources.map((s) => (s.id === source.id ? { ...s, enabled } : s));
    setConfluenceSources(updated);
    await window.electronAPI?.saveSettings({ confluenceSources: updated });
  };

  const handleTestConfluenceConnection = async (source: ConfluenceSourceConfig) => {
    const tester = window.electronAPI?.testConfluenceConnection;
    if (!tester) {
      return { success: false, message: 'API não disponível.' };
    }
    return await tester(source);
  };

  const handleSaveJiraSource = async (source: JiraSourceConfig) => {
    const updated = upsertById(jiraSources, source);
    setJiraSources(updated);
    await window.electronAPI?.saveSettings({ jiraSources: updated });
  };

  const handleDeleteJiraSource = async (id: string) => {
    const updated = jiraSources.filter((s) => s.id !== id);
    setJiraSources(updated);
    await window.electronAPI?.saveSettings({ jiraSources: updated });
  };

  const handleToggleJiraEnabled = async (source: JiraSourceConfig, enabled: boolean) => {
    const updated = jiraSources.map((s) => (s.id === source.id ? { ...s, enabled } : s));
    setJiraSources(updated);
    await window.electronAPI?.saveSettings({ jiraSources: updated });
  };

  const handleTestJiraConnection = async (source: JiraSourceConfig) => {
    const tester = window.electronAPI?.testJiraConnection;
    if (!tester) {
      return { success: false, message: 'API não disponível.' };
    }
    return await tester(source);
  };

  const handleSaveLlmProvider = async (provider: LlmProviderConfig) => {
    const updated = upsertById(llmProviders, provider);
    const newActiveId = activeLlmProviderId || provider.id;
    setLlmProviders(updated);
    setActiveLlmProviderId(newActiveId);
    await window.electronAPI?.saveSettings({ llmProviders: updated, activeLlmProviderId: newActiveId });
  };

  const handleDeleteLlmProvider = async (id: string) => {
    const updated = llmProviders.filter((p) => p.id !== id);
    const newActiveId = activeLlmProviderId === id ? updated[0]?.id : activeLlmProviderId;
    setLlmProviders(updated);
    setActiveLlmProviderId(newActiveId);
    await window.electronAPI?.saveSettings({ llmProviders: updated, activeLlmProviderId: newActiveId });
  };

  const handleSetActiveLlmProvider = async (id: string) => {
    setActiveLlmProviderId(id);
    await window.electronAPI?.saveSettings({ activeLlmProviderId: id });
  };

  const handleTestLlmConnection = async (provider: LlmProviderConfig) => {
    const tester = window.electronAPI?.testLlmConnection;
    if (tester) {
      return await tester(provider);
    }
    return { success: false, message: 'API não disponível.' };
  };

  return {
    docFolders,
    indexProjectsDocs,
    autoReindexOnChange,
    isAddingFolder,
    syncTargets,
    setSyncTargets,
    confluenceSources,
    jiraSources,
    llmProviders,
    activeLlmProviderId,
    loadDocSettings,
    handleToggleIndexProjects,
    handleToggleAutoReindex,
    handleAddFolder,
    handleRemoveFolder,
    handleSaveConfluenceSource,
    handleDeleteConfluenceSource,
    handleToggleConfluenceEnabled,
    handleTestConfluenceConnection,
    handleSaveJiraSource,
    handleDeleteJiraSource,
    handleToggleJiraEnabled,
    handleTestJiraConnection,
    handleSaveLlmProvider,
    handleDeleteLlmProvider,
    handleSetActiveLlmProvider,
    handleTestLlmConnection
  };
}
