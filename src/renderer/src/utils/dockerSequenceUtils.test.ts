import { describe, expect, it } from 'vitest';
import type { ContainerEnvironment, DockerContainerInfo } from '../../../shared/types';
import {
  addRecentFile,
  buildDefaultWinThorSequence,
  buildLogFileName,
  buildStartSlots,
  findDefaultWinThorEnvironment,
  getSelectedContainerNames
} from './dockerSequenceUtils';

const makeContainer = (id: string, names: string): DockerContainerInfo =>
  ({ id, names, state: 'running' }) as unknown as DockerContainerInfo;

const makeEnv = (overrides: Partial<ContainerEnvironment>): ContainerEnvironment =>
  ({ id: 'e1', name: 'Env', containers: [], ...overrides }) as unknown as ContainerEnvironment;

describe('buildStartSlots', () => {
  it('usa delays do ambiente para nomes em string e delay do objeto', () => {
    const env = makeEnv({
      containers: ['a', { name: 'b', delay: 5 }, { name: 'c' }] as any,
      delays: { a: 10 } as any
    });
    expect(buildStartSlots(env)).toEqual([{ name: 'a', delay: 10 }, { name: 'b', delay: 5 }, { name: 'c' }]);
  });

  it('retorna vazio sem containers', () => {
    expect(buildStartSlots(makeEnv({}))).toEqual([]);
  });
});

describe('findDefaultWinThorEnvironment', () => {
  it('encontra por winthor ou dev, ignorando caixa', () => {
    const envs = [makeEnv({ name: 'Outro' }), makeEnv({ id: 'e2', name: 'WinThor Dev' })];
    expect(findDefaultWinThorEnvironment(envs)?.id).toBe('e2');
    expect(findDefaultWinThorEnvironment([makeEnv({ name: 'x' })])).toBeUndefined();
  });
});

describe('buildDefaultWinThorSequence', () => {
  it('usa nomes de fallback quando nada existe', () => {
    expect(buildDefaultWinThorSequence([])).toEqual([
      { name: 'oracle-winthor', delay: 45 },
      { name: 'linux-winthor', delay: 15 }
    ]);
  });

  it('usa nomes reais e inclui wsh quando presente', () => {
    const seq = buildDefaultWinThorSequence([
      makeContainer('1', '/my-oracle'),
      makeContainer('2', '/wta-x'),
      makeContainer('3', '/wsh-y')
    ]);
    expect(seq).toEqual([{ name: 'my-oracle', delay: 45 }, { name: 'wta-x', delay: 15 }, { name: 'wsh-y' }]);
  });
});

describe('getSelectedContainerNames', () => {
  it('retorna nomes limpos apenas dos selecionados', () => {
    const list = [makeContainer('1', '/a'), makeContainer('2', '/b ')];
    expect(getSelectedContainerNames(list, new Set(['2']))).toEqual(['b']);
  });
});

describe('buildLogFileName', () => {
  it('compõe nome com data ISO', () => {
    expect(buildLogFileName('/web', new Date('2026-03-04T10:00:00Z'))).toBe('web-2026-03-04.log');
  });
});

describe('addRecentFile', () => {
  it('move duplicata para o topo e limita a 5', () => {
    expect(addRecentFile(['a', 'b', 'c'], 'b')).toEqual(['b', 'a', 'c']);
    expect(addRecentFile(['1', '2', '3', '4', '5'], '6')).toEqual(['6', '1', '2', '3', '4']);
  });
});
