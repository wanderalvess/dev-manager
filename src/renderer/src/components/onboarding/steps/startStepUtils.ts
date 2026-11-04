// Etapa Tela de início do onboarding: montar a fonte Jira a partir do formulário, sem React.
import type { JiraSourceConfig } from '../../../../../shared/types';

/** Sem chave de projeto, a busca de documentação lê só as issues da pessoa, e não o Jira inteiro. */
export const MY_ISSUES_JQL = 'assignee = currentUser() ORDER BY updated DESC';

export interface JiraFormInput {
  baseUrl: string;
  token: string;
  projectKey: string;
}

/** URL base sem barra no fim e sem o sufixo /rest/... colado da documentação da API. */
export function normalizeJiraBaseUrl(url: string): string {
  return url.trim().replace(/\/rest(\/.*)?$/i, '').replace(/\/+$/, '');
}

/** Mensagem do primeiro problema do formulário, ou null quando dá para testar/salvar. */
export function validateJiraForm(input: JiraFormInput): string | null {
  const url = normalizeJiraBaseUrl(input.baseUrl);
  if (!url) return 'Informe a URL do Jira.';
  if (!/^https?:\/\/[^\s/]+/i.test(url)) return 'A URL precisa começar com https:// (ex.: https://jira.suaempresa.com).';
  if (!input.token.trim()) return 'Informe o token pessoal (PAT) do Jira.';
  if (input.projectKey.trim() && !/^[A-Z][A-Z0-9_]*$/i.test(input.projectKey.trim())) return 'A chave do projeto tem só letras, números e _ (ex.: PCV).';
  return null;
}

export function buildJiraSource(input: JiraFormInput, id: string): JiraSourceConfig {
  const projectKey = input.projectKey.trim().toUpperCase();
  return {
    id,
    name: projectKey ? `Jira ${projectKey}` : 'Jira',
    baseUrl: normalizeJiraBaseUrl(input.baseUrl),
    authToken: input.token.trim(),
    projectKey: projectKey || undefined,
    jql: projectKey ? undefined : MY_ISSUES_JQL,
    enabled: true
  };
}
