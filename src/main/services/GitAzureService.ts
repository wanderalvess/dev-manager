import fs from 'fs';
import path from 'path';
import {
  GitProjectInfo,
  GitCommitInfo,
  GitFileStatus,
  GitDiffResult,
  GitCommandResult,
  GitTaskItem,
  CreateTaskBranchOptions
} from '../../shared/types';
import { ConfigService } from './ConfigService';
import { KarafService } from './KarafService';
import { execFileAsync, isSafeLocalPath, isSafePath } from '../utils/security';
import { killProcessTree } from '../utils/process';
import { httpRequest } from '../utils/httpRequest';
import { launchProcessSafely } from '../utils/routineLaunchUtils';
import {
  GIT_LOG_FIELD_SEPARATOR,
  generateTaskBranchName,
  parseCommitLog,
  parseGitDirFile,
  parsePackedRefs,
  parseRemoteUrl,
  parseStatusPorcelainZ,
  sanitizeRemoteUrl,
  validateBranchName
} from '../utils/gitRepoUtils';

const DIFF_MAX_BUFFER = 10 * 1024 * 1024;

/**
 * Teto para fetch/pull/push. Generoso porque o primeiro acesso pode abrir a janela de login do
 * Git Credential Manager, mas finito: sem ele um prompt de credencial/host SSH sem resposta
 * deixava o comando (e os botões da tela) presos indefinidamente.
 */
export const GIT_NETWORK_TIMEOUT_MS = 3 * 60 * 1000;

/** `git status` em segundo plano: repositório gigante ou disco travado não pode segurar a lista. */
export const GIT_STATUS_TIMEOUT_MS = 30 * 1000;

/** Quantos `git status` simultâneos na contagem em lote (evita dezenas de git.exe de uma vez). */
const STATUS_COUNT_CONCURRENCY = 4;

/** Junta stdout e stderr de uma falha do git: conflitos e erros de hook se dividem entre os dois. */
function gitErrorOutput(err: any, fallback: string): string {
  const combined = [err?.stdout, err?.stderr]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join('\n');
  return combined || err?.message || fallback;
}

export class GitAzureService {
  private configService: ConfigService;
  private karafService: KarafService;
  private uncommittedCache = new Map<string, number>();

  constructor(configService: ConfigService, karafService: KarafService) {
    this.configService = configService;
    this.karafService = karafService;
  }

  // Validação centralizada aqui (e não só nas rotas) porque IPC, servidor web e MCP chamam o
  // service diretamente: um caminho UNC apontaria o git para um .git/config/hooks de terceiros.
  private isUsableProjectPath(projectPath: string): boolean {
    return typeof projectPath === 'string' && isSafeLocalPath(projectPath) && fs.existsSync(projectPath);
  }

