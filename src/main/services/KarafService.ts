import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { KarafDeployRequest, PomInfo, getKarafSshPort, KarafBundleInfo } from '../../shared/types';
import { ConfigService } from './ConfigService';
import { execFileAsync, isSafeKarafCommand } from '../utils/security';

export class KarafService {
  private configService: ConfigService;
  private embeddedKarafProcess: ChildProcess | null = null;

  constructor(configService: ConfigService) {
    this.configService = configService;
  }

  public parseProjectPomOrBat(projectPath: string): PomInfo | null {
    try {
      if (!projectPath || !fs.existsSync(projectPath)) return null;

      // 1. Tentar ler deploy-local.bat se existir
      const batPath = path.join(projectPath, 'deploy-local.bat');
      let batRepoCmd = '';
      let batInstallCmd = '';

      if (fs.existsSync(batPath)) {
        const batContent = fs.readFileSync(batPath, 'utf-8');
        const repoMatch = batContent.match(/"(feature:repo-add[^"]+)"/);
        const installMatch = batContent.match(/"(feature:install[^"]+)"/);
        if (repoMatch) batRepoCmd = repoMatch[1];
        if (installMatch) batInstallCmd = installMatch[1];
      }

      // 2. Ler pom.xml
      const pomPath = path.join(projectPath, 'pom.xml');
      if (fs.existsSync(pomPath)) {
        const pomContent = fs.readFileSync(pomPath, 'utf-8');
        const groupIdMatch = pomContent.match(/<groupId>([^<]+)<\/groupId>/g);
        const artifactIdMatch = pomContent.match(/<artifactId>([^<]+)<\/artifactId>/g);
        const versionMatch = pomContent.match(/<version>([^<]+)<\/version>/g);
        const moduleMatches = Array.from(pomContent.matchAll(/<module>([^<]+)<\/module>/g)).map((m) => m[1]);

        const groupId = groupIdMatch ? groupIdMatch[groupIdMatch.length > 1 ? 1 : 0].replace(/<\/?groupId>/g, '') : '';
        const artifactId = artifactIdMatch ? artifactIdMatch[artifactIdMatch.length > 1 ? 1 : 0].replace(/<\/?artifactId>/g, '') : '';
        const version = versionMatch ? versionMatch[versionMatch.length > 1 ? 1 : 0].replace(/<\/?version>/g, '') : '0.0.1-SNAPSHOT';

        const serviceModule = moduleMatches.find((m) => m.includes('service')) || moduleMatches[0] || artifactId;
        const featureName = artifactId.replace('-parent', '');

        return {
          groupId,
          artifactId,
          version,
          modules: moduleMatches,
          suggestedRepoCommand: batRepoCmd || `feature:repo-add mvn:${groupId}/${serviceModule}/${version}/xml/features`,
          suggestedInstallCommand: batInstallCmd || `feature:install -r -u ${featureName}/${version}`
        };
      }
    } catch (err) {
      console.error('Erro ao analisar pom.xml:', err);
    }
    return null;
  }

  public getKarafClientExecutable(): string | null {
    const settings = this.configService.getSettings();
    if (!settings.karafPath) return null;
    const candidates = [
      path.join(settings.karafPath, 'bin', 'client.bat'),
      path.join(settings.karafPath, 'bin', 'client.sh'),
      path.join(settings.karafPath, 'bin', 'client'),
      path.join(settings.karafPath, 'bin', 'karaf-client')
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return null;
  }

  public getKarafServerExecutable(): string | null {
    const settings = this.configService.getSettings();
    if (!settings.karafPath) return null;

    // Se o desenvolvedor informou um script customizado nas configurações:
    if (settings.karafScript && settings.karafScript.trim()) {
      const custom = settings.karafScript.trim();
      if (path.isAbsolute(custom) && fs.existsSync(custom)) {
        return custom;
      }
      const inBin = path.join(settings.karafPath, 'bin', custom);
      if (fs.existsSync(inBin)) {
        return inBin;
      }
    }

    const candidates = [
      path.join(settings.karafPath, 'bin', 'winthor.bat'),
      path.join(settings.karafPath, 'bin', 'karaf.bat'),
      path.join(settings.karafPath, 'bin', 'winthor'),
      path.join(settings.karafPath, 'bin', 'karaf.sh'),
      path.join(settings.karafPath, 'bin', 'karaf')
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return null;
  }

  public getResolvedJavaEnv(): NodeJS.ProcessEnv {
    const settings = this.configService.getSettings();
    const configuredJdk = settings.jdkPath && fs.existsSync(settings.jdkPath) ? settings.jdkPath : null;
    const defaultJdk = 'C:\\pcsist\\produtos\\winthor-jdk';
    const fallbackJdk = fs.existsSync(defaultJdk) ? defaultJdk : null;
    const chosenJdk = configuredJdk || process.env.JAVA_HOME || fallbackJdk;

    const childEnv: NodeJS.ProcessEnv = { ...process.env };
    if (chosenJdk) {
      childEnv.JAVA_HOME = chosenJdk;
    }
    if (childEnv.JAVA_HOME && process.platform === 'win32') {
      const jdkBin = path.join(childEnv.JAVA_HOME, 'bin');
      if (!childEnv.PATH?.includes(jdkBin)) {
        childEnv.PATH = `${jdkBin};${childEnv.PATH || ''}`;
      }
    }
    return childEnv;
  }

  public executeKarafCommand(
    command: string,
    onChunk: (chunk: string) => void,
    credentials?: { user?: string; pass?: string; port?: number }
  ): Promise<{ code: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      if (!isSafeKarafCommand(command)) {
        const errMsg = `[ERRO DE SEGURANÇA] Comando Karaf rejeitado: contém caracteres de controle proibidos ou formato inválido.\r\n`;
        onChunk(errMsg);
        return resolve({ code: 1, stdout: '', stderr: errMsg });
      }

      const settings = this.configService.getSettings();
      const karafClient = this.getKarafClientExecutable();
      const user = credentials?.user || settings.karafUser || 'karaf';
      const pass = credentials?.pass || settings.karafPass || 'karaf';
      const sshPort = credentials?.port || getKarafSshPort(settings);

      const scriptName = karafClient ? path.basename(karafClient) : 'client.bat';
      const portDesc = sshPort && sshPort !== 8101 ? ` -a ${sshPort}` : '';
      onChunk(`> ${scriptName} -u ${user} -p ****${portDesc} "${command}"\r\n`);

      if (!karafClient) {
        const errMsg = `[ERRO] Executável client do Karaf não encontrado em: ${path.join(settings.karafPath, 'bin')}\r\n`;
        onChunk(errMsg);
        return resolve({ code: 1, stdout: '', stderr: errMsg });
      }

      const clientArgs = sshPort && sshPort !== 8101
        ? ['-u', user, '-p', pass, '-a', String(sshPort), command]
        : ['-u', user, '-p', pass, command];

      const isWin = process.platform === 'win32';
      const childEnv = this.getResolvedJavaEnv();
      const proc = isWin
        ? spawn('cmd.exe', ['/c', karafClient, ...clientArgs], {
            cwd: path.dirname(karafClient),
            shell: false,
            env: childEnv
          })
        : spawn(karafClient, clientArgs, {
            cwd: path.dirname(karafClient),
            shell: false,
            env: childEnv
          });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        onChunk(text);
      });

      proc.stderr?.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        onChunk(text);
      });

      proc.on('close', (code) => {
        resolve({ code: code || 0, stdout, stderr });
      });

      proc.on('error', (err) => {
        const errMsg = `[FALHA] ${err.message}\r\n`;
        onChunk(errMsg);
        resolve({ code: 1, stdout, stderr: errMsg });
      });
    });
  }

  /**
   * Verifica se a feature/bundle foi de fato instalada e está ativa após um deploy,
   * filtrando a saída de "feature:list -i" e "bundle:list" pelo termo informado
   * (artifactId ou nome da feature). Evita depender de flags de filtro nativas do
   * Karaf, que variam entre versões.
   */
  public async verifyInstallation(
    matchTerm: string,
    onChunk: (chunk: string) => void,
    credentials?: { user?: string; pass?: string; port?: number }
  ): Promise<{ featureInstalled: boolean; featureLines: string[]; bundleLines: string[] }> {
    const featureRes = await this.executeKarafCommand('feature:list -i', onChunk, credentials);
    const bundleRes = await this.executeKarafCommand('bundle:list', onChunk, credentials);

    const term = matchTerm.trim().toLowerCase();
    const filterLines = (text: string) =>
      text
        .split(/\r?\n/)
        .filter((line) => line.toLowerCase().includes(term))
        .map((line) => line.trim());

    const featureLines = term ? filterLines(featureRes.stdout) : [];
    const bundleLines = term ? filterLines(bundleRes.stdout) : [];

    return {
      featureInstalled: featureLines.length > 0,
      featureLines,
      bundleLines
    };
  }

  // --- Karaf Embutido no Painel ---
  public startEmbeddedKarafDebug(onLog: (chunk: string) => void): boolean {
    if (this.embeddedKarafProcess) {
      onLog('[INFO] Karaf já está em execução no console integrado.\r\n');
      return true;
    }

    const settings = this.configService.getSettings();
    const karafBin = path.join(settings.karafPath, 'bin');
    const exeFile = this.getKarafServerExecutable();

    if (!exeFile) {
      onLog(`[ERRO] Script de inicialização do Karaf (karaf.bat/karaf) não encontrado em: ${karafBin}\r\n`);
      return false;
    }

    onLog(`[OK] Inicializando Karaf OSGi em modo Debug (Console Embutido)...\r\n`);

    try {
      const isWin = process.platform === 'win32';
      const childEnv = this.getResolvedJavaEnv();
      this.embeddedKarafProcess = isWin
        ? spawn('cmd.exe', ['/c', path.basename(exeFile), 'debug'], {
            cwd: karafBin,
            shell: false,
            env: childEnv
          })
        : spawn(exeFile, ['debug'], {
            cwd: karafBin,
            shell: false,
            env: childEnv
          });

      this.embeddedKarafProcess.stdout?.on('data', (data) => {
        onLog(data.toString());
      });

      this.embeddedKarafProcess.stderr?.on('data', (data) => {
        onLog(data.toString());
      });

      this.embeddedKarafProcess.on('close', (code) => {
        onLog(`\r\n[AVISO] Sessão do Karaf Debug encerrada (Código: ${code}).\r\n`);
        this.embeddedKarafProcess = null;
      });

      this.embeddedKarafProcess.on('error', (err) => {
        onLog(`\r\n[ERRO] Falha no processo do Karaf: ${err.message}\r\n`);
        this.embeddedKarafProcess = null;
      });

      return true;
    } catch (err: any) {
      onLog(`[ERRO FATAL] Não foi possível iniciar o Karaf: ${err?.message || err}\r\n`);
      this.embeddedKarafProcess = null;
      return false;
    }
  }

  public sendEmbeddedInput(input: string): boolean {
    if (this.embeddedKarafProcess && this.embeddedKarafProcess.stdin) {
      if (!input || typeof input !== 'string') return false;
      // eslint-disable-next-line no-control-regex -- remove intencionalmente caracteres de controle do input do terminal
      this.embeddedKarafProcess.stdin.write(input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') + '\n');
      return true;
    }
    return false;
  }

  public async stopEmbeddedKaraf(): Promise<boolean> {
    if (!this.embeddedKarafProcess) return true;

    try {
      if (this.embeddedKarafProcess.pid) {
        if (process.platform === 'win32') {
          await execFileAsync('taskkill.exe', ['/F', '/PID', String(this.embeddedKarafProcess.pid), '/T']);
        } else {
          process.kill(-this.embeddedKarafProcess.pid, 'SIGKILL');
        }
      }
      this.embeddedKarafProcess = null;
      return true;
    } catch {
      this.embeddedKarafProcess?.kill();
      this.embeddedKarafProcess = null;
      return true;
    }
  }

  public isEmbeddedRunning(): boolean {
    return this.embeddedKarafProcess !== null && !this.embeddedKarafProcess.killed;
  }

  public async deploy(
    request: KarafDeployRequest,
    onChunk: (chunk: string) => void
  ): Promise<{ success: boolean; error?: string }> {
    onChunk(`\r\n==========================================\r\n`);
    onChunk(`INICIANDO DEPLOY NO KARAF LOCAL\r\n`);
    onChunk(`==========================================\r\n`);

    onChunk(`\r\n[1/2] Adicionando repositório Maven...\r\n`);
    const repoRes = await this.executeKarafCommand(request.repoUrl, onChunk, {
      user: request.user,
      pass: request.pass,
      port: request.port
    });
    if (repoRes.code !== 0 && !repoRes.stdout.includes('already registered')) {
      onChunk(`\r\n[AVISO] O comando de repositório retornou código ${repoRes.code}, prosseguindo para instalação...\r\n`);
    }

    onChunk(`\r\n[2/2] Instalando Feature no contêiner OSGi...\r\n`);
    const installRes = await this.executeKarafCommand(request.featureInstall, onChunk, {
      user: request.user,
      pass: request.pass,
      port: request.port
    });

    if (installRes.code === 0) {
      onChunk(`\r\n==========================================\r\n`);
      onChunk(`✨ DEPLOY FINALIZADO COM SUCESSO!\r\n`);
      onChunk(`==========================================\r\n`);
      return { success: true };
    } else {
      onChunk(`\r\n[ERRO] Falha na instalação da feature (Código ${installRes.code}).\r\n`);
      return { success: false, error: installRes.stderr || 'Erro na instalação' };
    }
  }

  public runMavenBuild(
    projectPath: string,
    skipTests: boolean = true,
    onChunk: (chunk: string) => void
  ): Promise<{ code: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      onChunk(`\r\n==========================================\r\n`);
      onChunk(`🔨 EXECUTANDO COMPILAÇÃO MAVEN (mvn clean install)\r\n`);
      onChunk(`Diretório: ${projectPath}\r\n`);
      onChunk(`==========================================\r\n`);

      if (!fs.existsSync(projectPath)) {
        const err = `[ERRO] Diretório do projeto não encontrado: ${projectPath}\r\n`;
        onChunk(err);
        return resolve({ code: 1, stdout: '', stderr: err });
      }

      const isWin = process.platform === 'win32';
      const mvnwBat = path.join(projectPath, 'mvnw.cmd');
      const mvnwSh = path.join(projectPath, 'mvnw');

      let cmd = 'mvn';
      const args = ['clean', 'install'];
      if (skipTests) {
        args.push('-DskipTests');
      }

      if (isWin && fs.existsSync(mvnwBat)) {
        cmd = mvnwBat;
      } else if (!isWin && fs.existsSync(mvnwSh)) {
        cmd = mvnwSh;
      }

      onChunk(`> ${cmd} ${args.join(' ')}\r\n\r\n`);

      const proc = isWin
        ? spawn('cmd.exe', ['/c', cmd, ...args], { cwd: projectPath, shell: false })
        : spawn(cmd, args, { cwd: projectPath, shell: false });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        onChunk(text);
      });

      proc.stderr?.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        onChunk(text);
      });

      proc.on('close', (code) => {
        if (code === 0) {
          onChunk(`\r\n[SUCESSO] Compilação Maven concluída com sucesso!\r\n`);
        } else {
          onChunk(`\r\n[ERRO] Falha na compilação Maven (Código de saída: ${code}).\r\n`);
        }
        resolve({ code: code || 0, stdout, stderr });
      });

      proc.on('error', (err) => {
        const errMsg = `[FALHA] Não foi possível executar o comando Maven: ${err.message}\r\n`;
        onChunk(errMsg);
        resolve({ code: 1, stdout, stderr: errMsg });
      });
    });
  }

  public async buildAndDeployMaven(
    request: KarafDeployRequest,
    projectPath: string,
    skipTests: boolean,
    onChunk: (chunk: string) => void
  ): Promise<{ success: boolean; error?: string }> {
    const buildRes = await this.runMavenBuild(projectPath, skipTests, onChunk);
    if (buildRes.code !== 0) {
      onChunk(`\r\n==========================================\r\n`);
      onChunk(`❌ DEPLOY ABORTADO: A compilação Maven falhou.\r\n`);
      onChunk(`==========================================\r\n`);
      return { success: false, error: 'Falha na compilação Maven' };
    }

    return this.deploy(request, onChunk);
  }

  /**
   * Executa 'bundle:list -s' e retorna a lista de bundles OSGi estruturada.
   */
  public async listBundlesParsed(
    credentials?: { user?: string; pass?: string; port?: number }
  ): Promise<KarafBundleInfo[]> {
    const dummyChunk = () => {};
    const res = await this.executeKarafCommand('bundle:list -s', dummyChunk, credentials);
    if (res.code !== 0 || !res.stdout) return [];

    const lines = res.stdout.split(/\r?\n/);
    const bundles: KarafBundleInfo[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (
        !trimmed ||
        trimmed.startsWith('START LEVEL') ||
        trimmed.includes('ID |') ||
        trimmed.includes('ID │') ||
        trimmed.startsWith('===')
      ) {
        continue;
      }

      // Formato colunas por pipe (| ou │)
      if (trimmed.includes('|') || trimmed.includes('│')) {
        const parts = trimmed.split(/[|│]/).map((p) => p.trim());
        if (parts.length >= 4 && /^\d+$/.test(parts[0])) {
          const id = parts[0];
          const stateStr = parts[1];
          const version = parts[parts.length - 2] || '';
          const name = parts[parts.length - 1] || '';
          let state: KarafBundleInfo['state'] = 'Unknown';
          if (/Active/i.test(stateStr)) state = 'Active';
          else if (/Resolved/i.test(stateStr)) state = 'Resolved';
          else if (/Installed/i.test(stateStr)) state = 'Installed';
          else if (/Starting/i.test(stateStr)) state = 'Starting';
          else if (/Stopping/i.test(stateStr)) state = 'Stopping';

          bundles.push({ id, state, level: parts[2], version, name });
          continue;
        }
      }

      // Formato colchetes: [ 123] [Active     ] [            ] [   80] My Name (1.0.0)
      const bracketMatch = trimmed.match(
        /^\[\s*(\d+)\]\s*\[([^\]]+)\]\s*(?:\[([^\]]*)\])?\s*\[\s*(\d+)\s*\]\s*(.+?)(?:\s*\(([^)]+)\))?$/
      );
      if (bracketMatch) {
        const id = bracketMatch[1];
        const stateStr = bracketMatch[2].trim();
        const blueprint = bracketMatch[3]?.trim();
        const level = bracketMatch[4]?.trim();
        const name = bracketMatch[5]?.trim() || '';
        const version = bracketMatch[6]?.trim() || '';

        let state: KarafBundleInfo['state'] = 'Unknown';
        if (/Active/i.test(stateStr)) state = 'Active';
        else if (/Resolved/i.test(stateStr)) state = 'Resolved';
        else if (/Installed/i.test(stateStr)) state = 'Installed';
        else if (/Starting/i.test(stateStr)) state = 'Starting';
        else if (/Stopping/i.test(stateStr)) state = 'Stopping';

        bundles.push({ id, state, blueprint, level, name, version });
      }
    }

    return bundles;
  }

  /**
   * Executa ação de ciclo de vida em um bundle específico (start, stop, restart, uninstall).
   */
  public async manageBundle(
    action: 'start' | 'stop' | 'restart' | 'uninstall',
    bundleId: string,
    credentials?: { user?: string; pass?: string; port?: number }
  ): Promise<{ success: boolean; output: string }> {
    const cleanId = bundleId.trim();
    if (!/^\d+$/.test(cleanId)) {
      return { success: false, output: 'ID do bundle inválido (deve ser numérico).' };
    }

    const command = `bundle:${action} ${cleanId}`;
    let output = '';
    const res = await this.executeKarafCommand(
      command,
      (chunk) => {
        output += chunk;
      },
      credentials
    );

    return {
      success: res.code === 0,
      output: output || res.stdout || res.stderr
    };
  }
}
