import { describe, expect, it } from 'vitest';
import { emptyJiraToday, type JiraTodayIssue } from '../../../../../shared/jiraToday';
import type { InfrEnvironment } from '../../../../../shared/infrWinthorVersion';
import { formatHours, heroSummary, relativeDay, sprintDaysLeft, sprintLeftLabel, weekBars, weekShortcuts } from './startHomeUtils';

const wed = new Date(2026, 10, 4, 9);
const issue = (key: string): JiraTodayIssue => ({ key, summary: key, status: '', statusCategory: '', url: '' });
const env = (running: boolean) => ({ name: 'e', wta: { state: running ? 'running' : 'exited' } }) as unknown as InfrEnvironment;

describe('formatHours', () => {
  it('formata horas e minutos', () => {
    expect(formatHours(0)).toBe('0 h');
    expect(formatHours(45 * 60)).toBe('45 min');
    expect(formatHours(2 * 3600)).toBe('2 h');
    expect(formatHours(3 * 3600 + 5 * 60)).toBe('3 h 05');
  });
});

describe('relativeDay e sprint', () => {
  it('diz hoje, ontem ou o dia da semana', () => {
    expect(relativeDay('2026-11-04', wed)).toBe('hoje');
    expect(relativeDay('2026-11-03', wed)).toBe('ontem');
    expect(relativeDay('2026-11-02', wed)).toBe('seg');
  });

  it('conta os dias até o fim da sprint', () => {
    expect(sprintDaysLeft('2026-11-08T18:00:00', wed)).toBe(4);
    expect(sprintDaysLeft(undefined, wed)).toBeNull();
    expect(sprintLeftLabel(0)).toBe('termina hoje');
    expect(sprintLeftLabel(1)).toBe('falta 1 dia');
    expect(sprintLeftLabel(4)).toBe('faltam 4 dias');
  });
});

describe('weekBars', () => {
  it('com o Jira, mostra as horas de segunda a domingo', () => {
    const jira = emptyJiraToday({ success: true, configured: true, secondsByDay: { '2026-11-02': 3600, '2026-11-03': 7200 } });
    const { bars, unit } = weekBars(wed, jira, null);
    expect(unit).toBe('hours');
    expect(bars.map((b) => b.label)).toEqual(['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']);
    expect(bars.map((b) => b.percent).slice(0, 3)).toEqual([50, 100, 0]);
    expect(bars[2]).toMatchObject({ today: true, future: false });
    expect(bars[3].future).toBe(true);
  });

  it('sem o Jira, soma as automações do Hub por dia', () => {
    const days = { '2026-11-04': { a: { runs: 3 }, b: { runs: 1 } } } as never;
    const { bars, unit } = weekBars(wed, null, days);
    expect(unit).toBe('runs');
    expect(bars[2].value).toBe(4);
  });
});

describe('weekShortcuts', () => {
  const summary = (byModule: { module: string; runs: number }[]) => ({ byModule }) as never;

  it('usa os módulos mais usados, sem os desligados e sem os que não têm aba', () => {
    const r = weekShortcuts(
      summary([
        { module: 'git', runs: 3 },
        { module: 'deploy', runs: 9 },
        { module: 'system', runs: 50 },
        { module: 'database', runs: 5 },
        { module: 'qa', runs: 0 }
      ]),
      ['database']
    );
    expect(r.suggested).toBe(false);
    expect(r.items).toEqual([
      { tab: 'deploy', label: 'Deploy', runs: 9 },
      { tab: 'git', label: 'Git & Azure DevOps', runs: 3 }
    ]);
  });

  it('sem uso na semana, sugere os módulos do dia a dia', () => {
    const r = weekShortcuts(null, ['deploy']);
    expect(r.suggested).toBe(true);
    expect(r.items.map((i) => i.tab)).toEqual(['env', 'database', 'git']);
  });
});

describe('heroSummary', () => {
  it('junta Jira, sprint e ambientes numa frase', () => {
    const jira = emptyJiraToday({
      success: true,
      configured: true,
      inProgress: [issue('A-1'), issue('A-2')],
      dueSoon: [issue('A-3')],
      sprint: { name: 'S', endDate: '2026-11-08T18:00:00', done: 1, total: 2 }
    });
    expect(heroSummary(jira, [env(true), env(false)], wed)).toBe('2 issues em andamento, 1 com prazo até hoje, a sprint termina em 4 dias, 1 ambiente no ar.');
  });

  it('sem dados, fica vazia', () => {
    expect(heroSummary(null, null, wed)).toBe('');
    expect(heroSummary(emptyJiraToday(), [], wed)).toBe('');
  });
});
