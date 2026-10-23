import { describe, expect, it } from 'vitest';
import type { GitProjectInfo } from '../../shared/types';
import { collectUnpushedCounts, type ProjectGitRunner } from './gitUnpushedCounts';

function makeProject(overrides: Partial<GitProjectInfo> = {}): GitProjectInfo {
  return {
    name: 'repo',
    path: '/p/repo',
    currentBranch: 'develop',
    branches: ['develop'],
    remoteBranches: ['develop'],
    isAzure: true,
    ...overrides
  };
}

describe('collectUnpushedCounts', () => {
  it('conta commits à frente da ref remota da branch atual', async () => {
    const calls: string[][] = [];
    const run: ProjectGitRunner = async (_path, args) => {
      calls.push(args);
      return { stdout: '3\n', stderr: '' };
    };
    const counts = await collectUnpushedCounts([makeProject()], run);
    expect(counts).toEqual({ '/p/repo': 3 });
    expect(calls[0]).toEqual(['--no-optional-locks', 'rev-list', '--count', 'refs/remotes/origin/develop..HEAD']);
  });

  it('ignora branch só local, HEAD destacado e branch desconhecida', async () => {
    const run: ProjectGitRunner = async () => ({ stdout: '1\n', stderr: '' });
    const counts = await collectUnpushedCounts(
      [
        makeProject({ path: '/a', currentBranch: 'feature/x' }),
        makeProject({ path: '/b', detachedHead: true }),
        makeProject({ path: '/c', currentBranch: 'unknown' }),
        makeProject({ path: '/d', remoteBranches: undefined })
      ],
      run
    );
    expect(counts).toEqual({});
  });

  it('deixa de fora o repositório em que o git falhou, sem derrubar os outros', async () => {
    const run: ProjectGitRunner = async (projectPath) => {
      if (projectPath === '/ruim') throw new Error('corrompido');
      return { stdout: '0\n', stderr: '' };
    };
    const counts = await collectUnpushedCounts(
      [makeProject({ path: '/ruim' }), makeProject({ path: '/bom' }), makeProject({ path: '/lixo' })],
      async (p, a, t) => (p === '/lixo' ? { stdout: 'abc', stderr: '' } : run(p, a, t))
    );
    expect(counts).toEqual({ '/bom': 0 });
  });
});
