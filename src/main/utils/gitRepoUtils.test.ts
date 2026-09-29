import { describe, expect, it } from 'vitest';
import {
  parseCommitLog,
  parseGitDirFile,
  parsePackedRefs,
  parseRemoteUrl,
  parseStatusPorcelainZ,
  sanitizeRemoteUrl,
  slugifyTaskTitle,
  parseTaskInput,
  generateTaskBranchName,
  validateBranchName
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

describe('slugifyTaskTitle', () => {
  it('remove acentos, caracteres especiais e converte em slug kebab-case', () => {
    expect(slugifyTaskTitle('Cálculo de Preço & Desconto Especial!')).toBe('calculo-de-preco-desconto-especial');
  });

  it('respeita o tamanho máximo sem deixar hífen solto no final', () => {
    const longTitle = 'Implementação da nova rotina de importação de dados cadastrais fiscais para faturamento';
    const slug = slugifyTaskTitle(longTitle, 25);
    expect(slug.length).toBeLessThanOrEqual(25);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('retorna string vazia para entrada vazia', () => {
    expect(slugifyTaskTitle('')).toBe('');
  });
});

describe('parseTaskInput', () => {
  it('reconhece URL do Azure DevOps e extrai o ID do work item', () => {
    expect(parseTaskInput('https://dev.azure.com/minhaorg/meuproj/_workitems/edit/98765')).toEqual({
      taskId: '98765'
    });
  });

  it('reconhece URL do Jira e extrai a chave da issue em maiúsculas', () => {
    expect(parseTaskInput('https://jira.corp.com/browse/dev-4321')).toEqual({
      taskId: 'DEV-4321'
    });
  });

  it('reconhece formato "#id - Título"', () => {
    expect(parseTaskInput('#12345 - Corrigir bug no checkout')).toEqual({
      taskId: '12345',
      taskTitle: 'Corrigir bug no checkout'
    });
  });

  it('reconhece formato "KEY-123: Título"', () => {
    expect(parseTaskInput('WMS-789: Ajustar emissão de nota')).toEqual({
      taskId: 'WMS-789',
      taskTitle: 'Ajustar emissão de nota'
    });
  });

  it('reconhece ID numérico isolado', () => {
    expect(parseTaskInput('54321')).toEqual({ taskId: '54321' });
  });

  it('interpreta texto sem ID como título', () => {
    expect(parseTaskInput('Atualização de dependências')).toEqual({
      taskTitle: 'Atualização de dependências'
    });
  });
});

describe('generateTaskBranchName', () => {
  it('monta nome com prefixo, taskId e slug do título', () => {
    expect(
      generateTaskBranchName({
        prefix: 'feature/',
        taskId: '12345',
        title: 'Ajuste de Cálculo'
      })
    ).toBe('feature/12345-ajuste-de-calculo');
  });

  it('adiciona barra ao prefixo se faltar', () => {
    expect(
      generateTaskBranchName({
        prefix: 'bugfix',
        taskId: 'WMS-10',
        title: 'Erro de validação'
      })
    ).toBe('bugfix/WMS-10-erro-de-validacao');
  });

  it('suporta apenas taskId ou apenas título', () => {
    expect(generateTaskBranchName({ prefix: 'hotfix/', taskId: '999' })).toBe('hotfix/999');
    expect(generateTaskBranchName({ prefix: 'chore/', title: 'Clean code' })).toBe('chore/clean-code');
  });
});

describe('validateBranchName', () => {
  it('aprova nomes válidos de branch Git', () => {
    expect(validateBranchName('feature/12345-ajuste-de-calculo').valid).toBe(true);
    expect(validateBranchName('main').valid).toBe(true);
    expect(validateBranchName('develop').valid).toBe(true);
  });

  it('rejeita nomes vazios, com espaços, barras duplas ou caracteres proibidos', () => {
    expect(validateBranchName('').valid).toBe(false);
    expect(validateBranchName('   ').valid).toBe(false);
    expect(validateBranchName('feature/com espaco').valid).toBe(false);
    expect(validateBranchName('/inicia-com-barra').valid).toBe(false);
    expect(validateBranchName('termina-com-barra/').valid).toBe(false);
    expect(validateBranchName('feature//dupla-barra').valid).toBe(false);
    expect(validateBranchName('feature..dois-pontos').valid).toBe(false);
    expect(validateBranchName('branch.lock').valid).toBe(false);
    expect(validateBranchName('feature/caractere?invalido').valid).toBe(false);
    expect(validateBranchName('branch@{upstream}').valid).toBe(false);
  });
});
