import { describe, expect, it } from 'vitest';
import { GUIDE_BOOT, GUIDE_HUB_TASKS, GUIDE_LOCATIONS, GUIDE_PROBLEMS, GUIDE_PROJECTS, GUIDE_VERSIONS } from './infrDockerGuideData';

describe('guia Ambientes WinThor no Docker', () => {
  it('as portas do guia são as que o Hub sugere', () => {
    expect(GUIDE_VERSIONS.find((v) => v.version === '39')).toMatchObject({ oracle: 1539, web: 8039, ssh: 8139, jmx: 1039, jms: 61639, wsh: 9039 });
  });

  it('a ordem de subida é banco, WTA, primeiro acesso, WSH', () => {
    expect(GUIDE_BOOT.map((s) => s.title)).toEqual(['Banco', 'WTA', 'Primeiro acesso ao WTA', 'WSH']);
  });

  it('nenhuma linha das tabelas fica vazia', () => {
    const cells = [
      ...GUIDE_PROJECTS.flatMap((p) => [p.name, p.what, p.why, p.container]),
      ...GUIDE_HUB_TASKS.flatMap((t) => [t.task, t.manual, t.hub]),
      ...GUIDE_PROBLEMS.flatMap((p) => [p.symptom, p.cause, p.fix]),
      ...GUIDE_LOCATIONS.flatMap((l) => [l.what, l.where])
    ];
    expect(cells.every((c) => c.trim().length > 0)).toBe(true);
    expect(GUIDE_LOCATIONS.filter((l) => l.url).every((l) => l.url!.startsWith('https://'))).toBe(true);
  });
});
