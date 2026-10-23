import { describe, it, expect, vi } from 'vitest';
import type { GitProjectInfo, RoutineItem } from '../../../shared/types';
import { buildQuickLauncherItems, applyQuickLauncherMatch } from './quickLauncherItems';
import { buildQuickLauncherActions } from './quickLauncherActions';

const routine = (partial: Partial<RoutineItem>): RoutineItem => ({
  id: '801',
  name: 'Pedido',
  module: 'Vendas',
  fullPath: 'C:\\r\\801.exe',
  sizeMb: '1 MB',
  isFavorite: false,
  ...partial
});

const project = (partial: Partial<GitProjectInfo>): GitProjectInfo =>
  ({ name: 'api', path: 'C:\\api', currentBranch: 'main', branches: [], isAzure: false, ...partial }) as GitProjectInfo;

const setup = () => {
  const handlers = { onNavigate: vi.fn(), onRefreshAll: vi.fn(), onClose: vi.fn() };
  const launchRoutine = vi.fn().mockResolvedValue(undefined);
  return { handlers, launchRoutine };
};

describe('buildQuickLauncherActions', () => {
  it('mantém os atalhos Alt+N alinhados com App/Header', () => {
    const { handlers } = setup();
    const badges = Object.fromEntries(
      buildQuickLauncherActions(handlers).map((a) => [a.id, a.badge])
    );
    expect(badges).toMatchObject({
      'act-env': 'Alt+1',
      'act-database': 'Alt+2',
      'act-containers': 'Alt+3',
      'act-deploy': 'Alt+4',
      'act-git': 'Alt+5',
      'act-routines': 'Alt+6',
      'act-docs': 'Alt+7',
      'act-logs': 'Alt+8',
      'act-apm': 'Alt+0',
      'act-quality': 'Alt+Q',
      'act-http-client': 'Alt+9',
      'act-help': 'Alt+H'
    });
    expect(badges['act-settings']).toBeUndefined();
    expect(badges['act-refresh']).toBeUndefined();
  });

  it('navega e fecha ao selecionar uma ação', () => {
    const { handlers } = setup();
    buildQuickLauncherActions(handlers)[0].onSelect();
    expect(handlers.onNavigate).toHaveBeenCalledWith('env');
    expect(handlers.onClose).toHaveBeenCalled();
  });
});

describe('buildQuickLauncherItems', () => {
  it('sem busca: ações, rotinas e repositórios na ordem original', () => {
    const { handlers, launchRoutine } = setup();
    const items = buildQuickLauncherItems({
      ...handlers,
      launchRoutine,
      search: '  ',
      routines: [routine({})],
      projects: [project({ uncommittedCount: 2 })]
    });
    expect(items).toHaveLength(22);
    expect(items[20].id).toBe('rt-801');
    expect(items[21].id).toBe('repo-api');
    expect(items[21].subtitle).toBe('Branch: main (2 mods)');
  });

  it('filtra por busca e ordena por score decrescente', () => {
    const { handlers, launchRoutine } = setup();
    const items = buildQuickLauncherItems({
      ...handlers,
      launchRoutine,
      search: 'deploy',
      routines: [],
      projects: []
    });
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThan(14);
    const scores = items.map((i) => i.score ?? 0);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it('rotina lança o executável e fecha', async () => {
    const { handlers, launchRoutine } = setup();
    const items = buildQuickLauncherItems({
      ...handlers,
      launchRoutine,
      search: '',
      routines: [routine({ isFavorite: true })],
      projects: []
    });
    const rt = items.find((i) => i.id === 'rt-801')!;
    expect(rt.isFavorite).toBe(true);
    await rt.onSelect();
    expect(launchRoutine).toHaveBeenCalledWith('C:\\r\\801.exe');
    expect(handlers.onClose).toHaveBeenCalled();
  });

  it('esconde páginas desligadas e, com Rotinas/Git desligados, as rotinas e os repositórios', () => {
    const { handlers, launchRoutine } = setup();
    const ids = buildQuickLauncherItems({
      ...handlers,
      launchRoutine,
      search: '',
      routines: [routine({})],
      projects: [project({})],
      disabledModules: ['apm', 'routines', 'git']
    }).map((i) => i.id);
    expect(ids).not.toContain('act-apm');
    expect(ids).not.toContain('act-routines');
    expect(ids).not.toContain('act-git');
    expect(ids).not.toContain('rt-801');
    expect(ids).not.toContain('repo-api');
    expect(ids).toContain('act-env');
    expect(ids).toContain('act-help');
    expect(ids).toContain('act-settings');
  });
});

describe('applyQuickLauncherMatch', () => {
  it('retorna o item intacto sem query e null quando não casa', () => {
    const { handlers } = setup();
    const item = buildQuickLauncherActions(handlers)[0];
    expect(applyQuickLauncherMatch('', item)).toBe(item);
    expect(applyQuickLauncherMatch('zzzzqqqq', item)).toBeNull();
  });
});
