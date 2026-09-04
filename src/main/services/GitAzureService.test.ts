import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { GitAzureService } from './GitAzureService';
import { ConfigService } from './ConfigService';
import { KarafService } from './KarafService';

const mockExecFileAsync = vi.fn();

vi.mock('../utils/security', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/security')>();
  return {
    ...actual,
    execFileAsync: (...args: any[]) => mockExecFileAsync(...args)
  };
});

describe('GitAzureService', () => {
  let tmpDir: string;
  let configService: ConfigService;
  let karafService: KarafService;
  let gitService: GitAzureService;

  beforeEach(() => {
    mockExecFileAsync.mockReset();
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
      mockExecFileAsync.mockResolvedValueOnce({ stdout: '' });

      const prUrl = await gitService.buildAzurePrUrl(repoDir, 'main');
      expect(prUrl).toBe(
        'https://dev.azure.com/totvs-corp/core/_git/app-financeiro/pullrequestcreate?sourceRef=feature%2Ftela-nova&targetRef=main'
      );
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
      mockExecFileAsync.mockResolvedValueOnce({ stdout: '' });

      const prUrl = await gitService.buildAzurePrUrl(repoDir);
      expect(prUrl).toBeNull();
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
      expect(mockExecFileAsync).toHaveBeenCalledWith('git', ['checkout', 'release-1.2'], { cwd: repoDir });
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
      // 2. git commit -m "novo commit"
      mockExecFileAsync.mockResolvedValueOnce({ stdout: '[feature/branch-nova 123456] novo commit' });
      // 3. git push (falha com no upstream branch)
      mockExecFileAsync.mockRejectedValueOnce({ stderr: 'fatal: The current branch feature/branch-nova has no upstream branch.' });
      // 4. getProjectInfo -> git status --porcelain
      mockExecFileAsync.mockResolvedValueOnce({ stdout: '' });
      // 5. git push --set-upstream origin feature/branch-nova
      mockExecFileAsync.mockResolvedValueOnce({ stdout: "Branch 'feature/branch-nova' set up to track remote branch." });

      const res = await gitService.commitAndPush(repoDir, 'novo commit');
      expect(res.success).toBe(true);
      expect(res.output).toContain('novo commit');
      expect(mockExecFileAsync).toHaveBeenCalledWith(
        'git',
        ['push', '--set-upstream', 'origin', 'feature/branch-nova'],
        { cwd: repoDir }
      );
    });
  });

  describe('getStatusDetails', () => {
    it('mapeia corretamente os status do git porcelain', async () => {
      const repoDir = path.join(tmpDir, 'repo-status');
      fs.mkdirSync(repoDir);

      const porcelainOutput = [
        '?? novo-arquivo.ts',
        'A  staged-file.ts',
        ' M unstaged-modified.ts',
        'M  staged-modified.ts',
        'D  deleted.ts',
        'R  old.ts -> new.ts'
      ].join('\n');

      mockExecFileAsync.mockResolvedValueOnce({ stdout: porcelainOutput });

      const statuses = await gitService.getStatusDetails(repoDir);
      expect(statuses).toHaveLength(6);

      expect(statuses[0]).toEqual({ path: 'novo-arquivo.ts', status: 'untracked', staged: false });
      expect(statuses[1]).toEqual({ path: 'staged-file.ts', status: 'added', staged: true });
      expect(statuses[2]).toEqual({ path: 'unstaged-modified.ts', status: 'modified', staged: false });
      expect(statuses[3]).toEqual({ path: 'staged-modified.ts', status: 'modified', staged: true });
      expect(statuses[4]).toEqual({ path: 'deleted.ts', status: 'deleted', staged: true });
      expect(statuses[5]).toEqual({ path: 'old.ts -> new.ts', status: 'renamed', staged: true });
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

      mockExecFileAsync.mockResolvedValueOnce({ stdout: mockDiff });

      const res = await gitService.getDiff(repoDir);
      expect(res.success).toBe(true);
      expect(res.diff).toContain('console.log("hello");');
      expect(res.files).toContain('src/index.ts');
    });
  });
});