  /**
   * Roda o git com tempo limite. No estouro mata a árvore inteira (taskkill /T): matar só o
   * git.exe deixaria git-remote-https/credential helper/ssh órfãos segurando a conexão.
   */
  private async runGitWithTimeout(
    projectPath: string,
    args: string[],
    timeoutMs: number
  ): Promise<{ stdout: string; stderr: string }> {
    const pending = execFileAsync('git', args, { cwd: projectPath });
    const child = (pending as { child?: { pid?: number } }).child;
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        if (child?.pid) killProcessTree(child.pid);
        const seconds = Math.round(timeoutMs / 1000);
        reject(
          new Error(
            `Tempo limite de ${seconds}s excedido em "git ${args.join(' ')}". Verifique a conexão com o remoto ` +
              'e se há uma janela de login/credencial ou confirmação de host SSH aguardando resposta.'
          )
        );
      }, timeoutMs);
    });
    try {
      return await Promise.race([pending, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * `--no-optional-locks` porque é uma leitura em segundo plano: sem ele o `git status` grava o
   * index e pode disputar o index.lock com a IDE/terminal do usuário no mesmo repositório.
   */
  private async countUncommitted(projectPath: string): Promise<number | null> {
    try {
      const { stdout } = await this.runGitWithTimeout(
        projectPath,
        ['--no-optional-locks', 'status', '--porcelain'],
        GIT_STATUS_TIMEOUT_MS
      );
      const count = stdout ? stdout.split('\n').filter((line) => line.trim()).length : 0;
      this.uncommittedCache.set(projectPath, count);
      return count;
    } catch {
      return null;
    }
  }

  /**
   * Conta alterações pendentes de todos os repositórios da pasta de projetos, com concorrência
   * limitada. Fica fora do listProjects (que só lê o filesystem, para não pesar na abertura do
   * app) e é chamado sob demanda pela tela de Git. Repositórios em que o status falhou ficam de fora.
   */
  public async getUncommittedCounts(): Promise<Record<string, number>> {
    const projects = await this.listProjects();
    const counts: Record<string, number> = {};
    let nextIndex = 0;

    const worker = async () => {
      while (nextIndex < projects.length) {
        const project = projects[nextIndex++];
        const count = await this.countUncommitted(project.path);
        if (count !== null) counts[project.path] = count;
      }
    };

    await Promise.all(Array.from({ length: Math.min(STATUS_COUNT_CONCURRENCY, projects.length) }, worker));
    return counts;
  }

  /** Resolve o diretório git (HEAD) e o diretório comum (config/refs), cobrindo worktrees e submódulos. */
  private resolveGitDirs(projectPath: string): { gitDir: string; commonDir: string } | null {
    const dotGit = path.join(projectPath, '.git');
    let stat: fs.Stats;
    try {
      stat = fs.statSync(dotGit);
    } catch {
      return null;
    }
    if (stat.isDirectory()) {
      return { gitDir: dotGit, commonDir: dotGit };
    }

    const gitDirRef = parseGitDirFile(fs.readFileSync(dotGit, 'utf-8'));
    if (!gitDirRef) return null;
    const gitDir = path.resolve(projectPath, gitDirRef);
    const commonDirFile = path.join(gitDir, 'commondir');
    const commonDir = fs.existsSync(commonDirFile)
      ? path.resolve(gitDir, fs.readFileSync(commonDirFile, 'utf-8').trim())
      : gitDir;
    return { gitDir, commonDir };
  }

  /** Lista refs sob um prefixo lendo refs soltas e `packed-refs` (clones recentes guardam tudo compactado). */
  private listRefNames(commonDir: string, prefix: string): string[] {
    const names = new Set<string>();

    const walk = (dir: string, relative: string) => {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        const refName = relative ? `${relative}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          walk(path.join(dir, entry.name), refName);
        } else if (entry.isFile()) {
          names.add(refName);
        }
      }
    };
    walk(path.join(commonDir, ...prefix.split('/').filter(Boolean)), '');

    const packedRefsFile = path.join(commonDir, 'packed-refs');
    if (fs.existsSync(packedRefsFile)) {
      for (const name of parsePackedRefs(fs.readFileSync(packedRefsFile, 'utf-8'), prefix)) {
        names.add(name);
      }
    }

    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }

  public async listProjects(): Promise<GitProjectInfo[]> {
    const settings = this.configService.getSettings();
    const baseDir = settings.projectsPath;
    const results: GitProjectInfo[] = [];

    if (!baseDir || !fs.existsSync(baseDir)) {
      return results;
    }

    try {
      const entries = fs.readdirSync(baseDir, { withFileTypes: true });
      const gitDirs = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join(baseDir, entry.name))
        .filter((projectDir) => fs.existsSync(path.join(projectDir, '.git')));

      // Leitura ultrarrápida via filesystem (HEAD, config, pom) sem disparar
      // dezenas de processos git.exe concorrentes que congelariam o sistema no arranque.
      const infos = await Promise.all(gitDirs.map((projectDir) => this.getProjectInfo(projectDir, false)));
      results.push(...infos.filter((info): info is GitProjectInfo => info !== null));
    } catch (err) {
      console.error('Erro ao listar projetos Git:', err);
    }

    return results;
  }

  public async getProjectInfo(projectPath: string, includeUncommittedCount = true): Promise<GitProjectInfo | null> {
    try {
      if (!this.isUsableProjectPath(projectPath)) return null;
      const dirs = this.resolveGitDirs(projectPath);
      if (!dirs) return null;

      const projectName = path.basename(projectPath);

      // 1. Branch atual via HEAD
      let currentBranch = 'unknown';
      let detachedHead = false;
      const headFile = path.join(dirs.gitDir, 'HEAD');
      if (fs.existsSync(headFile)) {
        const headContent = fs.readFileSync(headFile, 'utf-8').trim();
        if (headContent.startsWith('ref: refs/heads/')) {
          currentBranch = headContent.replace('ref: refs/heads/', '');
        } else {
          currentBranch = headContent.substring(0, 8);
          detachedHead = true;
        }
      }

      // 2. Remote URL via .git/config
      let remoteUrl = '';
      const configFile = path.join(dirs.commonDir, 'config');
      if (fs.existsSync(configFile)) {
        const configContent = fs.readFileSync(configFile, 'utf-8');

        // Prioriza a URL do remote "origin"; só recorre ao primeiro "url =" do arquivo
        // se não houver remote "origin" (evita pegar um remote "upstream" listado antes
        // em repositórios com múltiplos remotes, ex: fluxo de fork).
        // Âncora no início da linha para não casar com "pushurl =".
        const originMatch = configContent.match(/\[remote "origin"\][^[]*?^\s*url\s*=\s*(.+)$/m);
        const anyUrlMatch = configContent.match(/^\s*url\s*=\s*(.+)$/m);
        const urlMatch = originMatch || anyUrlMatch;
        if (urlMatch) {
          remoteUrl = sanitizeRemoteUrl(urlMatch[1]);
        }
      }

      // 3. Branches locais e do origin. O .git/config só lista branches com upstream
      // configurado; as refs trazem também as criadas localmente e ainda não publicadas.
      const branches = this.listRefNames(dirs.commonDir, 'refs/heads/');
      if (!detachedHead && currentBranch !== 'unknown' && !branches.includes(currentBranch)) {
        branches.unshift(currentBranch);
      }
      const remoteBranches = this.listRefNames(dirs.commonDir, 'refs/remotes/origin/').filter((b) => b !== 'HEAD');

      // 4. Provedor (Azure DevOps / GitHub / GitLab)
      const remote = parseRemoteUrl(remoteUrl);

      // 5. Alterações não commitadas (git status --porcelain)
      let uncommittedCount = this.uncommittedCache.get(projectPath) ?? 0;
      if (includeUncommittedCount) {
        uncommittedCount = (await this.countUncommitted(projectPath)) ?? 0;
      }

      const pomInfo = this.karafService.parseProjectPomOrBat(projectPath) || undefined;

      return {
        name: projectName,
        path: projectPath,
        currentBranch,
        branches,
        remoteBranches,
        detachedHead,
        remoteUrl,
        webUrl: remote.webUrl,
        isAzure: remote.provider === 'azure',
        azureOrg: remote.azureOrg,
        azureProject: remote.azureProject,
        azureRepo: remote.azureRepo,
        provider: remote.provider,
        owner: remote.owner,
        repo: remote.repo,
        uncommittedCount,
        pomInfo
      };
    } catch (err) {
      console.error(`Erro ao ler informações do projeto ${projectPath}:`, err);
      return null;
    }
  }

  private buildAzurePrUrlFromInfo(info: GitProjectInfo, targetBranch: string): string | null {
    if (!info.isAzure || !info.azureOrg || !info.azureProject || !info.azureRepo) {
      return null;
    }
    const source = encodeURIComponent(info.currentBranch);
    const targetEncoded = encodeURIComponent(targetBranch);
    return `https://dev.azure.com/${info.azureOrg}/${info.azureProject}/_git/${info.azureRepo}/pullrequestcreate?sourceRef=${source}&targetRef=${targetEncoded}`;
  }

  public async buildAzurePrUrl(projectPath: string, targetBranch?: string): Promise<string | null> {
    const info = await this.getProjectInfo(projectPath, false);
    if (!info) return null;
    const settings = this.configService.getSettings();
    return this.buildAzurePrUrlFromInfo(info, targetBranch || settings.targetPrBranch || 'develop');
  }

  private buildGitHubPrUrl(info: GitProjectInfo, targetBranch: string): string {
    const source = encodeURIComponent(info.currentBranch);
    const target = encodeURIComponent(targetBranch);
    return `https://github.com/${info.owner}/${info.repo}/compare/${target}...${source}?expand=1`;
  }

  private buildGitLabPrUrl(info: GitProjectInfo, targetBranch: string): string {
    const source = encodeURIComponent(info.currentBranch);
    const target = encodeURIComponent(targetBranch);
    return `https://gitlab.com/${info.owner}/${info.repo}/-/merge_requests/new?merge_request%5Bsource_branch%5D=${source}&merge_request%5Btarget_branch%5D=${target}`;
  }

  /**
   * Monta a URL de criação de PR/MR no provedor detectado do remote "origin" (Azure DevOps,
   * GitHub ou GitLab). Retorna null se o remote não corresponder a nenhum provedor suportado
   * ou se o HEAD estiver destacado (não há branch de origem para o PR).
   */
  public async buildPrUrl(projectPath: string, targetBranch?: string): Promise<string | null> {
    const info = await this.getProjectInfo(projectPath, false);
    if (!info || !info.provider || info.detachedHead) return null;

    const settings = this.configService.getSettings();
    const target = targetBranch || settings.targetPrBranch || 'develop';

    switch (info.provider) {
      case 'azure':
        return this.buildAzurePrUrlFromInfo(info, target);
      case 'github':
        return info.owner && info.repo ? this.buildGitHubPrUrl(info, target) : null;
      case 'gitlab':
        return info.owner && info.repo ? this.buildGitLabPrUrl(info, target) : null;
      default:
        return null;
    }
  }

  public async executeGitCommand(
    projectPath: string,
    command: 'fetch' | 'pull' | 'status' | 'stash' | 'stash-pop'
  ): Promise<GitCommandResult> {
    try {
      if (!this.isUsableProjectPath(projectPath)) {
        return { success: false, output: 'Diretório do projeto não encontrado.' };
      }

      const allowedCommands = ['fetch', 'pull', 'status', 'stash', 'stash-pop'];
      if (!allowedCommands.includes(command)) {
        return { success: false, output: 'Comando git não permitido.' };
      }

      const args = command === 'stash-pop' ? ['stash', 'pop'] : [command];
      const { stdout, stderr } =
        command === 'fetch' || command === 'pull'
          ? await this.runGitWithTimeout(projectPath, args, GIT_NETWORK_TIMEOUT_MS)
          : await execFileAsync('git', args, { cwd: projectPath });

      return {
        success: true,
        output: stdout || stderr || `Comando git ${command} executado com sucesso.`
      };
    } catch (err: any) {
      return {
        success: false,
        output: gitErrorOutput(err, 'Erro ao executar comando git')
      };
    }
  }

  public async checkoutBranch(
    projectPath: string,
    branchName: string,
    createNew: boolean = false,
    baseBranch?: string
  ): Promise<GitCommandResult> {
    try {
      if (!this.isUsableProjectPath(projectPath)) {
        return { success: false, output: 'Diretório do projeto não encontrado.' };
      }
      const cleanBranch = typeof branchName === 'string' ? branchName.trim() : '';
      if (!cleanBranch || /\s/.test(cleanBranch) || cleanBranch.startsWith('-')) {
        return { success: false, output: 'Nome de branch inválido.' };
      }

      const cleanBase = typeof baseBranch === 'string' ? baseBranch.trim() : '';
      if (cleanBase && (/\s/.test(cleanBase) || cleanBase.startsWith('-'))) {
        return { success: false, output: 'Nome de branch base inválido.' };
      }

      // O "--" final obriga o git a tratar o nome como branch: sem ele, "git checkout ." ou
      // "git checkout src" (sem branch com esse nome) descarta as alterações locais desses caminhos.
      const args = createNew
        ? cleanBase
          ? ['checkout', '-b', cleanBranch, cleanBase]
          : ['checkout', '-b', cleanBranch]
        : ['checkout', cleanBranch, '--'];
      const { stdout, stderr } = await execFileAsync('git', args, { cwd: projectPath });
      return {
        success: true,
        output: stdout || stderr || `Branch alterada para '${cleanBranch}'.`
      };
    } catch (err: any) {
      return {
        success: false,
        output: gitErrorOutput(err, 'Erro ao trocar de branch')
      };
    }
  }

  /** `git diff --cached --quiet` sai com 1 quando há algo no index; decide sem depender do idioma do git. */
  private async hasStagedChanges(projectPath: string): Promise<boolean> {
    try {
      await execFileAsync('git', ['diff', '--cached', '--quiet'], { cwd: projectPath });
      return false;
    } catch (err: any) {
      if (err?.code === 1) return true;
      throw err;
    }
  }

  private async hasUpstream(projectPath: string): Promise<boolean> {
    try {
      await execFileAsync('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], { cwd: projectPath });
      return true;
    } catch {
      return false;
    }
  }

  public async commitAndPush(projectPath: string, message: string): Promise<GitCommandResult> {
    try {
      if (!this.isUsableProjectPath(projectPath)) {
        return { success: false, output: 'Diretório do projeto não encontrado.' };
      }
      const cleanMsg = typeof message === 'string' ? message.trim() : '';
      if (!cleanMsg) {
        return { success: false, output: 'Mensagem de commit não pode ser vazia.' };
      }

      await execFileAsync('git', ['add', '-A'], { cwd: projectPath });
      if (!(await this.hasStagedChanges(projectPath))) {
        return {
          success: false,
          output: 'Nenhuma alteração pendente para commitar (árvore de trabalho limpa).'
        };
      }

      const commitRes = await execFileAsync('git', ['-c', 'core.quotePath=false', 'commit', '-m', cleanMsg], {
        cwd: projectPath
      });

      // Branch nova sem upstream: publica em origin com o mesmo nome (HEAD) e já configura o tracking.
      const upstreamConfigured = await this.hasUpstream(projectPath);
      const pushArgs = upstreamConfigured ? ['push'] : ['push', '--set-upstream', 'origin', 'HEAD'];
      let pushOutput: string;
      let pushFailed = false;
      try {
        const pushRes = await this.runGitWithTimeout(projectPath, pushArgs, GIT_NETWORK_TIMEOUT_MS);
        pushOutput =
          pushRes.stdout ||
          pushRes.stderr ||
          (upstreamConfigured ? 'Push realizado com sucesso!' : 'Push realizado com sucesso configurando upstream em origin!');
      } catch (pushErr: any) {
        pushFailed = true;
        pushOutput = `Commit realizado, mas o push falhou: ${gitErrorOutput(pushErr, String(pushErr))}`;
      }

      return {
        success: true,
        output: [commitRes.stdout, pushOutput].filter(Boolean).join('\n'),
        ...(pushFailed ? { pushFailed } : {})
      };
    } catch (err: any) {
      return {
        success: false,
        output: gitErrorOutput(err, 'Erro ao realizar commit')
      };
    }
  }

  public async getCommitHistory(projectPath: string, limit: number = 10): Promise<GitCommitInfo[]> {
    try {
      if (!this.isUsableProjectPath(projectPath)) {
        return [];
      }
      const num = Math.min(Math.max(1, Number(limit) || 10), 50);
      const sep = GIT_LOG_FIELD_SEPARATOR;
      const { stdout } = await execFileAsync(
        'git',
        ['log', '-n', String(num), `--pretty=format:%h${sep}%an${sep}%ad${sep}%s`, '--date=short'],
        { cwd: projectPath }
      );
      return stdout ? parseCommitLog(stdout) : [];
    } catch {
      return [];
    }
  }

  /**
   * Retorna a lista detalhada de arquivos modificados, novos ou removidos no repositório.
   */
  public async getStatusDetails(projectPath: string): Promise<GitFileStatus[]> {
    try {
      if (!this.isUsableProjectPath(projectPath)) {
        return [];
      }
      const { stdout } = await execFileAsync('git', ['--no-optional-locks', 'status', '--porcelain', '-z', '-u'], {
        cwd: projectPath
      });
      if (!stdout) return [];

      const fileStatuses = parseStatusPorcelainZ(stdout);
      this.uncommittedCache.set(projectPath, fileStatuses.length);
      return fileStatuses;
    } catch {
      return [];
    }
  }

  private async hasHead(projectPath: string): Promise<boolean> {
    try {
      await execFileAsync('git', ['rev-parse', '--verify', '--quiet', 'HEAD'], { cwd: projectPath });
      return true;
    } catch {
      return false;
    }
  }

  private async isUntrackedFile(projectPath: string, targetFile: string): Promise<boolean> {
    try {
      const { stdout } = await execFileAsync(
        'git',
        ['ls-files', '--others', '--exclude-standard', '--', targetFile],
        { cwd: projectPath }
      );
      return Boolean(stdout && stdout.trim());
    } catch {
      return false;
    }
  }

  /**
   * Obtém o diff unificado de arquivos alterados (geral ou para um arquivo específico).
   * Arquivos não rastreados não aparecem em `git diff HEAD`; quando um deles é pedido
   * explicitamente, o conteúdo é mostrado como arquivo novo (`--no-index` contra /dev/null).
   */
  public async getDiff(projectPath: string, targetFile?: string): Promise<GitDiffResult> {
    try {
      if (!this.isUsableProjectPath(projectPath)) {
        return { success: false, diff: '', files: [], error: 'Diretório do projeto não encontrado.' };
      }

      if (targetFile && !isSafeLocalPath(targetFile)) {
        return { success: false, diff: '', files: [], error: 'Caminho de arquivo inválido para diff.' };
      }

      const baseArgs = ['-c', 'core.quotePath=false', 'diff'];
      let diffOutput = '';

      if (targetFile && (await this.isUntrackedFile(projectPath, targetFile))) {
        try {
          const { stdout } = await execFileAsync(
            'git',
            [...baseArgs, '--no-index', '--', '/dev/null', targetFile],
            { cwd: projectPath, maxBuffer: DIFF_MAX_BUFFER }
          );
          diffOutput = stdout;
        } catch (err: any) {
          // --no-index sai com 1 quando há diferença (sempre, para um arquivo novo não vazio).
          if (err?.code !== 1) throw err;
          diffOutput = err.stdout || '';
        }
      } else {
        // Sem HEAD (repositório sem commits) compara working tree com o index.
        const args = (await this.hasHead(projectPath)) ? [...baseArgs, 'HEAD'] : baseArgs;
        if (targetFile) args.push('--', targetFile);
        const { stdout } = await execFileAsync('git', args, { cwd: projectPath, maxBuffer: DIFF_MAX_BUFFER });
        diffOutput = stdout;
      }

      const fileMatches = Array.from(diffOutput.matchAll(/^diff --git a\/(.+?) b\//gm)).map((m) => m[1]);

      return {
        success: true,
        diff: diffOutput,
        files: Array.from(new Set(fileMatches))
      };
    } catch (err: any) {
      const message =
        err?.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER'
          ? 'Diff grande demais para exibir (acima de 10 MB). Selecione um arquivo específico.'
          : gitErrorOutput(err, String(err));
      return {
        success: false,
        diff: '',
        files: [],
        error: message
      };
    }
  }

  /**
   * Cria e alterna para uma nova branch baseada em tarefa (Azure DevOps / Jira / Manual).
   */
  public async createTaskBranch(
    projectPath: string,
    options: CreateTaskBranchOptions
  ): Promise<GitCommandResult & { branchName: string }> {
    if (!this.isUsableProjectPath(projectPath)) {
      return { success: false, output: 'Diretório do projeto não encontrado.', branchName: '' };
    }

    const branchName = generateTaskBranchName({
      prefix: options.prefix || 'feature/',
      taskId: options.taskId,
      title: options.title
    });

    const validation = validateBranchName(branchName);
    if (!validation.valid) {
      return { success: false, output: validation.error || 'Nome de branch inválido.', branchName };
    }

    const checkoutRes = await this.checkoutBranch(projectPath, branchName, true, options.baseBranch);
    return {
      ...checkoutRes,
      branchName
    };
  }

  /**
   * Abre um arquivo específico do projeto na IDE configurada (ex: IntelliJ IDEA) ou no editor padrão do SO.
   */
  public async openFileInIde(
    projectPath: string,
    relativePath: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isUsableProjectPath(projectPath)) {
        return { success: false, error: 'Diretório do projeto não encontrado.' };
      }
      if (!relativePath || !isSafeLocalPath(relativePath)) {
        return { success: false, error: 'Caminho de arquivo inválido.' };
      }

      const fullPath = path.resolve(projectPath, relativePath);
      if (!isSafePath(fullPath, projectPath)) {
        return { success: false, error: 'Caminho do arquivo fora dos limites do projeto.' };
      }
      if (!fs.existsSync(fullPath)) {
        return { success: false, error: `Arquivo não encontrado no disco: ${relativePath}` };
      }

      const settings = this.configService.getSettings();
      if (settings.intellijPath && fs.existsSync(settings.intellijPath)) {
        launchProcessSafely(settings.intellijPath, [fullPath], projectPath);
      } else {
        launchProcessSafely(fullPath, [], path.dirname(fullPath));
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Falha ao acionar editor para abertura do arquivo.' };
    }
  }

  /**
   * Consulta tarefas e work items disponíveis no Jira e no Azure DevOps.
   */
  public async fetchTasks(projectPath?: string, query?: string): Promise<GitTaskItem[]> {
    const tasks: GitTaskItem[] = [];
    const settings = this.configService.getSettings();
    const cleanQuery = query ? query.trim() : '';

    // 1. Jira Sources configurados
    if (Array.isArray(settings.jiraSources) && settings.jiraSources.length > 0) {
      for (const js of settings.jiraSources) {
        if (js.enabled === false || !js.baseUrl || !js.authToken) continue;
        try {
          const base = js.baseUrl.replace(/\/+$/, '');
          let jql = '';
          if (cleanQuery) {
            if (/^[A-Za-z0-9]+-\d+$/i.test(cleanQuery)) {
              jql = `issueKey = "${cleanQuery}" OR summary ~ "${cleanQuery}"`;
            } else {
              jql = `summary ~ "${cleanQuery}" OR text ~ "${cleanQuery}"`;
            }
          } else {
            jql = js.jql && js.jql.trim()
              ? js.jql.trim()
              : js.projectKey
              ? `project = ${js.projectKey} AND resolution is EMPTY ORDER BY updated DESC`
              : 'resolution is EMPTY ORDER BY updated DESC';
          }

          const url = `${base}/rest/api/2/search?jql=${encodeURIComponent(jql)}&maxResults=25&fields=id,key,summary,status,issuetype`;
          const res = await httpRequest(url, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${js.authToken}`
            },
            timeout: 10000
          });

          if (res.ok) {
            const body = JSON.parse(await res.text());
            const issues = Array.isArray(body?.issues) ? body.issues : [];
            for (const issue of issues) {
              tasks.push({
                id: issue.key || String(issue.id),
                title: issue.fields?.summary || '',
                provider: 'jira',
                type: issue.fields?.issuetype?.name || 'Task',
                status: issue.fields?.status?.name || '',
                url: `${base}/browse/${issue.key}`
              });
            }
          }
        } catch (err) {
          console.warn('[GitAzureService] Falha ao consultar tarefas do Jira:', err);
        }
      }
    }

    // 2. Azure DevOps Work Items
    let azureOrg = '';
    let azureProject = '';
    if (projectPath && this.isUsableProjectPath(projectPath)) {
      const projInfo = await this.getProjectInfo(projectPath, false);
      if (projInfo?.isAzure && projInfo.azureOrg && projInfo.azureProject) {
        azureOrg = projInfo.azureOrg;
        azureProject = projInfo.azureProject;
      }
    }

    if (azureOrg && azureProject && settings.azureDevOpsToken) {
      try {
        const token = settings.azureDevOpsToken;
        const basicAuth = `Basic ${Buffer.from(`:${token}`).toString('base64')}`;

        if (/^\d+$/.test(cleanQuery)) {
          const directUrl = `https://dev.azure.com/${encodeURIComponent(azureOrg)}/${encodeURIComponent(azureProject)}/_apis/wit/workitems/${cleanQuery}?api-version=6.0`;
          const directRes = await httpRequest(directUrl, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              Authorization: basicAuth
            },
            timeout: 10000
          });
          if (directRes.ok) {
            const item = JSON.parse(await directRes.text());
            if (item && item.id) {
              tasks.push({
                id: String(item.id),
                title: item.fields?.['System.Title'] || '',
                provider: 'azure',
                type: item.fields?.['System.WorkItemType'] || 'Work Item',
                status: item.fields?.['System.State'] || '',
                url: `https://dev.azure.com/${azureOrg}/${azureProject}/_workitems/edit/${item.id}`
              });
            }
          }
        } else {
          let wiqlQuery = `Select [System.Id] From WorkItems Where [System.TeamProject] = @project and [System.State] <> 'Closed' and [System.State] <> 'Cut'`;
          if (cleanQuery) {
            const escaped = cleanQuery.replace(/'/g, "''");
            wiqlQuery += ` and [System.Title] Contains '${escaped}'`;
          }
          wiqlQuery += ` order by [System.ChangedDate] desc`;

          const wiqlUrl = `https://dev.azure.com/${encodeURIComponent(azureOrg)}/${encodeURIComponent(azureProject)}/_apis/wit/wiql?api-version=6.0&$top=25`;
          const wiqlRes = await httpRequest(wiqlUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: basicAuth
            },
            body: JSON.stringify({ query: wiqlQuery }),
            timeout: 10000
          });

          if (wiqlRes.ok) {
            const wiqlData = JSON.parse(await wiqlRes.text());
            const workItems = Array.isArray(wiqlData?.workItems) ? wiqlData.workItems : [];
            const ids = workItems.map((w: any) => w.id).filter(Boolean);

            if (ids.length > 0) {
              const idsParam = ids.slice(0, 25).join(',');
              const detailsUrl = `https://dev.azure.com/${encodeURIComponent(azureOrg)}/${encodeURIComponent(azureProject)}/_apis/wit/workitems?ids=${idsParam}&$fields=System.Id,System.Title,System.WorkItemType,System.State&api-version=6.0`;
              const detailsRes = await httpRequest(detailsUrl, {
                method: 'GET',
                headers: {
                  Accept: 'application/json',
                  Authorization: basicAuth
                },
                timeout: 10000
              });

              if (detailsRes.ok) {
                const detailsData = JSON.parse(await detailsRes.text());
                const items = Array.isArray(detailsData?.value) ? detailsData.value : [];
                for (const item of items) {
                  tasks.push({
                    id: String(item.id),
                    title: item.fields?.['System.Title'] || '',
                    provider: 'azure',
                    type: item.fields?.['System.WorkItemType'] || 'Work Item',
                    status: item.fields?.['System.State'] || '',
                    url: `https://dev.azure.com/${azureOrg}/${azureProject}/_workitems/edit/${item.id}`
                  });
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('[GitAzureService] Falha ao consultar tarefas do Azure DevOps:', err);
      }
    }

    return tasks;
  }
}
