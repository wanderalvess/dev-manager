import fs from 'fs';
import path from 'path';
import { GitProjectInfo } from '../../shared/types';
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
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const projectDir = path.join(baseDir, entry.name);
          const gitDir = path.join(projectDir, '.git');
          if (fs.existsSync(gitDir)) {
            const info = await this.getProjectInfo(projectDir);
            if (info) {
              results.push(info);
            }
          }
        }
      }
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

        const urlMatch = configContent.match(/url\s*=\s*(.+)/);
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
}
