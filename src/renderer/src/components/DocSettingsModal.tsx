import React, { useState } from 'react';
import {
  DocFolderConfig,
  ConfluenceSourceConfig,
  JiraSourceConfig,
  LlmProviderConfig,
  DocsIndexStatus
} from '../../../shared/types';
import { resolveActiveLlmProvider } from '../utils/llmProviderUtils';
import { useEscapeToClose } from '../hooks/docsettings/useEscapeToClose';
import { useDocSettingsFolderActions } from '../hooks/docsettings/useDocSettingsFolderActions';
import { useAtlassianSourceEditors } from '../hooks/docsettings/useAtlassianSourceEditors';
import { DocSettingsHeader } from './docsettings/DocSettingsHeader';
import { DocSettingsTabs, type DocSettingsTab } from './docsettings/DocSettingsTabs';
import { DocSettingsFooter } from './docsettings/DocSettingsFooter';
import { DocSettingsFoldersTab } from './docsettings/DocSettingsFoldersTab';
import { DocSettingsSourcesTab } from './docsettings/DocSettingsSourcesTab';
import { DocSettingsLlmTab } from './docsettings/DocSettingsLlmTab';
import { Modal } from './ui/Modal';

interface DocSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Status de Indexação e Ajuda
  status?: DocsIndexStatus | null;
  onOpenModelHelp?: () => void;
  // Pastas locais e Git
  docFolders: DocFolderConfig[];
  indexProjectsDocs: boolean;
  autoReindexOnChange: boolean;
  isAddingFolder?: boolean;
  onToggleIndexProjects: (checked: boolean) => Promise<void>;
  onToggleAutoReindex: (checked: boolean) => Promise<void>;
  onAddFolder: () => Promise<void>;
  onRemoveFolder: (path: string) => Promise<void>;
  // Confluence
  confluenceSources: ConfluenceSourceConfig[];
  onSaveConfluenceSource: (source: ConfluenceSourceConfig) => Promise<void>;
  onDeleteConfluenceSource: (id: string) => Promise<void>;
  onToggleConfluenceEnabled: (source: ConfluenceSourceConfig, enabled: boolean) => Promise<void>;
  onTestConfluenceConnection: (source: ConfluenceSourceConfig) => Promise<{ success: boolean; message: string }>;
  // Jira
  jiraSources: JiraSourceConfig[];
  onSaveJiraSource: (source: JiraSourceConfig) => Promise<void>;
  onDeleteJiraSource: (id: string) => Promise<void>;
  onToggleJiraEnabled: (source: JiraSourceConfig, enabled: boolean) => Promise<void>;
  onTestJiraConnection: (source: JiraSourceConfig) => Promise<{ success: boolean; message: string }>;
  // LLM (somente leitura aqui; a edição fica em Configurações → IA & LLM)
  llmProviders: LlmProviderConfig[];
  activeLlmProviderId?: string;
  onOpenAiSettings?: () => void;
}

export const DocSettingsModal: React.FC<DocSettingsModalProps> = (props) => {
  const { isOpen, onClose, docFolders, confluenceSources, jiraSources, llmProviders, activeLlmProviderId } = props;
  const [activeTab, setActiveTab] = useState<DocSettingsTab>('folders');

  const folderActions = useDocSettingsFolderActions();
  const atlassian = useAtlassianSourceEditors(props);
  useEscapeToClose(isOpen, onClose);

  if (!isOpen) return null;

  const activeProvider = resolveActiveLlmProvider(llmProviders, activeLlmProviderId);
  const sourcesCount = confluenceSources.length + jiraSources.length;

  return (
    <Modal
      open
      onClose={onClose}
      bare
      panelClassName="bg-card border border-border rounded-xl shadow-2xl w-full max-w-3xl max-h-[86vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      closeOnBackdrop={false}
      closeOnEscape={false}
    >
      <DocSettingsHeader onClose={onClose} />
      <DocSettingsTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        foldersCount={docFolders.length}
        sourcesCount={sourcesCount}
        activeProvider={activeProvider}
      />

      <div className="p-5 overflow-y-auto space-y-4">
        {activeTab === 'folders' && (
          <DocSettingsFoldersTab
            status={props.status}
            onOpenModelHelp={props.onOpenModelHelp}
            docFolders={docFolders}
            indexProjectsDocs={props.indexProjectsDocs}
            autoReindexOnChange={props.autoReindexOnChange}
            isAddingFolder={props.isAddingFolder ?? false}
            copiedFolderPath={folderActions.copiedFolderPath}
            onToggleIndexProjects={props.onToggleIndexProjects}
            onToggleAutoReindex={props.onToggleAutoReindex}
            onAddFolder={props.onAddFolder}
            onRemoveFolder={props.onRemoveFolder}
            onCopyPath={folderActions.handleCopyFolderPath}
            onOpenInExplorer={folderActions.handleOpenFolderInExplorer}
          />
        )}

        {activeTab === 'sources' && (
          <DocSettingsSourcesTab
            confluenceSources={confluenceSources}
            editingConfluenceSource={atlassian.editingConfluenceSource}
            setEditingConfluenceSource={atlassian.setEditingConfluenceSource}
            isTestingConfluenceId={atlassian.isTestingConfluenceId}
            confluenceTestResults={atlassian.confluenceTestResults}
            onSubmitConfluence={atlassian.handleSaveConfluence}
            onTestConfluence={atlassian.handleTestConfluence}
            onDeleteConfluenceSource={props.onDeleteConfluenceSource}
            onToggleConfluenceEnabled={props.onToggleConfluenceEnabled}
            jiraSources={jiraSources}
            editingJiraSource={atlassian.editingJiraSource}
            setEditingJiraSource={atlassian.setEditingJiraSource}
            isTestingJiraId={atlassian.isTestingJiraId}
            jiraTestResults={atlassian.jiraTestResults}
            onSubmitJira={atlassian.handleSaveJira}
            onTestJira={atlassian.handleTestJira}
            onDeleteJiraSource={props.onDeleteJiraSource}
            onToggleJiraEnabled={props.onToggleJiraEnabled}
          />
        )}

        {activeTab === 'llm' && (
          <DocSettingsLlmTab
            llmProviders={llmProviders}
            activeLlmProviderId={activeLlmProviderId}
            onOpenAiSettings={props.onOpenAiSettings}
          />
        )}
      </div>

      <DocSettingsFooter
        onClose={onClose}
        foldersCount={docFolders.length}
        sourcesCount={sourcesCount}
        activeProvider={activeProvider}
      />
    </Modal>
  );
};
