import type {
  DocFolderConfig,
  ConfluenceSourceConfig,
  JiraSourceConfig
} from '../../../shared/types';

export function getFolderDisplayTitle(folder: DocFolderConfig): string {
  if (folder.label && folder.label.trim()) return folder.label.trim();
  const normalized = folder.path.replace(/\\/g, '/').replace(/\/+$/, '');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[parts.length - 2]} / ${parts[parts.length - 1]}`;
  }
  return parts[parts.length - 1] || folder.path;
}

/** Retorna null quando faltam campos obrigatórios (nome, URL ou token). */
export function buildConfluenceSource(
  draft: Partial<ConfluenceSourceConfig> | null
): ConfluenceSourceConfig | null {
  if (!draft?.name || !draft?.baseUrl || !draft?.authToken) return null;
  return {
    id: draft.id || `confluence_${Date.now()}`,
    name: draft.name.trim(),
    baseUrl: draft.baseUrl.trim(),
    spaceKey: draft.spaceKey?.trim() || undefined,
    authToken: draft.authToken.trim(),
    authEmail: draft.authEmail?.trim() || undefined,
    enabled: draft.enabled !== undefined ? draft.enabled : true
  };
}

export function buildJiraSource(draft: Partial<JiraSourceConfig> | null): JiraSourceConfig | null {
  if (!draft?.name || !draft?.baseUrl || !draft?.authToken) return null;
  return {
    id: draft.id || `jira_${Date.now()}`,
    name: draft.name.trim(),
    baseUrl: draft.baseUrl.trim(),
    projectKey: draft.projectKey?.trim() || undefined,
    jql: draft.jql?.trim() || undefined,
    authToken: draft.authToken.trim(),
    enabled: draft.enabled !== undefined ? draft.enabled : true
  };
}
