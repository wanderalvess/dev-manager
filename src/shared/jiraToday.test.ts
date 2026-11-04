import { describe, expect, it } from 'vitest';
import {
  activeSprintId,
  describeJiraError,
  findSprintFieldId,
  lastWorkedFrom,
  mondayOf,
  parseSprintField,
  pickJiraSource,
  sumMyWorklogs,
  toJiraIssue,
  worklogSince,
  type JiraTodayIssue
} from './jiraToday';
import type { JiraSourceConfig } from './types';

const makeSource = (patch: Partial<JiraSourceConfig> = {}): JiraSourceConfig => ({
  id: 's1',
  name: 'Jira',
  baseUrl: 'https://jira.exemplo.com',
  authToken: 'tok',
  enabled: true,
  ...patch
});

const makeIssue = (key: string): JiraTodayIssue => ({ key, summary: key, status: '', statusCategory: '', url: '' });
const me = { name: 'ana', key: 'JIRAUSER1' };

describe('pickJiraSource', () => {
  it('pega a primeira fonte ativa com URL e token', () => {
    const picked = pickJiraSource([makeSource({ id: 'a', enabled: false }), makeSource({ id: 'b', authToken: ' ' }), makeSource({ id: 'c' })]);
    expect(picked?.id).toBe('c');
    expect(pickJiraSource(undefined)).toBeNull();
  });
});

describe('datas da semana', () => {
  it('segunda-feira da semana e desde quando ler worklogs', () => {
    const wed = new Date(2026, 10, 4);
    expect(mondayOf(wed).getDate()).toBe(2);
    expect(worklogSince(wed)).toBe('2026-11-02');
    // Na segunda, "ontem" (domingo) vem antes da segunda-feira
    expect(worklogSince(new Date(2026, 10, 2))).toBe('2026-11-01');
    // No domingo, a semana começou na segunda anterior
    expect(mondayOf(new Date(2026, 10, 8)).getDate()).toBe(2);
  });
});

describe('sprint', () => {
  it('acha o campo Sprint pelo schema', () => {
    expect(findSprintFieldId([{ id: 'summary' }, { id: 'customfield_10020', schema: { custom: 'com.pyxis.greenhopper.jira:gh-sprint' } }])).toBe('customfield_10020');
    expect(findSprintFieldId('x')).toBeNull();
  });

  it('lê a string Java do Jira Server e o formato de objeto', () => {
    const java = 'com.atlassian.greenhopper.service.sprint.Sprint@1a2b[id=123,rapidViewId=4,state=ACTIVE,name=Sprint 42,startDate=2026-10-28]';
    expect(parseSprintField([java])).toEqual([{ id: 123, state: 'ACTIVE', name: 'Sprint 42' }]);
    expect(parseSprintField([{ id: 7, state: 'closed', name: 'S7' }])).toEqual([{ id: 7, state: 'closed', name: 'S7' }]);
    expect(parseSprintField(null)).toEqual([]);
  });

  it('usa a primeira sprint ativa entre as issues', () => {
    const issues = [
      { fields: { cf: ['Sprint@1[id=5,state=CLOSED,name=Velha]'] } },
      { fields: { cf: ['Sprint@1[id=5,state=CLOSED,name=Velha]', 'Sprint@2[id=6,state=ACTIVE,name=Atual]'] } }
    ];
    expect(activeSprintId(issues, 'cf')).toBe(6);
    expect(activeSprintId(issues, null)).toBeNull();
  });
});

describe('worklogs', () => {
  const logs = [
    { author: { name: 'ana' }, started: '2026-11-03T09:00:00.000-0300', timeSpentSeconds: 3600 },
    { author: { name: 'ana' }, started: '2026-11-03T14:00:00.000-0300', timeSpentSeconds: 1200 },
    { author: { name: 'bia' }, started: '2026-11-03T10:00:00.000-0300', timeSpentSeconds: 9999 },
    { author: { key: 'JIRAUSER1' }, started: '2026-11-04T08:00:00.000-0300', timeSpentSeconds: 600 },
    { author: { name: 'ana' }, started: '2026-10-30T08:00:00.000-0300', timeSpentSeconds: 600 }
  ];

  it('soma só os lançamentos da pessoa, por dia, desde a data', () => {
    expect(sumMyWorklogs(logs, me, '2026-11-02')).toEqual({ '2026-11-03': 4800, '2026-11-04': 600 });
  });

  it('acha a issue do último lançamento e o total dela naquele dia', () => {
    const entries = [
      { issue: makeIssue('A-1'), worklogs: logs.slice(0, 3) },
      { issue: makeIssue('A-2'), worklogs: [{ author: { name: 'ana' }, started: '2026-11-03T18:00:00.000-0300', timeSpentSeconds: 900 }] }
    ];
    expect(lastWorkedFrom(entries, me)).toEqual({ issue: makeIssue('A-2'), day: '2026-11-03', seconds: 900 });
    expect(lastWorkedFrom([{ issue: makeIssue('A-3'), worklogs: [logs[2]] }], me)).toBeUndefined();
  });
});

describe('toJiraIssue e erros', () => {
  it('monta o link da issue', () => {
    const issue = toJiraIssue({ key: 'ABC-1', fields: { summary: 'S', status: { name: 'Em andamento', statusCategory: { key: 'indeterminate' } } } }, 'https://jira.x/');
    expect(issue).toMatchObject({ key: 'ABC-1', status: 'Em andamento', statusCategory: 'indeterminate', url: 'https://jira.x/browse/ABC-1' });
  });

  it('descreve erros sem vazar detalhes', () => {
    expect(describeJiraError(new Error('HTTP 401'))).toContain('recusou o token');
    expect(describeJiraError(new Error('HTTP 429'))).toContain('esperar');
    expect(describeJiraError(new Error('This operation was aborted'))).toContain('demorou');
    expect(describeJiraError(new Error('fetch failed'))).toContain('VPN');
  });
});
