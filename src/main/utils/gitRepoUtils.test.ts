import { describe, expect, it } from 'vitest';
import {
  parseCommitLog,
  parseGitDirFile,
  parsePackedRefs,
  parseRemoteUrl,
  parseStatusPorcelainZ,
  sanitizeRemoteUrl
} from './gitRepoUtils';

describe('sanitizeRemoteUrl', () => {
  it('remove usuário e token de remotes HTTPS', () => {
    expect(sanitizeRemoteUrl('https://user:ghp_abc@github.com/org/app.git')).toBe('https://github.com/org/app.git');
    expect(sanitizeRemoteUrl('https://minha-org@dev.azure.com/minha-org/proj/_git/repo')).toBe(
      'https://dev.azure.com/minha-org/proj/_git/repo'
    );
  });

  it('mantém remotes SSH intactos (git@ não é segredo)', () => {
    expect(sanitizeRemoteUrl('git@github.com:org/app.git')).toBe('git@github.com:org/app.git');
  });
});

describe('parseRemoteUrl', () => {
  it('reconhece Azure DevOps em HTTPS, SSH e no domínio legado visualstudio.com', () => {
    for (const url of [
      'https://org@dev.azure.com/org/Projeto%20X/_git/app',
      'git@ssh.dev.azure.com:v3/org/Projeto%20X/app',
      'https://org.visualstudio.com/Projeto%20X/_git/app',
      'https://org.visualstudio.com/DefaultCollection/Projeto%20X/_git/app',
      'org@vs-ssh.visualstudio.com:v3/org/Projeto%20X/app'
    ]) {
      const parsed = parseRemoteUrl(url);
      expect(parsed.provider, url).toBe('azure');
      expect(parsed.azureOrg, url).toBe('org');
      expect(parsed.azureProject, url).toBe('Projeto%20X');
      expect(parsed.azureRepo, url).toBe('app');
      expect(parsed.webUrl, url).toBe('https://dev.azure.com/org/Projeto%20X/_git/app');
    }
  });

  it('aceita pontos no nome do repositório GitHub e barra final', () => {
    expect(parseRemoteUrl('https://github.com/org/org.github.io.git')).toMatchObject({
      provider: 'github',
      owner: 'org',
      repo: 'org.github.io',
      webUrl: 'https://github.com/org/org.github.io'
    });
    expect(parseRemoteUrl('https://github.com/org/app/')).toMatchObject({ provider: 'github', repo: 'app' });
    expect(parseRemoteUrl('ssh://git@github.com/org/app.git')).toMatchObject({ provider: 'github', owner: 'org', repo: 'app' });
  });

  it('aceita subgrupos do GitLab', () => {
    expect(parseRemoteUrl('git@gitlab.com:grupo/sub/app.git')).toMatchObject({
      provider: 'gitlab',
      owner: 'grupo/sub',
      repo: 'app',
      webUrl: 'https://gitlab.com/grupo/sub/app'
    });
  });

  it('deduz URL navegável para provedores não suportados sem marcar provedor', () => {
    const parsed = parseRemoteUrl('git@bitbucket.org:time/app.git');
    expect(parsed.provider).toBeUndefined();
    expect(parsed.webUrl).toBe('https://bitbucket.org/time/app');
    expect(parseRemoteUrl('https://user:senha@gitea.local/time/app.git').webUrl).toBe('https://gitea.local/time/app');
  });

  it('não inventa URL para remotes locais', () => {
    expect(parseRemoteUrl('C:\\repos\\app').webUrl).toBeUndefined();
    expect(parseRemoteUrl('../remote.git').webUrl).toBeUndefined();
    expect(parseRemoteUrl('').provider).toBeUndefined();
  });
});

describe('parseGitDirFile', () => {
  it('extrai o caminho do arquivo .git de worktrees/submódulos', () => {
    expect(parseGitDirFile('gitdir: ../.git/modules/lib\n')).toBe('../.git/modules/lib');
    expect(parseGitDirFile('lixo')).toBeNull();
  });
});

describe('parsePackedRefs', () => {
  it('filtra pelo prefixo e ignora comentários e linhas de peel', () => {
    const content = [
      '# pack-refs with: peeled fully-peeled sorted ',
      `${'a'.repeat(40)} refs/heads/main`,
      `${'b'.repeat(40)} refs/remotes/origin/feature/x`,
      `${'c'.repeat(40)} refs/tags/v1`,
      `^${'d'.repeat(40)}`
    ].join('\r\n');
    expect(parsePackedRefs(content, 'refs/heads/')).toEqual(['main']);
    expect(parsePackedRefs(content, 'refs/remotes/origin/')).toEqual(['feature/x']);
  });
});

describe('parseStatusPorcelainZ', () => {
  it('lê caminhos com espaço/acento sem escape e renomeações no formato -z', () => {
    const stdout = ['R  pasta/novo nome.ts', 'pasta/antigo.ts', '?? relatório.txt', 'MM ambos.ts', ''].join('\0');
    expect(parseStatusPorcelainZ(stdout)).toEqual([
      { path: 'pasta/novo nome.ts', originalPath: 'pasta/antigo.ts', status: 'renamed', staged: true },
      { path: 'relatório.txt', status: 'untracked', staged: false },
      { path: 'ambos.ts', status: 'modified', staged: true }
    ]);
  });
});

describe('parseCommitLog', () => {
  it('separa campos por \\x1f, preservando "|" no autor e na mensagem', () => {
    const stdout = ['abc123\x1fFulano | Consultoria\x1f2026-09-20\x1ffeat: a | b', 'def456\x1fBeltrano\x1f2026-09-19\x1ffix: c'].join(
      '\n'
    );
    expect(parseCommitLog(stdout)).toEqual([
      { hash: 'abc123', author: 'Fulano | Consultoria', date: '2026-09-20', message: 'feat: a | b' },
      { hash: 'def456', author: 'Beltrano', date: '2026-09-19', message: 'fix: c' }
    ]);
  });
});
