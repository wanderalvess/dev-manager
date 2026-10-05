import { describe, expect, it } from 'vitest';
import type { RoutineItem } from '../../../shared/types';
import {
  buildKarafOfflineStatus,
  buildMappedProgramFromPath,
  buildModuleOptions,
  filterRoutines,
  getLaunchFeedbackTitle,
  getRoutineExtension,
  renameMappedProgram,
  splitFavorites,
  toggleRoutineFavorite
} from './routinesPageUtils';

const mk = (id: string, name: string, module: string, isFavorite = false): RoutineItem =>
  ({ id, name, module, isFavorite, fullPath: `C:\\${name}`, sizeMb: '1 MB' }) as unknown as RoutineItem;

const items = [mk('1', '501.exe', 'VENDAS', true), mk('2', '502.exe', 'ESTOQUE'), mk('3', '503.exe', 'VENDAS')];

describe('routinesPageUtils', () => {
  it('lista módulos únicos com TODOS primeiro', () => {
    expect(buildModuleOptions(items)).toEqual(['TODOS', 'VENDAS', 'ESTOQUE']);
  });

  it('filtra por busca (nome/módulo) e módulo', () => {
    expect(filterRoutines(items, '502', 'TODOS')).toHaveLength(1);
    expect(filterRoutines(items, 'vend', 'TODOS')).toHaveLength(2);
    expect(filterRoutines(items, '', 'ESTOQUE')).toHaveLength(1);
  });

  it('separa favoritas das demais', () => {
    const { favoriteRoutines, otherRoutines } = splitFavorites(items);
    expect(favoriteRoutines.map((r) => r.id)).toEqual(['1']);
    expect(otherRoutines.map((r) => r.id)).toEqual(['2', '3']);
  });

  it('alterna favorito sem mutar a lista original', () => {
    const next = toggleRoutineFavorite(items, '2');
    expect(next[1].isFavorite).toBe(true);
    expect(items[1].isFavorite).toBe(false);
  });

  it('renomeia programa mapeado', () => {
    const out = renameMappedProgram([{ id: 'a', name: 'x', fullPath: 'p' }], 'a', 'novo');
    expect(out[0].name).toBe('novo');
  });

  it('monta programa mapeado a partir do caminho', () => {
    expect(buildMappedProgramFromPath('C:\\tools\\app.v2.exe', 7)).toEqual({
      id: 'mp-7',
      name: 'app.v2',
      fullPath: 'C:\\tools\\app.v2.exe'
    });
  });

  it('extrai extensão em maiúsculas', () => {
    expect(getRoutineExtension('x.exe')).toBe('EXE');
  });

  it('gera título do feedback conforme a causa', () => {
    expect(getLaunchFeedbackTitle({ id: '1', karafOffline: true })).toContain('Apache Karaf');
    expect(getLaunchFeedbackTitle({ id: '1', authFailed: true })).toContain('Falha de Autenticação');
    expect(getLaunchFeedbackTitle({ id: '1' })).toBe('Falha ao abrir rotina (1)');
  });

  it('gera status offline preservando wtaUrl anterior', () => {
    expect(buildKarafOfflineStatus({ online: true, wtaUrl: 'http://x', message: '' }, 'm')).toEqual({
      online: false,
      wtaUrl: 'http://x',
      message: 'm'
    });
    expect(buildKarafOfflineStatus(null).wtaUrl).toBe('http://localhost:8889');
  });
});
