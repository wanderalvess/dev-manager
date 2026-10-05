import React, { useState } from 'react';
import type { ConfluenceSourceConfig, JiraSourceConfig } from '../../../../shared/types';
import { buildConfluenceSource, buildJiraSource } from '../../utils/docSettingsUtils';

type TestResult = { success: boolean; message: string };

interface Params {
  onSaveConfluenceSource: (source: ConfluenceSourceConfig) => Promise<void>;
  onTestConfluenceConnection: (source: ConfluenceSourceConfig) => Promise<TestResult>;
  onSaveJiraSource: (source: JiraSourceConfig) => Promise<void>;
  onTestJiraConnection: (source: JiraSourceConfig) => Promise<TestResult>;
}

export function useAtlassianSourceEditors({
  onSaveConfluenceSource,
  onTestConfluenceConnection,
  onSaveJiraSource,
  onTestJiraConnection
}: Params) {
  const [editingConfluenceSource, setEditingConfluenceSource] = useState<Partial<ConfluenceSourceConfig> | null>(null);
  const [isTestingConfluenceId, setIsTestingConfluenceId] = useState<string | null>(null);
  const [confluenceTestResults, setConfluenceTestResults] = useState<Record<string, TestResult>>({});

  const [editingJiraSource, setEditingJiraSource] = useState<Partial<JiraSourceConfig> | null>(null);
  const [isTestingJiraId, setIsTestingJiraId] = useState<string | null>(null);
  const [jiraTestResults, setJiraTestResults] = useState<Record<string, TestResult>>({});

  const handleSaveConfluence = async (e: React.FormEvent) => {
    e.preventDefault();
    const sourceToSave = buildConfluenceSource(editingConfluenceSource);
    if (!sourceToSave) return;
    await onSaveConfluenceSource(sourceToSave);
    setEditingConfluenceSource(null);
  };

  const handleTestConfluence = async (source: ConfluenceSourceConfig) => {
    setIsTestingConfluenceId(source.id);
    try {
      const res = await onTestConfluenceConnection(source);
      setConfluenceTestResults((prev) => ({ ...prev, [source.id]: res }));
    } catch (err: any) {
      setConfluenceTestResults((prev) => ({
        ...prev,
        [source.id]: { success: false, message: err?.message || 'Falha ao testar conexão.' }
      }));
    } finally {
      setIsTestingConfluenceId(null);
    }
  };

  const handleSaveJira = async (e: React.FormEvent) => {
    e.preventDefault();
    const sourceToSave = buildJiraSource(editingJiraSource);
    if (!sourceToSave) return;
    await onSaveJiraSource(sourceToSave);
    setEditingJiraSource(null);
  };

  const handleTestJira = async (source: JiraSourceConfig) => {
    setIsTestingJiraId(source.id);
    try {
      const res = await onTestJiraConnection(source);
      setJiraTestResults((prev) => ({ ...prev, [source.id]: res }));
    } catch (err: any) {
      setJiraTestResults((prev) => ({
        ...prev,
        [source.id]: { success: false, message: err?.message || 'Falha ao testar conexão.' }
      }));
    } finally {
      setIsTestingJiraId(null);
    }
  };

  return {
    editingConfluenceSource,
    setEditingConfluenceSource,
    isTestingConfluenceId,
    confluenceTestResults,
    handleSaveConfluence,
    handleTestConfluence,
    editingJiraSource,
    setEditingJiraSource,
    isTestingJiraId,
    jiraTestResults,
    handleSaveJira,
    handleTestJira
  };
}
