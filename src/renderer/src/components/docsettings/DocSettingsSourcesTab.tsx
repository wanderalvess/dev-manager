import React from 'react';
import type { ConfluenceSourceConfig, JiraSourceConfig } from '../../../../shared/types';
import { DocSettingsConfluenceSection } from './DocSettingsConfluenceSection';
import { DocSettingsJiraSection } from './DocSettingsJiraSection';

type TestResults = Record<string, { success: boolean; message: string }>;

interface DocSettingsSourcesTabProps {
  confluenceSources: ConfluenceSourceConfig[];
  editingConfluenceSource: Partial<ConfluenceSourceConfig> | null;
  setEditingConfluenceSource: (value: Partial<ConfluenceSourceConfig> | null) => void;
  isTestingConfluenceId: string | null;
  confluenceTestResults: TestResults;
  onSubmitConfluence: (e: React.FormEvent) => void;
  onTestConfluence: (source: ConfluenceSourceConfig) => void;
  onDeleteConfluenceSource: (id: string) => Promise<void>;
  onToggleConfluenceEnabled: (source: ConfluenceSourceConfig, enabled: boolean) => Promise<void>;
  jiraSources: JiraSourceConfig[];
  editingJiraSource: Partial<JiraSourceConfig> | null;
  setEditingJiraSource: (value: Partial<JiraSourceConfig> | null) => void;
  isTestingJiraId: string | null;
  jiraTestResults: TestResults;
  onSubmitJira: (e: React.FormEvent) => void;
  onTestJira: (source: JiraSourceConfig) => void;
  onDeleteJiraSource: (id: string) => Promise<void>;
  onToggleJiraEnabled: (source: JiraSourceConfig, enabled: boolean) => Promise<void>;
}

export const DocSettingsSourcesTab: React.FC<DocSettingsSourcesTabProps> = (p) => (
  <div className="space-y-4">
    <DocSettingsConfluenceSection
      sources={p.confluenceSources}
      editing={p.editingConfluenceSource}
      setEditing={p.setEditingConfluenceSource}
      testingId={p.isTestingConfluenceId}
      testResults={p.confluenceTestResults}
      onSubmit={p.onSubmitConfluence}
      onTest={p.onTestConfluence}
      onDelete={p.onDeleteConfluenceSource}
      onToggleEnabled={p.onToggleConfluenceEnabled}
    />
    <DocSettingsJiraSection
      sources={p.jiraSources}
      editing={p.editingJiraSource}
      setEditing={p.setEditingJiraSource}
      testingId={p.isTestingJiraId}
      testResults={p.jiraTestResults}
      onSubmit={p.onSubmitJira}
      onTest={p.onTestJira}
      onDelete={p.onDeleteJiraSource}
      onToggleEnabled={p.onToggleJiraEnabled}
    />
  </div>
);
