import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { GitAzureService, GIT_NETWORK_TIMEOUT_MS } from './GitAzureService';
import { ConfigService } from './ConfigService';
import { KarafService } from './KarafService';

const mockExecFileAsync = vi.fn();
const mockKillProcessTree = vi.fn();

vi.mock('../utils/security', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/security')>();
  return {
    ...actual,
    execFileAsync: (...args: any[]) => mockExecFileAsync(...args)
  };
});

vi.mock('../utils/process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/process')>();
  return {
    ...actual,
    killProcessTree: (pid: number) => mockKillProcessTree(pid)
  };
});

describe('GitAzureService', () => {
  let tmpDir: string;
  let configService: ConfigService;
  let karafService: KarafService;
  let gitService: GitAzureService;

  beforeEach(() => {
    mockExecFileAsync.mockReset();
    mockKillProcessTree.mockReset();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-azure-test-'));
    process.env.CONFIG_DIR = tmpDir;

    configService = new ConfigService();
    karafService = new KarafService(configService);
    gitService = new GitAzureService(configService, karafService);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    delete process.env.CONFIG_DIR;
  });

  /** Repositório falso só com HEAD e config, o suficiente para a leitura via filesystem. */
  function makeRepo(name: string, branch: string, remoteUrl: string): string {
    const repoDir = path.join(tmpDir, name);
    const gitDir = path.join(repoDir, '.git');
    fs.mkdirSync(gitDir, { recursive: true });
    fs.writeFileSync(path.join(gitDir, 'HEAD'), `ref: refs/heads/${branch}\n`);
    fs.writeFileSync(path.join(gitDir, 'config'), remoteUrl ? `[remote "origin"]\n\turl = ${remoteUrl}\n` : '');
    return repoDir;
  }

  /** Erro no formato do execFile quando o processo sai com código diferente de zero. */
  function exitError(code: number, stdout = '', stderr = '') {
    return Object.assign(new Error(`Command failed with exit code ${code}`), { code, stdout, stderr });
  }

  describe('getProjectInfo', () => {
    it('retorna null se o diretório não existe ou não tem pasta .git', async () => {
      const nonExistent = path.join(tmpDir, 'non-existent');
      expect(await gitService.getProjectInfo(nonExistent)).toBeNull();

      const notGitDir = path.join(tmpDir, 'not-git');
      fs.mkdirSync(notGitDir);
      expect(await gitService.getProjectInfo(notGitDir)).toBeNull();
    });

    it('identifica branch atual e remote Azure DevOps HTTPS', async () => {
      const repoDir = path.join(tmpDir, 'repo-https');
      const gitDir = path.join(repoDir, '.git');
      fs.mkdirSync(gitDir, { recursive: true });

      fs.writeFileSync(path.join(gitDir, 'HEAD'), 'ref: refs/heads/feature/minha-feature\n');
      fs.writeFileSync(
        path.join(gitDir, 'config'),
        `[remote "origin"]\n\turl = https://dev.azure.com/minha-empresa/meu-projeto/_git/meu-repositorio\n[branch "feature/minha-feature"]\n`
      );

      mockExecFileAsync.mockResolvedValueOnce({ stdout: ' M arquivo1.ts\n M arquivo2.ts\n' });

      const info = await gitService.getProjectInfo(repoDir);
      expect(info).not.toBeNull();
      expect(info?.name).toBe('repo-https');
      expect(info?.currentBranch).toBe('feature/minha-feature');
      expect(info?.isAzure).toBe(true);
      expect(info?.azureOrg).toBe('minha-empresa');
      expect(info?.azureProject).toBe('meu-projeto');
      expect(info?.azureRepo).toBe('meu-repositorio');
      expect(info?.uncommittedCount).toBe(2);
    });

    it('identifica remote Azure DevOps SSH', async () => {
      const repoDir = path.join(tmpDir, 'repo-ssh');
      const gitDir = path.join(repoDir, '.git');
      fs.mkdirSync(gitDir, { recursive: true });

      fs.writeFileSync(path.join(gitDir, 'HEAD'), 'ref: refs/heads/main\n');
      fs.writeFileSync(
        path.join(gitDir, 'config'),
        `[remote "origin"]\n\turl = git@ssh.dev.azure.com:v3/minha-org/meu-projeto/meu-repo\n`
      );

      mockExecFileAsync.mockResolvedValueOnce({ stdout: '' });

      const info = await gitService.getProjectInfo(repoDir);
      expect(info?.isAzure).toBe(true);
      expect(info?.azureOrg).toBe('minha-org');
      expect(info?.azureProject).toBe('meu-projeto');
      expect(info?.azureRepo).toBe('meu-repo');
      expect(info?.uncommittedCount).toBe(0);
    });

    it('identifica remote não-Azure (ex: GitHub)', async () => {
      const repoDir = path.join(tmpDir, 'repo-gh');
      const gitDir = path.join(repoDir, '.git');
      fs.mkdirSync(gitDir, { recursive: true });

      fs.writeFileSync(path.join(gitDir, 'HEAD'), 'ref: refs/heads/develop\n');
      fs.writeFileSync(
        path.join(gitDir, 'config'),
        `[remote "origin"]\n\turl = https://github.com/totvs/dev-manager.git\n`
      );

      mockExecFileAsync.mockResolvedValueOnce({ stdout: '' });

      const info = await gitService.getProjectInfo(repoDir);
      expect(info?.isAzure).toBe(false);
      expect(info?.azureOrg).toBe('');
      expect(info?.remoteUrl).toBe('https://github.com/totvs/dev-manager.git');
    });
  });

  describe('buildAzurePrUrl', () => {
    it('constrói URL de Pull Request correta para Azure DevOps', async () => {
      const repoDir = path.join(tmpDir, 'repo-pr');
      const gitDir = path.join(repoDir, '.git');
      fs.mkdirSync(gitDir, { recursive: true });

      fs.writeFileSync(path.join(gitDir, 'HEAD'), 'ref: refs/heads/feature/tela-nova\n');
      fs.writeFileSync(
        path.join(gitDir, 'config'),
        `[remote "origin"]\n\turl = https://dev.azure.com/totvs-corp/core/_git/app-financeiro\n`
      );

      const prUrl = await gitService.buildAzurePrUrl(repoDir, 'main');
      expect(prUrl).toBe(
        'https://dev.azure.com/totvs-corp/core/_git/app-financeiro/pullrequestcreate?sourceRef=feature%2Ftela-nova&targetRef=main'
      );
      // Montar a URL não precisa do git status (só lê HEAD e config).
      expect(mockExecFileAsync).not.toHaveBeenCalled();
    });

    it('retorna null se o projeto não for Azure DevOps', async () => {
      const repoDir = path.join(tmpDir, 'repo-non-azure');
      const gitDir = path.join(repoDir, '.git');
      fs.mkdirSync(gitDir, { recursive: true });

      fs.writeFileSync(path.join(gitDir, 'HEAD'), 'ref: refs/heads/master\n');
      fs.writeFileSync(
        path.join(gitDir, 'config'),
        `[remote "origin"]\n\turl = https://gitlab.com/meu-grupo/meu-repo.git\n`
      );

      const prUrl = await gitService.buildAzurePrUrl(repoDir);
      expect(prUrl).toBeNull();
    });
  });

  describe('buildPrUrl', () => {
    it('monta URL de MR do GitLab com subgrupos', async () => {
      const repoDir = makeRepo('repo-gl', 'feature/x', 'git@gitlab.com:grupo/sub/app.git');
      const prUrl = await gitService.buildPrUrl(repoDir, 'develop');
      expect(prUrl).toBe(
        'https://gitlab.com/grupo/sub/app/-/merge_requests/new?merge_request%5Bsource_branch%5D=feature%2Fx&merge_request%5Btarget_branch%5D=develop'
      );
    });

    it('retorna null com HEAD destacado (não há branch de origem)', async () => {
      const repoDir = makeRepo('repo-detached', 'feature/x', 'https://github.com/org/app.git');
      fs.writeFileSync(path.join(repoDir, '.git', 'HEAD'), '0123456789abcdef0123456789abcdef01234567\n');
      expect(await gitService.buildPrUrl(repoDir, 'main')).toBeNull();
    });
  });

  describe('branches, remotes e layout do .git', () => {
    it('lista branches locais de refs soltas e packed-refs, e as remotas do origin', async () => {
      const repoDir = makeRepo('repo-refs', 'main', 'https://github.com/org/app.git');
      const gitDir = path.join(repoDir, '.git');
      fs.mkdirSync(path.join(gitDir, 'refs', 'heads', 'feature'), { recursive: true });
      fs.writeFileSync(path.join(gitDir, 'refs', 'heads', 'main'), 'a'.repeat(40));
      fs.writeFileSync(path.join(gitDir, 'refs', 'heads', 'feature', 'local-sem-push'), 'b'.repeat(40));
      fs.mkdirSync(path.join(gitDir, 'refs', 'remotes', 'origin'), { recursive: true });
      fs.writeFileSync(path.join(gitDir, 'refs', 'remotes', 'origin', 'HEAD'), 'ref: refs/remotes/origin/main');
      fs.writeFileSync(
        path.join(gitDir, 'packed-refs'),
        [
          '# pack-refs with: peeled fully-peeled sorted ',
          `${'c'.repeat(40)} refs/heads/hotfix/antigo`,
          `${'d'.repeat(40)} refs/remotes/origin/develop`,
          `${'e'.repeat(40)} refs/remotes/origin/main`,
          `${'f'.repeat(40)} refs/tags/v1.0`,
          `^${'0'.repeat(40)}`
        ].join('\n')
      );

      const info = await gitService.getProjectInfo(repoDir, false);
      expect(info?.branches).toEqual(['feature/local-sem-push', 'hotfix/antigo', 'main']);
      expect(info?.remoteBranches).toEqual(['develop', 'main']);
    });

    it('resolve worktree/submódulo em que .git é um arquivo "gitdir:"', async () => {
      const mainRepo = makeRepo('repo-main', 'main', 'https://github.com/org/app.git');
      const worktreeGitDir = path.join(mainRepo, '.git', 'worktrees', 'wt');
      fs.mkdirSync(worktreeGitDir, { recursive: true });
      fs.writeFileSync(path.join(worktreeGitDir, 'HEAD'), 'ref: refs/heads/feature/wt\n');
      fs.writeFileSync(path.join(worktreeGitDir, 'commondir'), '../..\n');

      const worktreeDir = path.join(tmpDir, 'wt');
      fs.mkdirSync(worktreeDir);
      fs.writeFileSync(path.join(worktreeDir, '.git'), `gitdir: ${worktreeGitDir}\n`);

      const info = await gitService.getProjectInfo(worktreeDir, false);
      expect(info?.currentBranch).toBe('feature/wt');
      expect(info?.provider).toBe('github');
      expect(info?.webUrl).toBe('https://github.com/org/app');
    });

    it('marca HEAD destacado sem incluir o hash na lista de branches', async () => {
      const repoDir = makeRepo('repo-hash', 'main', '');
      fs.writeFileSync(path.join(repoDir, '.git', 'HEAD'), '0123456789abcdef0123456789abcdef01234567\n');

      const info = await gitService.getProjectInfo(repoDir, false);
      expect(info?.detachedHead).toBe(true);
      expect(info?.currentBranch).toBe('01234567');
      expect(info?.branches).toEqual([]);
    });

    it('remove credenciais embutidas na URL do remote', async () => {
      const repoDir = makeRepo('repo-pat', 'main', 'https://usuario:PAT-SECRETO@dev.azure.com/org/proj/_git/repo');

      const info = await gitService.getProjectInfo(repoDir, false);
      expect(info?.remoteUrl).toBe('https://dev.azure.com/org/proj/_git/repo');
      expect(JSON.stringify(info)).not.toContain('PAT-SECRETO');
      expect(info?.azureRepo).toBe('repo');
    });

    it('lê o "url" do origin mesmo com "pushurl" declarado antes', async () => {
      const repoDir = makeRepo('repo-pushurl', 'main', '');
      fs.writeFileSync(
        path.join(repoDir, '.git', 'config'),
        '[remote "origin"]\n\tpushurl = D:/espelho/app.git\n\turl = git@github.com:org/app.git\n'
      );

      const info = await gitService.getProjectInfo(repoDir, false);
      expect(info?.remoteUrl).toBe('git@github.com:org/app.git');
      expect(info?.provider).toBe('github');
    });

    it('rejeita caminhos UNC sem executar git', async () => {
      expect(await gitService.getProjectInfo('\\\\servidor\\share\\repo')).toBeNull();
      const res = await gitService.commitAndPush('\\\\servidor\\share\\repo', 'msg');
      expect(res.success).toBe(false);
      expect(mockExecFileAsync).not.toHaveBeenCalled();
    });
  });

  describe('checkoutBranch', () => {
    it('rejeita nomes de branches inválidos com espaços ou iniciados em hífen', async () => {
      const repoDir = path.join(tmpDir, 'repo-chk');
      fs.mkdirSync(repoDir);

      const res1 = await gitService.checkoutBranch(repoDir, 'branch com espaco');
      expect(res1.success).toBe(false);
      expect(res1.output).toContain('Nome de branch inválido');

      const res2 = await gitService.checkoutBranch(repoDir, '-flag-maliciosa');
      expect(res2.success).toBe(false);
      expect(res2.output).toContain('Nome de branch inválido');
    });

    it('executa checkout com sucesso para branch válida', async () => {
      const repoDir = path.join(tmpDir, 'repo-chk');
      fs.mkdirSync(repoDir);

      mockExecFileAsync.mockResolvedValueOnce({ stdout: "Switched to branch 'release-1.2'", stderr: '' });

      const res = await gitService.checkoutBranch(repoDir, 'release-1.2');
      expect(res.success).toBe(true);
      expect(mockExecFileAsync).toHaveBeenCalledWith('git', ['checkout', 'release-1.2', '--'], { cwd: repoDir });
    });

    it('nunca deixa o nome da branch virar pathspec (git checkout . descartaria as alterações)', async () => {
      const repoDir = path.join(tmpDir, 'repo-chk');
      fs.mkdirSync(repoDir);
      mockExecFileAsync.mockRejectedValueOnce(exitError(128, '', 'fatal: invalid reference: .'));

      const res = await gitService.checkoutBranch(repoDir, '.');
      expect(res.success).toBe(false);
      expect(mockExecFileAsync).toHaveBeenCalledWith('git', ['checkout', '.', '--'], { cwd: repoDir });
    });
  });

  describe('commitAndPush', () => {
    it('rejeita mensagens de commit vazias', async () => {
      const repoDir = path.join(tmpDir, 'repo-commit');
      fs.mkdirSync(repoDir);

      const res = await gitService.commitAndPush(repoDir, '   ');
      expect(res.success).toBe(false);
      expect(res.output).toContain('Mensagem de commit não pode ser vazia');
    });

    it('faz push configurando upstream quando branch local não tem upstream remoto', async () => {
      const repoDir = path.join(tmpDir, 'repo-upstream');
      const gitDir = path.join(repoDir, '.git');
      fs.mkdirSync(gitDir, { recursive: true });

      fs.writeFileSync(path.join(gitDir, 'HEAD'), 'ref: refs/heads/feature/branch-nova\n');
      fs.writeFileSync(path.join(gitDir, 'config'), `[remote "origin"]\n\turl = https://github.com/repo.git\n`);

      // 1. git add -A
      mockExecFileAsync.mockResolvedValueOnce({ stdout: '' });
      // 2. git diff --cached --quiet (sai com 1: há alterações no index)
      mockExecFileAsync.mockRejectedValueOnce(exitError(1));
      // 3. git commit -m "novo commit"
      mockExecFileAsync.mockResolvedValueOnce({ stdout: '[feature/branch-nova 123456] novo commit' });
      // 4. git rev-parse @{u} (sem upstream)
      mockExecFileAsync.mockRejectedValueOnce(exitError(128, '', 'fatal: no upstream configured'));
      // 5. git push --set-upstream origin HEAD
      mockExecFileAsync.mockResolvedValueOnce({ stdout: "Branch 'feature/branch-nova' set up to track remote branch." });

      const res = await gitService.commitAndPush(repoDir, 'novo commit');
      expect(res.success).toBe(true);
      expect(res.pushFailed).toBeUndefined();
      expect(res.output).toContain('novo commit');
      expect(mockExecFileAsync).toHaveBeenCalledWith('git', ['push', '--set-upstream', 'origin', 'HEAD'], { cwd: repoDir });
    });

    it('não commita quando não há nada no index, sem depender do idioma da saída do git', async () => {
      const repoDir = path.join(tmpDir, 'repo-clean');
      fs.mkdirSync(repoDir);
      mockExecFileAsync.mockResolvedValueOnce({ stdout: '' }); // git add -A
      mockExecFileAsync.mockResolvedValueOnce({ stdout: '' }); // git diff --cached --quiet (0 = nada)

      const res = await gitService.commitAndPush(repoDir, 'msg');
      expect(res.success).toBe(false);
      expect(res.output).toContain('Nenhuma alteração pendente');
      expect(mockExecFileAsync).toHaveBeenCalledTimes(2);
    });

    it('sinaliza pushFailed quando o commit foi criado mas o push falhou', async () => {
      const repoDir = path.join(tmpDir, 'repo-push-fail');
      fs.mkdirSync(repoDir);
      mockExecFileAsync.mockResolvedValueOnce({ stdout: '' }); // add
      mockExecFileAsync.mockRejectedValueOnce(exitError(1)); // diff --cached
      mockExecFileAsync.mockResolvedValueOnce({ stdout: '[main abc123] msg' }); // commit
      mockExecFileAsync.mockResolvedValueOnce({ stdout: 'origin/main' }); // rev-parse @{u}
      mockExecFileAsync.mockRejectedValueOnce(exitError(1, '', '! [rejected] main -> main (fetch first)')); // push

      const res = await gitService.commitAndPush(repoDir, 'msg');
      expect(res.success).toBe(true);
      expect(res.pushFailed).toBe(true);
      expect(res.output).toContain('push falhou');
      expect(res.output).toContain('rejected');
    });

    it('devolve stdout e stderr quando o commit falha (ex: hook pre-commit)', async () => {
      const repoDir = path.join(tmpDir, 'repo-hook');
      fs.mkdirSync(repoDir);
      mockExecFileAsync.mockResolvedValueOnce({ stdout: '' }); // add
      mockExecFileAsync.mockRejectedValueOnce(exitError(1)); // diff --cached
      mockExecFileAsync.mockRejectedValueOnce(exitError(1, 'lint: 2 erros', 'husky - pre-commit hook exited with code 1')); // commit

      const res = await gitService.commitAndPush(repoDir, 'msg');
      expect(res.success).toBe(false);
      expect(res.output).toContain('lint: 2 erros');
      expect(res.output).toContain('pre-commit hook');
    });
  });

  describe('getUncommittedCounts', () => {
    it('conta as alterações de cada repositório da pasta de projetos sem travar o index', async () => {
      const repoA = makeRepo('repo-a', 'main', '');
      const repoB = makeRepo('repo-b', 'main', '');
      fs.mkdirSync(path.join(tmpDir, 'pasta-sem-git'));
      configService.saveSettings({ projectsPath: tmpDir });

      mockExecFileAsync.mockImplementation(async (_cmd: string, _args: string[], opts: { cwd: string }) => ({
        stdout: opts.cwd === repoA ? ' M a.ts\n?? b.ts\n' : ''
      }));

      const counts = await gitService.getUncommittedCounts();
      expect(counts).toEqual({ [repoA]: 2, [repoB]: 0 });
      expect(mockExecFileAsync).toHaveBeenCalledWith('git', ['--no-optional-locks', 'status', '--porcelain'], { cwd: repoA });

      // A lista (só filesystem) passa a refletir a contagem em cache.
      const listed = await gitService.listProjects();
      expect(listed.find((p) => p.path === repoA)?.uncommittedCount).toBe(2);
    });

    it('omite repositórios em que o git status falhou', async () => {
      const repoA = makeRepo('repo-a', 'main', '');
      makeRepo('repo-quebrado', 'main', '');
      configService.saveSettings({ projectsPath: tmpDir });

      mockExecFileAsync.mockImplementation(async (_cmd: string, _args: string[], opts: { cwd: string }) => {
        if (opts.cwd !== repoA) throw exitError(128, '', 'fatal: not a git repository');
        return { stdout: ' M a.ts\n' };
      });

      expect(await gitService.getUncommittedCounts()).toEqual({ [repoA]: 1 });
    });
  });

  describe('timeout de operações de rede', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('encerra a árvore do git e devolve erro quando o fetch não termina', async () => {
      vi.useFakeTimers();
      const repoDir = path.join(tmpDir, 'repo-lento');
      fs.mkdirSync(repoDir);
      // Simula um fetch preso num prompt de credencial: a Promise nunca resolve sozinha.
      mockExecFileAsync.mockImplementationOnce(() => Object.assign(new Promise(() => {}), { child: { pid: 4321 } }));

      const pending = gitService.executeGitCommand(repoDir, 'fetch');
      await vi.advanceTimersByTimeAsync(GIT_NETWORK_TIMEOUT_MS);
      const res = await pending;

      expect(res.success).toBe(false);
      expect(res.output).toContain('Tempo limite');
      expect(res.output).toContain('git fetch');
      expect(mockKillProcessTree).toHaveBeenCalledWith(4321);
    });

    it('marca pushFailed quando o push estoura o tempo limite', async () => {
      vi.useFakeTimers();
      const repoDir = path.join(tmpDir, 'repo-push-lento');
      fs.mkdirSync(repoDir);
      mockExecFileAsync.mockResolvedValueOnce({ stdout: '' }); // add
      mockExecFileAsync.mockRejectedValueOnce(exitError(1)); // diff --cached
      mockExecFileAsync.mockResolvedValueOnce({ stdout: '[main abc] msg' }); // commit
      mockExecFileAsync.mockResolvedValueOnce({ stdout: 'origin/main' }); // rev-parse @{u}
      mockExecFileAsync.mockImplementationOnce(() => new Promise(() => {})); // push preso

      const pending = gitService.commitAndPush(repoDir, 'msg');
      await vi.advanceTimersByTimeAsync(GIT_NETWORK_TIMEOUT_MS);
      const res = await pending;

      expect(res.success).toBe(true);
      expect(res.pushFailed).toBe(true);
      expect(res.output).toContain('Tempo limite');
    });

    it('não aplica timeout a comandos locais como stash', async () => {
      const repoDir = path.join(tmpDir, 'repo-stash');
      fs.mkdirSync(repoDir);
      mockExecFileAsync.mockResolvedValueOnce({ stdout: 'Saved working directory' });

      const res = await gitService.executeGitCommand(repoDir, 'stash');
      expect(res.success).toBe(true);
      expect(mockExecFileAsync).toHaveBeenCalledWith('git', ['stash'], { cwd: repoDir });
    });
  });

  describe('getStatusDetails', () => {
    it('mapeia corretamente os status do git porcelain', async () => {
      const repoDir = path.join(tmpDir, 'repo-status');
      fs.mkdirSync(repoDir);

      // Formato de `git status --porcelain -z`: entradas separadas por NUL, renomeação = "novo\0antigo".
      const porcelainOutput = [
        '?? novo-arquivo.ts',
        'A  staged-file.ts',
        ' M unstaged-modified.ts',
        'M  staged-modified.ts',
        'D  deleted.ts',
        'R  new.ts',
        'old.ts',
        ' M docs/relatório final.md',
        ''
      ].join('\0');

      mockExecFileAsync.mockResolvedValueOnce({ stdout: porcelainOutput });

      const statuses = await gitService.getStatusDetails(repoDir);
      expect(mockExecFileAsync).toHaveBeenCalledWith(
        'git',
        ['--no-optional-locks', 'status', '--porcelain', '-z', '-u'],
        { cwd: repoDir }
      );
      expect(statuses).toHaveLength(7);

      expect(statuses[0]).toEqual({ path: 'novo-arquivo.ts', status: 'untracked', staged: false });
      expect(statuses[1]).toEqual({ path: 'staged-file.ts', status: 'added', staged: true });
      expect(statuses[2]).toEqual({ path: 'unstaged-modified.ts', status: 'modified', staged: false });
      expect(statuses[3]).toEqual({ path: 'staged-modified.ts', status: 'modified', staged: true });
      expect(statuses[4]).toEqual({ path: 'deleted.ts', status: 'deleted', staged: true });
      expect(statuses[5]).toEqual({ path: 'new.ts', originalPath: 'old.ts', status: 'renamed', staged: true });
      expect(statuses[6]).toEqual({ path: 'docs/relatório final.md', status: 'modified', staged: false });
    });
  });

  describe('getDiff', () => {
    it('rejeita targetFile malicioso ou caminhos UNC', async () => {
      const repoDir = path.join(tmpDir, 'repo-diff');
      fs.mkdirSync(repoDir);

      const res = await gitService.getDiff(repoDir, '\\\\malicious-server\\share\\file.txt');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Caminho de arquivo inválido');
    });

    it('retorna diff e lista de arquivos alterados', async () => {
      const repoDir = path.join(tmpDir, 'repo-diff');
      fs.mkdirSync(repoDir);

      const mockDiff = [
        'diff --git a/src/index.ts b/src/index.ts',
        '--- a/src/index.ts',
        '+++ b/src/index.ts',
        '@@ -1,3 +1,4 @@',
        '+console.log("hello");'
      ].join('\n');

      mockExecFileAsync.mockResolvedValueOnce({ stdout: 'a'.repeat(40) }); // rev-parse --verify HEAD
      mockExecFileAsync.mockResolvedValueOnce({ stdout: mockDiff });

      const res = await gitService.getDiff(repoDir);
      expect(res.success).toBe(true);
      expect(res.diff).toContain('console.log("hello");');
      expect(res.files).toContain('src/index.ts');
      expect(mockExecFileAsync).toHaveBeenLastCalledWith(
        'git',
        ['-c', 'core.quotePath=false', 'diff', 'HEAD'],
        expect.objectContaining({ cwd: repoDir })
      );
    });

    it('mostra arquivo não rastreado como novo (git diff HEAD não o incluiria)', async () => {
      const repoDir = path.join(tmpDir, 'repo-diff');
      fs.mkdirSync(repoDir);
      const newFileDiff = 'diff --git a/novo.txt b/novo.txt\nnew file mode 100644\n--- /dev/null\n+++ b/novo.txt\n@@ -0,0 +1 @@\n+oi';

      mockExecFileAsync.mockResolvedValueOnce({ stdout: 'novo.txt\n' }); // ls-files --others
      mockExecFileAsync.mockRejectedValueOnce(exitError(1, newFileDiff)); // diff --no-index sai com 1

      const res = await gitService.getDiff(repoDir, 'novo.txt');
      expect(res.success).toBe(true);
      expect(res.diff).toContain('+oi');
      expect(mockExecFileAsync).toHaveBeenLastCalledWith(
        'git',
        ['-c', 'core.quotePath=false', 'diff', '--no-index', '--', '/dev/null', 'novo.txt'],
        expect.objectContaining({ cwd: repoDir })
      );
    });
  });
});
