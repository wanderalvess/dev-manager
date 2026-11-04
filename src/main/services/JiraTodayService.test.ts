import { describe, expect, it, vi } from 'vitest';
import { JiraTodayService } from './JiraTodayService';
import type { AppSettings, JiraSourceConfig } from '../../shared/types';

const source: JiraSourceConfig = { id: 's1', name: 'Jira', baseUrl: 'https://jira.exemplo.com', authToken: 'segredo', enabled: true };
const settings = (jiraSources: JiraSourceConfig[] = [source]) => () => ({ jiraSources }) as unknown as AppSettings;
const json = (body: unknown, ok = true, status = 200) => ({ ok, status, json: async () => body }) as unknown as Response;
const sprintValue = ['Sprint@1[id=9,state=ACTIVE,name=Sprint 9]'];

function routes(): typeof fetch {
  return vi.fn(async (url: string) => {
    const u = decodeURIComponent(String(url));
    if (u.endsWith('/myself')) return json({ name: 'ana', key: 'K1' });
    if (u.endsWith('/field')) return json([{ id: 'cf_s', schema: { custom: 'com.pyxis.greenhopper.jira:gh-sprint' } }]);
    if (u.includes('/sprint/9')) return json({ name: 'Sprint 9', endDate: '2026-11-08T18:00:00.000Z' });
    if (u.includes('statusCategory = Done')) return json({ total: 12, issues: [] });
    if (u.includes('jql=sprint = 9')) return json({ total: 20, issues: [] });
    if (u.includes('"In Progress"')) return json({ issues: [{ key: 'A-1', fields: { summary: 'Fazer X', cf_s: sprintValue, status: { name: 'Em andamento' } } }] });
    if (u.includes('duedate <=')) return json({ issues: [{ key: 'A-2', fields: { summary: 'Prazo', duedate: '2026-11-04' } }] });
    if (u.includes('worklogAuthor')) {
      return json({
        issues: [
          {
            key: 'A-1',
            fields: { summary: 'Fazer X', worklog: { total: 1, worklogs: [{ author: { name: 'ana' }, started: '2026-11-03T09:00:00.000-0300', timeSpentSeconds: 7200 }] } }
          }
        ]
      });
    }
    return json({}, false, 404);
  }) as unknown as typeof fetch;
}

describe('JiraTodayService', () => {
  const wednesday = () => new Date(2026, 10, 4, 9);

  it('sem fonte Jira ativa, avisa que não está configurado e não chama a rede', async () => {
    const fetchImpl = vi.fn();
    const r = await new JiraTodayService(settings([{ ...source, enabled: false }]), fetchImpl as unknown as typeof fetch).getToday();
    expect(r).toMatchObject({ success: false, configured: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('junta em andamento, prazos, onde parei, horas da semana e a sprint', async () => {
    const r = await new JiraTodayService(settings(), routes(), wednesday).getToday();
    expect(r.success).toBe(true);
    expect(r.inProgress.map((i) => i.key)).toEqual(['A-1']);
    expect(r.dueSoon.map((i) => i.key)).toEqual(['A-2']);
    expect(r.lastWorked).toMatchObject({ issue: { key: 'A-1' }, day: '2026-11-03', seconds: 7200 });
    expect(r.secondsByDay).toEqual({ '2026-11-03': 7200 });
    expect(r.weekSeconds).toBe(7200);
    expect(r.sprint).toEqual({ name: 'Sprint 9', endDate: '2026-11-08T18:00:00.000Z', done: 12, total: 20 });
  });

  it('manda o token só no cabeçalho e guarda a resposta por alguns minutos', async () => {
    const fetchImpl = routes();
    const service = new JiraTodayService(settings(), fetchImpl, wednesday);
    await service.getToday();
    const calls = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.every(([url]) => !String(url).includes('segredo'))).toBe(true);
    expect(calls[0][1].headers.Authorization).toBe('Bearer segredo');
    const count = calls.length;
    await service.getToday();
    expect(calls.length).toBe(count);
    await service.getToday(true);
    expect(calls.length).toBeGreaterThan(count);
  });

  it('token recusado vira mensagem legível', async () => {
    const r = await new JiraTodayService(settings(), (async () => json({}, false, 401)) as unknown as typeof fetch).getToday();
    expect(r).toMatchObject({ success: false, configured: true });
    expect(r.error).toContain('recusou o token');
  });

  it('sprint que falha não derruba o resto', async () => {
    const base = routes();
    const fetchImpl = (async (url: string, init?: RequestInit) =>
      String(url).includes('/sprint/9') ? json({}, false, 500) : base(url, init)) as unknown as typeof fetch;
    const r = await new JiraTodayService(settings(), fetchImpl, wednesday).getToday();
    expect(r.success).toBe(true);
    expect(r.sprint).toBeUndefined();
  });
});
