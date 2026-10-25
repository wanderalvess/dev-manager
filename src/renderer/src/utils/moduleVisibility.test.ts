import { describe, expect, it } from 'vitest';
import { APP_MODULE_IDS } from '../../../shared/appModules';
import { NAV_THEME_GROUPS } from '../components/header/headerNavConfig';
import { TOUR_STEPS } from '../components/onboarding/tourSteps';
import { filterMountedTabs, filterNavGroups, filterTourSteps, resolveFallbackTab, toggleModule } from './moduleVisibility';

const allButOne = (keep: string) => APP_MODULE_IDS.filter((id) => id !== keep);

describe('APP_MODULE_IDS', () => {
  it('bate com as páginas do Header, na mesma ordem', () => {
    expect(NAV_THEME_GROUPS.flatMap((group) => group.items.map((item) => item.id))).toEqual([...APP_MODULE_IDS]);
  });
});

describe('filterNavGroups', () => {
  it('sem módulos desligados mantém todos os grupos e páginas', () => {
    expect(filterNavGroups(NAV_THEME_GROUPS, [])).toEqual(NAV_THEME_GROUPS);
  });

  it('remove as páginas desligadas e o grupo que fica vazio', () => {
    const groups = filterNavGroups(NAV_THEME_GROUPS, ['database', 'db-backups', 'routines', 'apm']);
    expect(groups.map((g) => g.id)).toEqual(['infra', 'dev', 'qa']);
    expect(groups[0].items.map((i) => i.id)).toEqual(['env', 'containers', 'winthor', 'deploy', 'karaf', 'logs']);
  });

  it('não altera os grupos originais', () => {
    filterNavGroups(NAV_THEME_GROUPS, ['env']);
    expect(NAV_THEME_GROUPS[0].items[0].id).toBe('env');
  });
});

describe('resolveFallbackTab', () => {
  it('mantém a aba quando ela continua ligada ou não é módulo', () => {
    expect(resolveFallbackTab('git', ['env'])).toBe('git');
    expect(resolveFallbackTab('settings', allButOne('quality'))).toBe('settings');
    expect(resolveFallbackTab('help', allButOne('quality'))).toBe('help');
  });

  it('leva para a primeira página ligada quando a atual foi desligada', () => {
    expect(resolveFallbackTab('env', ['env'])).toBe('containers');
    expect(resolveFallbackTab('apm', ['env', 'containers', 'winthor', 'deploy', 'karaf', 'logs', 'apm'])).toBe('database');
    expect(resolveFallbackTab('env', allButOne('quality-taut'))).toBe('quality-taut');
  });
});

describe('filterTourSteps', () => {
  it('tira do tour global os passos dos grupos ocultos', () => {
    const groups = filterNavGroups(NAV_THEME_GROUPS, ['quality', 'quality-regression', 'quality-runners', 'quality-taut']);
    const targets = filterTourSteps(TOUR_STEPS, groups).map((s) => s.target);
    expect(targets).not.toContain('nav-qa');
    expect(targets).toContain('nav-infra');
    expect(targets).toContain(null);
    expect(targets).toContain('settings');
    expect(targets).toContain('nav-integrations');
  });
});

describe('filterMountedTabs', () => {
  it('desmonta páginas desligadas, mantendo Ajuda e Configurações', () => {
    const mounted = filterMountedTabs(new Set(['env', 'apm', 'help', 'settings']), ['apm']);
    expect([...mounted]).toEqual(['env', 'help', 'settings']);
  });

  it('devolve o mesmo Set quando nada está desligado', () => {
    const visited = new Set(['env']);
    expect(filterMountedTabs(visited, [])).toBe(visited);
  });
});

describe('toggleModule', () => {
  it('liga e desliga páginas', () => {
    expect(toggleModule([], 'apm', false)).toEqual(['apm']);
    expect(toggleModule(['apm', 'git'], 'apm', true)).toEqual(['git']);
  });

  it('não deixa desligar a última página ligada', () => {
    const disabled = allButOne('docs');
    expect(toggleModule(disabled, 'docs', false)).toEqual(disabled);
  });

  it('ignora ids que não são módulos', () => {
    expect(toggleModule([], 'settings', false)).toEqual([]);
  });
});
