import fs from 'fs';
import path from 'path';
import { GitProjectInfo, GitCommitInfo } from '../../shared/types';
import { ConfigService } from './ConfigService';
import { KarafService } from './KarafService';
import { execFileAsync } from '../utils/security';

export class GitAzureService {
  private configService: ConfigService;
  private karafService: KarafService;

  constructor(configService: ConfigService, karafService: KarafService) {
    this.configService = configService;
    this.karafService = karafService;
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

      // getProjectInfo já reconfirma o .git internamente; roda em paralelo pois
      // cada projeto spawna seu próprio `git status` independente dos demais.
      const infos = await Promise.all(gitDirs.map((projectDir) => this.getProjectInfo(projectDir)));
      results.push(...infos.filter((info): info is GitProjectInfo => info !== null));
    } catch (err) {
      console.error('Erro ao listar projetos Git:', err);
    }

    return results;
  }

  public async getProjectInfo(projectPath: string): Promise<GitProjectInfo | null> {
    try {
      if (!projectPath || !fs.existsSync(projectPath)) return null;
      const gitDir = path.join(projectPath, '.git');
      if (!fs.existsSync(gitDir)) return null;

      const projectName = path.basename(projectPath);

      // 1. Branch atual via HEAD
      let currentBranch = 'unknown';
      const headFile = path.join(gitDir, 'HEAD');
      if (fs.existsSync(headFile)) {
        const headContent = fs.readFileSync(headFile, 'utf-8').trim();
        if (headContent.startsWith('ref: refs/heads/')) {
          currentBranch = headContent.replace('ref: refs/heads/', '');
        } else {
          currentBranch = headContent.substring(0, 8);
        }
      }

      // 2. Remote URL e lista de branches via .git/config
      let remoteUrl = '';
      const branches: string[] = [];
      const configFile = path.join(gitDir, 'config');
      if (fs.existsSync(configFile)) {
        const configContent = fs.readFileSync(configFile, 'utf-8');

        // Prioriza a URL do remote "origin"; só recorre ao primeiro "url =" do arquivo
        // se não houver remote "origin" (evita pegar um remote "upstream" listado antes
        // em repositórios com múltiplos remotes, ex: fluxo de fork).
        const originMatch = configContent.match(/\[remote "origin"\][^[]*?url\s*=\s*(.+)/);
        const anyUrlMatch = configContent.match(/url\s*=\s*(.+)/);
        const urlMatch = originMatch || anyUrlMatch;
        if (urlMatch) {
          remoteUrl = urlMatch[1].trim();
        }

        const branchMatches = Array.from(configContent.matchAll(/\[branch "([^"]+)"\]/g));
        for (const match of branchMatches) {
          if (!branches.includes(match[1])) {
            branches.push(match[1]);
          }
        }
      }

      if (!branches.includes(currentBranch) && currentBranch !== 'unknown') {
        branches.unshift(currentBranch);
      }

      // 3. Parser Azure DevOps
      let isAzure = false;
      let azureOrg = '';
      let azureProject = '';
      let azureRepo = '';

      if (remoteUrl) {
        const httpsMatch = remoteUrl.match(/dev\.azure\.com\/([^/]+)\/([^/]+)\/_git\/([^/\s]+)/);
        if (httpsMatch) {
          isAzure = true;
          azureOrg = httpsMatch[1];
          azureProject = httpsMatch[2];
          azureRepo = httpsMatch[3].replace(/\.git$/, '');
        } else {
          const sshMatch = remoteUrl.match(/ssh\.dev\.azure\.com:v3\/([^/]+)\/([^/]+)\/([^/\s]+)/);
          if (sshMatch) {
            isAzure = true;
            azureOrg = sshMatch[1];
            azureProject = sshMatch[2];
            azureRepo = sshMatch[3].replace(/\.git$/, '');
          }
        }
      }

      // 4. Alterações não commitadas (git status --porcelain)
      let uncommittedCount = 0;
      try {
        const { stdout } = await execFileAsync('git', ['status', '--porcelain'], { cwd: projectPath });
        if (stdout) {
          uncommittedCount = stdout.trim().split('\n').filter(Boolean).length;
        }
      } catch {
        uncommittedCount = 0;
      }

      const pomInfo = this.karafService.parseProjectPomOrBat(projectPath) || undefined;

      return {
        name: projectName,
        path: projectPath,
        currentBranch,
        branches,
        remoteUrl,
        isAzure,
        azureOrg,
        azureProject,
        azureRepo,
        uncommittedCount,
        pomInfo
      };
    } catch (err) {
      console.error(`Erro ao ler informações do projeto ${projectPath}:`, err);
      return null;
    }
  }

  public async buildAzurePrUrl(projectPath: string, targetBranch?: string): Promise<string | null> {
    const info = await this.getProjectInfo(projectPath);
    if (!info || !info.isAzure || !info.azureOrg || !info.azureProject || !info.azureRepo) {
      return null;
    }

    const settings = this.configService.getSettings();
    const target = targetBranch || settings.targetPrBranch || 'develop';
    const source = encodeURIComponent(info.currentBranch);
    const targetEncoded = encodeURIComponent(target);

    return `https://dev.azure.com/${info.azureOrg}/${info.azureProject}/_git/${info.azureRepo}/pullrequestcreate?sourceRef=${source}&targetRef=${targetEncoded}`;
  }

  public async executeGitCommand(
    projectPath: string,
    command: 'fetch' | 'pull' | 'status' | 'stash' | 'stash-pop'
  ): Promise<{ success: boolean; output: string }> {
    try {
      if (!projectPath || !fs.existsSync(projectPath)) {
        return { success: false, output: 'Diretório do projeto não encontrado.' };
      }

      const allowedCommands = ['fetch', 'pull', 'status', 'stash', 'stash-pop'];
      if (!allowedCommands.includes(command)) {
        return { success: false, output: 'Comando git não permitido.' };
      }

      const args = command === 'stash-pop' ? ['stash', 'pop'] : [command];
      const { stdout, stderr } = await execFileAsync('git', args, { cwd: projectPath });

      return {
        success: true,
        output: stdout || stderr || `Comando git ${command} executado com sucesso.`
      };
    } catch (err: any) {
      return {
        success: false,
        output: err?.stdout || err?.stderr || err?.message || 'Erro ao executar comando git'
      };
    }
  }

  public async checkoutBranch(
    projectPath: string,
    branchName: string,
    createNew: boolean = false
  ): Promise<{ success: boolean; output: string }> {
    try {
      if (!projectPath || !fs.existsSync(projectPath)) {
        return { success: false, output: 'Diretório do projeto não encontrado.' };
      }
      const cleanBranch = branchName.trim();
      if (!cleanBranch || cleanBranch.includes(' ') || cleanBranch.startsWith('-')) {
        return { success: false, output: 'Nome de branch inválido.' };
      }

      const args = createNew ? ['checkout', '-b', cleanBranch] : ['checkout', cleanBranch];
      const { stdout, stderr } = await execFileAsync('git', args, { cwd: projectPath });
      return {
        success: true,
        output: stdout || stderr || `Branch alterada para '${cleanBranch}'.`
      };
    } catch (err: any) {
      return {
        success: false,
        output: err?.stdout || err?.stderr || err?.message || 'Erro ao trocar de branch'
      };
    }
  }

  public async commitAndPush(
    projectPath: string,
    message: string
  ): Promise<{ success: boolean; output: string }> {
    try {
      if (!projectPath || !fs.existsSync(projectPath)) {
        return { success: false, output: 'Diretório do projeto não encontrado.' };
      }
      const cleanMsg = message.trim();
      if (!cleanMsg) {
        return { success: false, output: 'Mensagem de commit não pode ser vazia.' };
      }

      await execFileAsync('git', ['add', '-A'], { cwd: projectPath });
      const commitRes = await execFileAsync('git', ['commit', '-m', cleanMsg], { cwd: projectPath });
      let pushOutput = '';
      try {
        const pushRes = await execFileAsync('git', ['push'], { cwd: projectPath });
        pushOutput = pushRes.stdout || pushRes.stderr || 'Push realizado com sucesso!';
      } catch (pushErr: any) {
        pushOutput = `Commit realizado, mas o push falhou: ${pushErr?.message || pushErr}`;
      }

      return {
        success: true,
        output: [commitRes.stdout, pushOutput].filter(Boolean).join('\n')
      };
    } catch (err: any) {
      const errText = err?.stdout || err?.stderr || err?.message || '';
      if (errText.includes('nothing to commit') || errText.includes('clean')) {
        return {
          success: false,
          output: 'Nenhuma alteração pendente para commitar (árvore de trabalho limpa).'
        };
      }
      return {
        success: false,
        output: errText || 'Erro ao realizar commit'
      };
    }
  }

  public async getCommitHistory(
    projectPath: string,
    limit: number = 10
  ): Promise<GitCommitInfo[]> {
    try {
      if (!projectPath || !fs.existsSync(projectPath)) {
        return [];
      }
      const num = Math.min(Math.max(1, limit), 50);
      const { stdout } = await execFileAsync(
        'git',
        ['log', `-n`, String(num), '--pretty=format:%h|%an|%ad|%s', '--date=short'],
        { cwd: projectPath }
      );
      if (!stdout) return [];

      const lines = stdout.split(/\r?\n/).filter(Boolean);
      return lines.map((line) => {
        const [hash, author, date, ...rest] = line.split('|');
        return {
          hash: hash || '',
          author: author || '',
          date: date || '',
          message: rest.join('|') || ''
        };
      });
    } catch {
      return [];
    }
  }
}
