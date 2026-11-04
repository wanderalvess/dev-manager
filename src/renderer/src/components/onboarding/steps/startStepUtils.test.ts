import { describe, expect, it } from 'vitest';
import { MY_ISSUES_JQL, buildJiraSource, normalizeJiraBaseUrl, validateJiraForm } from './startStepUtils';

describe('startStepUtils', () => {
  it('limpa a URL base', () => {
    expect(normalizeJiraBaseUrl(' https://jira.x.com/ ')).toBe('https://jira.x.com');
    expect(normalizeJiraBaseUrl('https://jira.x.com/rest/api/2/')).toBe('https://jira.x.com');
  });

  it('valida o formulário', () => {
    expect(validateJiraForm({ baseUrl: '', token: 't', projectKey: '' })).toContain('URL');
    expect(validateJiraForm({ baseUrl: 'jira.x.com', token: 't', projectKey: '' })).toContain('https://');
    expect(validateJiraForm({ baseUrl: 'https://jira.x.com', token: ' ', projectKey: '' })).toContain('token');
    expect(validateJiraForm({ baseUrl: 'https://jira.x.com', token: 't', projectKey: 'P C' })).toContain('chave');
    expect(validateJiraForm({ baseUrl: 'https://jira.x.com', token: 't', projectKey: 'pcv' })).toBeNull();
  });

  it('monta a fonte: com projeto indexa o projeto, sem projeto só as issues da pessoa', () => {
    expect(buildJiraSource({ baseUrl: 'https://jira.x.com/', token: ' t ', projectKey: 'pcv' }, 'id1')).toEqual({
      id: 'id1',
      name: 'Jira PCV',
      baseUrl: 'https://jira.x.com',
      authToken: 't',
      projectKey: 'PCV',
      jql: undefined,
      enabled: true
    });
    const mine = buildJiraSource({ baseUrl: 'https://jira.x.com', token: 't', projectKey: '' }, 'id2');
    expect(mine).toMatchObject({ name: 'Jira', projectKey: undefined, jql: MY_ISSUES_JQL });
  });
});
