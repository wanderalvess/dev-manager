import { describe, expect, it } from 'vitest';
import { publishCurrentBranch, readBranchPublishStatus, type GitRunner } from './gitBranchPublish';
import { resolveStartPoint } from './gitBranchStart';

const SHA = 'b'.repeat(40);
const ok = (stdout = '') => Promise.resolve({ stdout, stderr: '' });

/** Runner roteado pelo primeiro argumento do git; o que não está na tabela falha como o git falharia. */
function makeRunner(routes: Record<string, (args: string[]) => Promise<{ stdout: string; stderr: string }>>) {
  const calls: string[][] = [];
  const run: GitRunner = (args) => {
    calls.push(args);
    const handler = routes[args[0]];
    return handler ? handler(args) : Promise.reject(new Error(`git ${args[0]} falhou`));
  };
  return { run, calls };
}

describe('readBranchPublishStatus', () => {
  it('marca como não publicada quando o origin não tem a branch (caso do TF401175)', async () => {
    const { run } = makeRunner({
      'symbolic-ref': () => ok('bugfix/DDWMISSI-5859-release\n'),
      'ls-remote': () => ok('')
    });
    const status = await readBranchPublishStatus(run);
    expect(status).toMatchObject({
      branch: 'bugfix/DDWMISSI-5859-release',
      publishedOnRemote: false,
      verifiedOnRemote: true,
      unpushedCommits: null
    });
  });

  it('conta commits sem push quando a branch já está no origin', async () => {
    const { run, calls } = makeRunner({
      'symbolic-ref': () => ok('feature/x\n'),
      'ls-remote': () => ok(`${SHA}\trefs/heads/feature/x\n`),
      'rev-parse': () => ok(SHA),
      'cat-file': () => ok(),
      'rev-list': () => ok('2\n')
    });
    const status = await readBranchPublishStatus(run);
    expect(status).toMatchObject({ publishedOnRemote: true, verifiedOnRemote: true, unpushedCommits: 2 });
    expect(calls).toContainEqual(['rev-list', '--count', `${SHA}..HEAD`]);
  });

  it('cai nas refs locais quando o origin não responde', async () => {
    const { run } = makeRunner({
      'symbolic-ref': () => ok('feature/x\n'),
      'rev-parse': () => ok(SHA),
      'rev-list': () => ok('0\n')
    });
    const status = await readBranchPublishStatus(run);
    expect(status.publishedOnRemote).toBe(true);
    expect(status.verifiedOnRemote).toBe(false);
    expect(status.warning).toContain('Não foi possível consultar o origin');
    expect(status.unpushedCommits).toBe(0);
  });

  it('não considera publicada uma branch sem ref remota quando o origin está inacessível', async () => {
    const { run } = makeRunner({ 'symbolic-ref': () => ok('feature/x\n') });
    const status = await readBranchPublishStatus(run);
    expect(status).toMatchObject({ publishedOnRemote: false, verifiedOnRemote: false });
  });

  it('avisa do HEAD destacado em vez de consultar o origin', async () => {
    const { run, calls } = makeRunner({ 'symbolic-ref': () => ok('') });
    const status = await readBranchPublishStatus(run);
    expect(status.branch).toBe('');
    expect(status.warning).toContain('HEAD destacado');
    expect(calls.some((c) => c[0] === 'ls-remote')).toBe(false);
  });
});

describe('publishCurrentBranch', () => {
  it('faz push com upstream da branch atual para o origin', async () => {
    const { run, calls } = makeRunner({
      'symbolic-ref': () => ok('bugfix/x\n'),
      push: () => Promise.resolve({ stdout: '', stderr: "branch 'bugfix/x' set up to track 'origin/bugfix/x'." })
    });
    const output = await publishCurrentBranch(run, 1000);
    expect(output).toContain('set up to track');
    expect(calls).toContainEqual(['push', '--set-upstream', 'origin', 'bugfix/x']);
  });

  it('recusa HEAD destacado e propaga a falha do push', async () => {
    await expect(publishCurrentBranch(makeRunner({ 'symbolic-ref': () => ok('') }).run, 1000)).rejects.toThrow('HEAD destacado');
    const failing = makeRunner({
      'symbolic-ref': () => ok('bugfix/x\n'),
      push: () => Promise.reject(new Error('remote rejected'))
    });
    await expect(publishCurrentBranch(failing.run, 1000)).rejects.toThrow('remote rejected');
  });
});

describe('resolveStartPoint', () => {
  it('usa a branch local quando ela existe', async () => {
    expect(await resolveStartPoint(() => Promise.resolve(), 'develop')).toBe('develop');
  });

  it('usa origin/<base> quando a base existe só no remoto', async () => {
    const run = (args: string[]) => (args[3] === 'refs/heads/release/39.0' ? Promise.reject(new Error('x')) : Promise.resolve());
    expect(await resolveStartPoint(run, 'release/39.0')).toBe('origin/release/39.0');
  });

  it('mantém o valor original (tag, hash) quando nenhuma branch bate', async () => {
    expect(await resolveStartPoint(() => Promise.reject(new Error('x')), 'v1.0.0')).toBe('v1.0.0');
  });
});
