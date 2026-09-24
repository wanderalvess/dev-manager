import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import {
  KarafDeployRequest,
  PomInfo,
  getKarafSshPort,
  KarafBundleInfo,
  KarafBundleDetails,
  BundleDependencyCheckResult,
  InstallBundleRequest,
  ReinstallBundleRequest,
  UpdateBundleVersionRequest,
  KarafBundleDependent,
  KarafDeployHistoryEntry,
  KarafFeatureInfo,
  buildOtelJavaAgentProperties
} from '../../shared/types';
import { ConfigService } from './ConfigService';
import { execFileAsync, isSafeKarafCommand } from '../utils/security';
import { runCapturedProcess } from '../utils/process';

const BUNDLE_ACTIONS = ['start', 'stop', 'restart', 'uninstall', 'refresh', 'resolve'] as const;
type BundleAction = (typeof BUNDLE_ACTIONS)[number];
type DeployTrigger = 'ui' | 'mcp';

const MAX_DEPLOY_HISTORY_ENTRIES = 200;

/**
 * Mapeia a coluna de estado textual do Karaf (ex: "Active", "Resolved") para o
 * enum tipado de KarafBundleInfo. Compartilhado pelos dois formatos de saída
 * de "bundle:list" (colunas por pipe e por colchetes) parseados em listBundlesParsed.
 */
function parseBundleState(stateStr: string): KarafBundleInfo['state'] {
  if (/Active/i.test(stateStr)) return 'Active';
  if (/Resolved/i.test(stateStr)) return 'Resolved';
  if (/Installed/i.test(stateStr)) return 'Installed';
  if (/Starting/i.test(stateStr)) return 'Starting';
  if (/Stopping/i.test(stateStr)) return 'Stopping';
  return 'Unknown';
}

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
      const inRoot = path.join(settings.karafPath, custom);
      if (fs.existsSync(inRoot)) {
        return inRoot;
      }
    }

    const candidates = [
      path.join(settings.karafPath, 'bin', 'winthor.bat'),
      path.join(settings.karafPath, 'bin', 'karaf.bat'),
      path.join(settings.karafPath, 'bin', 'karaf.sh'),
      path.join(settings.karafPath, 'bin', 'karaf'),
      path.join(settings.karafPath, 'winthor.bat'),
      path.join(settings.karafPath, 'karaf.bat')
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return null;
  }

  public getResolvedJavaEnv(customDebugPort?: number): NodeJS.ProcessEnv {
    const settings = this.configService.getSettings();
    const configuredJdk = settings.jdkPath && fs.existsSync(settings.jdkPath) ? settings.jdkPath : null;
    const chosenJdk = configuredJdk || process.env.JAVA_HOME;

    const childEnv: NodeJS.ProcessEnv = { ...process.env };
    if (chosenJdk) {
      childEnv.JAVA_HOME = chosenJdk;
    }

    if (process.platform === 'win32') {
      // No Windows, variáveis de ambiente são case-insensitive no sistema operacional,
      // mas objetos JS são case-sensitive. Se process.env contiver "Path" (padrão do Windows)
      // e o código definisse apenas "PATH", o Node/libuv enviava ambas ou priorizava a vazia,
      // excluindo C:\Windows\System32 e gerando "spawn cmd.exe ENOENT".
      const existingPathKey = Object.keys(childEnv).find((k) => k.toUpperCase() === 'PATH');
      const currentPath = (existingPathKey ? childEnv[existingPathKey] : '') || '';

      const sysRoot = childEnv.SystemRoot || process.env.SystemRoot || 'C:\\Windows';
      // path.win32.join (não path.join) garante separador "\" mesmo quando este processo Node
      // roda em host não-Windows (ex: suíte de testes em CI Linux simulando process.platform).
      const sys32 = path.win32.join(sysRoot, 'System32');

      const pathEntries = currentPath.split(';').filter(Boolean);

      if (childEnv.JAVA_HOME) {
        const jdkBin = path.win32.join(childEnv.JAVA_HOME, 'bin');
        if (!pathEntries.some((p) => p.toLowerCase() === jdkBin.toLowerCase())) {
          pathEntries.unshift(jdkBin);
        }
      }

      if (!pathEntries.some((p) => p.toLowerCase() === sys32.toLowerCase())) {
        pathEntries.push(sys32);
      }

      const updatedPath = pathEntries.join(';');

      // Remove todas as chaves variantes de PATH para evitar duplicatas conflitantes
      for (const k of Object.keys(childEnv)) {
        if (k.toUpperCase() === 'PATH') {
          delete childEnv[k];
        }
      }

      // Define uniformemente tanto Path quanto PATH para compatibilidade absoluta
      childEnv.Path = updatedPath;
      childEnv.PATH = updatedPath;

      if (!childEnv.SystemRoot) childEnv.SystemRoot = sysRoot;
      if (!childEnv.ComSpec) childEnv.ComSpec = process.env.ComSpec || process.env.COMSPEC || path.win32.join(sys32, 'cmd.exe');
    }

    // Configura dimensões do terminal para que ferramentas CLI do Karaf (como feature:list e bundle:list)
    // formatem tabelas sem quebrar cada célula em múltiplas linhas (evita limite estreito padrão de 80 colunas).
    childEnv.COLUMNS = '300';
    childEnv.LINES = '1000';

    if (process.platform === 'win32') {
      // No Windows, NÃO definir TERM como 'xterm' ou 'xterm-256color'.
      // Quando TERM=xterm está presente no ambiente no Windows, a biblioteca JLine do Karaf
      // instancia UnixTerminal() em vez de WindowsTerminal.
      // Isso faz o JLine emitir sequências VT100 não suportadas no cmd.exe ao editar a linha
      // (ex: \x1b[P para delete, \x1b[1@ para insert), que aparecem no console como setas
      // literais (←[P, +[P, +[1@) em cima do texto digitado ao apagar ou navegar com as setas.
      delete childEnv.TERM;
    } else {
      childEnv.TERM = 'xterm-256color';
    }

    // Garante que o processo Java/Karaf inicialize o console em UTF-8 para não corromper acentuação
    childEnv.JAVA_TOOL_OPTIONS = (childEnv.JAVA_TOOL_OPTIONS ? childEnv.JAVA_TOOL_OPTIONS + ' ' : '') + '-Dfile.encoding=UTF-8';

    // Se o agente OpenTelemetry estiver presente no Karaf, anexa-o automaticamente via JAVA_TOOL_OPTIONS
    // para alimentar o Cockpit APM sem requerer alteração manual de scripts
    if (settings.karafPath) {
      const agentCandidates = [
        path.join(settings.karafPath, 'bin', 'opentelemetry-javaagent.jar'),
        path.join(settings.karafPath, 'opentelemetry-javaagent.jar')
      ];
      const agentJar = agentCandidates.find((c) => fs.existsSync(c));
      if (agentJar && !childEnv.JAVA_TOOL_OPTIONS?.includes('opentelemetry-javaagent.jar')) {
        childEnv.JAVA_TOOL_OPTIONS += ` -javaagent:"${agentJar}" ${buildOtelJavaAgentProperties().join(' ')}`;
      }
    }

    if (!childEnv.LANG) childEnv.LANG = 'pt_BR.UTF-8';
    if (!childEnv.LC_ALL) childEnv.LC_ALL = 'pt_BR.UTF-8';

    // Injeta porta de debug configurada no Cockpit para o JDWP do Karaf / WinThor
    const debugPort = customDebugPort || settings.karafDebugPort || 5005;
    childEnv.JAVA_DEBUG_PORT = String(debugPort);
    childEnv.JAVA_DEBUG_OPTS = `-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=${debugPort}`;

    return childEnv;
  }

  public async executeKarafCommand(
    command: string,
    onChunk: (chunk: string) => void,
    credentials?: { user?: string; pass?: string; port?: number }
  ): Promise<{ code: number; stdout: string; stderr: string }> {
    if (!isSafeKarafCommand(command)) {
      const errMsg = `[ERRO DE SEGURANÇA] Comando Karaf rejeitado: contém caracteres de controle proibidos ou formato inválido.\r\n`;
      onChunk(errMsg);
      return { code: 1, stdout: '', stderr: errMsg };
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
      return { code: 1, stdout: '', stderr: errMsg };
    }

    const clientArgs = sshPort && sshPort !== 8101
      ? ['-u', user, '-p', pass, '-a', String(sshPort), command]
      : ['-u', user, '-p', pass, command];

    const isWin = process.platform === 'win32';
    const childEnv = this.getResolvedJavaEnv();

    const res = isWin
      ? await runCapturedProcess('cmd.exe', ['/c', karafClient, ...clientArgs], { cwd: path.dirname(karafClient), env: childEnv }, onChunk, 30000)
      : await runCapturedProcess(karafClient, clientArgs, { cwd: path.dirname(karafClient), env: childEnv }, onChunk, 30000);

    // Karaf client.bat no Windows ou SSH shell frequentemente retorna exit code 0 mesmo
    // quando o comando falha no contêiner OSGi (ex: "Error executing command: No matching features...").
    // Limpamos sequências de escape ANSI e inspecionamos stdout/stderr para detectar falhas reais.
    // eslint-disable-next-line no-control-regex -- ESC (0x1B) e o marcador real da sequencia de escape ANSI a remover
    const cleanStdout = (res.stdout || '').replace(/[\u001b\x1b]\[[0-9;]*[a-zA-Z]/g, '').replace(/\[[0-9;]+m/g, '');
    // eslint-disable-next-line no-control-regex -- ESC (0x1B) e o marcador real da sequencia de escape ANSI a remover
    const cleanStderr = (res.stderr || '').replace(/[\u001b\x1b]\[[0-9;]*[a-zA-Z]/g, '').replace(/\[[0-9;]+m/g, '');
    const cleanCombined = `${cleanStdout}\n${cleanStderr}`;

    const isLogDisplay = command.trim().startsWith('log:display');
    const karafErrorMatch = !isLogDisplay
      ? cleanCombined.match(/(?:Error executing command(?: on bundles)?|Command not found|Failed to get the session|Authentication failed):\s*([^\r\n]+)/i)
      : (cleanCombined.trim().startsWith('Error executing command:') ? cleanCombined.match(/Error executing command:\s*([^\r\n]+)/i) : null);

    if (karafErrorMatch) {
      const errLine = karafErrorMatch[0].trim();
      const finalStderr = res.stderr && res.stderr.trim().length > 0 ? `${res.stderr}\r\n${errLine}` : errLine;

      if (/No matching features for/i.test(errLine)) {
        onChunk(`\r\n💡 [DICA] O Karaf não encontrou a feature no repositório. Verifique se o atributo name="..." no features.xml do projeto coincide com o nome informado no comando.\r\n`);
      }

      return {
        code: res.code !== 0 ? res.code : 1,
        stdout: res.stdout,
        stderr: finalStderr
      };
    }

    // Fallback inteligente para comandos de log caso a saída via SSH esteja vazia
    if (command.startsWith('log:display') && res.code === 0 && !res.stdout.trim() && settings.karafPath) {
      const candidates = [
        path.join(settings.karafPath, 'data', 'log', 'winthor.log'),
        path.join(settings.karafPath, 'data', 'log', 'karaf.log')
      ];
      for (const logFile of candidates) {
        if (fs.existsSync(logFile)) {
          try {
            const content = fs.readFileSync(logFile, 'utf-8');
            const allLines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
            const nMatch = command.match(/-n\s+(\d+)/);
            const count = nMatch ? parseInt(nMatch[1], 10) : 50;
            const tailLines = allLines.slice(-count);
            if (tailLines.length > 0) {
              const note = `[INFO] Buffer em memória vazio. Exibindo últimas ${tailLines.length} linhas de ${path.basename(logFile)}:\r\n\r\n`;
              onChunk(note);
              const outputText = tailLines.join('\r\n') + '\r\n';
              onChunk(outputText);
              return { code: 0, stdout: note + outputText, stderr: '' };
            }
          } catch {
            // Ignora falha de leitura
          }
        }
      }
      const emptyNote = `[INFO] O buffer de logs em memória do Karaf está vazio no momento (nenhum registro recente).\r\n`;
      onChunk(emptyNote);
      return { code: 0, stdout: emptyNote, stderr: '' };
    }

    // Se o comando for log:clear e executou com sucesso (saída normalmente vazia), envia mensagem de confirmação
    if (command.trim() === 'log:clear' && res.code === 0 && !res.stdout.trim()) {
      const confirmMsg = `[ OK ] Buffer de logs em memória do Karaf (log:clear) limpo com sucesso.\r\n`;
      onChunk(confirmMsg);
      return { code: 0, stdout: confirmMsg, stderr: '' };
    }

    // Feedback para qualquer outro comando que executou com sucesso sem produzir saída
    if (res.code === 0 && !res.stdout.trim() && !res.stderr.trim()) {
      const okMsg = `[ OK ] Comando "${command}" executado com sucesso no Karaf (sem saída no console).\r\n`;
      onChunk(okMsg);
      return { code: 0, stdout: okMsg, stderr: '' };
    }

    return res;
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

  /**
   * Lê o log interno do container Karaf (Pax Logging, via `log:display`) — diferente do
   * stdout do processo embedded persistido em KarafLogPersistenceService: este é o log real
   * da aplicação dentro do OSGi, funciona contra qualquer Karaf acessível por SSH (local ou
   * remoto), e reflete o que os bundles de fato logaram, não a saída do shell interativo.
   */
  public async getKarafLog(
    lines: number = 200,
    credentials?: { user?: string; pass?: string; port?: number }
  ): Promise<{ success: boolean; output: string }> {
    const safeLines = Math.min(Math.max(1, Math.floor(lines) || 200), 5000);
    const res = await this.executeKarafCommand(`log:display -n ${safeLines}`, () => {}, credentials);
    // eslint-disable-next-line no-control-regex
    const cleanOutput = (res.stdout || res.stderr || '').replace(/\x1b\[[0-9;]*m/g, '');
    return { success: res.code === 0, output: cleanOutput };
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
      const cmdExe = childEnv.ComSpec || process.env.ComSpec || process.env.COMSPEC || 'cmd.exe';
      this.embeddedKarafProcess = isWin
        ? spawn(cmdExe, ['/c', path.basename(exeFile), 'debug'], {
            cwd: karafBin,
            shell: false,
            env: childEnv
          })
        : spawn(exeFile, ['debug'], {
            cwd: karafBin,
            shell: false,
            // detached: true cria o processo em seu próprio grupo, permitindo que
            // stopEmbeddedKaraf mate a árvore inteira via process.kill(-pid) no
            // Linux/macOS (sem isso, o kill de grupo falhava silenciosamente e
            // os subprocessos JVM/OSGi filhos sobreviviam).
            detached: true,
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
    onChunk: (chunk: string) => void,
    trigger: DeployTrigger = 'ui',
    projectPath?: string
  ): Promise<{ success: boolean; error?: string }> {
    const startedAt = new Date().toISOString();
    const t0 = Date.now();

    onChunk(`\r\n==========================================\r\n`);
    onChunk(`INICIANDO DEPLOY NO KARAF LOCAL\r\n`);
    onChunk(`==========================================\r\n`);

    onChunk(`\r\n[1/2] Adicionando repositório Maven...\r\n`);
    const repoRes = await this.executeKarafCommand(request.repoUrl, onChunk, {
      user: request.user,
      pass: request.pass,
      port: request.port
    });
    const repoCombined = `${repoRes.stdout}\n${repoRes.stderr || ''}`;
    if (repoRes.code !== 0 && !repoCombined.includes('already registered')) {
      onChunk(`\r\n[AVISO] O comando de repositório retornou código ${repoRes.code}, prosseguindo para instalação...\r\n`);
    }

    onChunk(`\r\n[2/2] Instalando Feature no contêiner OSGi...\r\n`);
    const installRes = await this.executeKarafCommand(request.featureInstall, onChunk, {
      user: request.user,
      pass: request.pass,
      port: request.port
    });

    let result: { success: boolean; error?: string };
    if (installRes.code === 0) {
      onChunk(`\r\n==========================================\r\n`);
      onChunk(`✨ DEPLOY FINALIZADO COM SUCESSO!\r\n`);
      onChunk(`==========================================\r\n`);
      result = { success: true };
    } else {
      onChunk(`\r\n[ERRO] Falha na instalação da feature (Código ${installRes.code}).\r\n`);
      result = { success: false, error: installRes.stderr || 'Erro na instalação' };
    }

    this.recordDeployHistory(request, result, startedAt, Date.now() - t0, trigger, projectPath);
    return result;
  }

  public async runMavenBuild(
    projectPath: string,
    skipTests: boolean = true,
    onChunk: (chunk: string) => void
  ): Promise<{ code: number; stdout: string; stderr: string }> {
    onChunk(`\r\n==========================================\r\n`);
    onChunk(`🔨 EXECUTANDO COMPILAÇÃO MAVEN (mvn clean install)\r\n`);
    onChunk(`Diretório: ${projectPath}\r\n`);
    onChunk(`==========================================\r\n`);

    if (!fs.existsSync(projectPath)) {
      const err = `[ERRO] Diretório do projeto não encontrado: ${projectPath}\r\n`;
      onChunk(err);
      return { code: 1, stdout: '', stderr: err };
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

    const result = isWin
      ? await runCapturedProcess('cmd.exe', ['/c', cmd, ...args], { cwd: projectPath }, onChunk)
      : await runCapturedProcess(cmd, args, { cwd: projectPath }, onChunk);

    onChunk(
      result.code === 0
        ? `\r\n[SUCESSO] Compilação Maven concluída com sucesso!\r\n`
        : `\r\n[ERRO] Falha na compilação Maven (Código de saída: ${result.code}).\r\n`
    );
    return result;
  }

  public async buildAndDeployMaven(
    request: KarafDeployRequest,
    projectPath: string,
    skipTests: boolean,
    onChunk: (chunk: string) => void,
    trigger: DeployTrigger = 'ui'
  ): Promise<{ success: boolean; error?: string }> {
    const startedAt = new Date().toISOString();
    const t0 = Date.now();

    const buildRes = await this.runMavenBuild(projectPath, skipTests, onChunk);
    if (buildRes.code !== 0) {
      onChunk(`\r\n==========================================\r\n`);
      onChunk(`❌ DEPLOY ABORTADO: A compilação Maven falhou.\r\n`);
      onChunk(`==========================================\r\n`);
      const result = { success: false, error: 'Falha na compilação Maven' };
      this.recordDeployHistory(request, result, startedAt, Date.now() - t0, trigger, projectPath);
      return result;
    }

    return this.deploy(request, onChunk, trigger, projectPath);
  }

  /** Extrai groupId/artifactId/version de um comando "feature:repo-add mvn:g/a/v/xml/features", quando o projeto de origem não está disponível pra ler o pom.xml direto (ex: deploy manual sem projectPath). */
  private extractCoordsFromRepoUrl(repoUrl: string): { groupId: string; artifactId: string; version: string } | null {
    const match = repoUrl.match(/mvn:([^/\s]+)\/([^/\s]+)\/([^/\s]+)/);
    if (!match) return null;
    return { groupId: match[1], artifactId: match[2], version: match[3] };
  }

  /** Grava uma entrada no histórico persistido de deploys Karaf (settings.karafDeployHistory), mesmo padrão de BackupSchedulerService.recordHistory. */
  private recordDeployHistory(
    request: KarafDeployRequest,
    result: { success: boolean; error?: string },
    startedAt: string,
    durationMs: number,
    trigger: DeployTrigger,
    projectPath?: string
  ): void {
    const coords = (projectPath ? this.parseProjectPomOrBat(projectPath) : null) || this.extractCoordsFromRepoUrl(request.repoUrl);

    const entry: KarafDeployHistoryEntry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      projectName: coords?.artifactId,
      groupId: coords?.groupId,
      artifactId: coords?.artifactId,
      version: coords?.version,
      repoUrl: request.repoUrl,
      featureInstall: request.featureInstall,
      success: result.success,
      message: result.error,
      startedAt,
      durationMs,
      trigger
    };

    const history = this.configService.getSettings().karafDeployHistory || [];
    const updated = [entry, ...history].slice(0, MAX_DEPLOY_HISTORY_ENTRIES);
    this.configService.saveSettings({ karafDeployHistory: updated });
  }

  /** Lista o histórico persistido de deploys/builds Karaf, mais recente primeiro. */
  public getDeployHistory(): KarafDeployHistoryEntry[] {
    return this.configService.getSettings().karafDeployHistory || [];
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
          const version = parts[parts.length - 2] || '';
          const name = parts[parts.length - 1] || '';
          bundles.push({ id, state: parseBundleState(parts[1]), level: parts[2], version, name, symbolicName: name });
          continue;
        }
      }

      // Formato colchetes: [ 123] [Active     ] [            ] [   80] My Name (1.0.0)
      const bracketMatch = trimmed.match(
        /^\[\s*(\d+)\]\s*\[([^\]]+)\]\s*(?:\[([^\]]*)\])?\s*\[\s*(\d+)\s*\]\s*(.+?)(?:\s*\(([^)]+)\))?$/
      );
      if (bracketMatch) {
        const id = bracketMatch[1];
        const blueprint = bracketMatch[3]?.trim();
        const level = bracketMatch[4]?.trim();
        const name = bracketMatch[5]?.trim() || '';
        const version = bracketMatch[6]?.trim() || '';

        bundles.push({ id, state: parseBundleState(bracketMatch[2].trim()), blueprint, level, name, version, symbolicName: name });
      }
    }

    return bundles;
  }

  /**
   * Executa "feature:list -i" e retorna a lista estruturada de Features Karaf instaladas.
   */
  public async listInstalledFeatures(
    credentials?: { user?: string; pass?: string; port?: number }
  ): Promise<KarafFeatureInfo[]> {
    const dummyChunk = () => {};
    const res = await this.executeKarafCommand('feature:list -i', dummyChunk, credentials);
    if (res.code !== 0 || !res.stdout) return [];

    const lines = res.stdout.split(/\r?\n/);
    const features: KarafFeatureInfo[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (
        !trimmed ||
        trimmed.startsWith('===') ||
        trimmed.startsWith('---') ||
        trimmed.startsWith('───') ||
        trimmed.includes('Name |') ||
        trimmed.includes('Name │') ||
        trimmed.toLowerCase().startsWith('name ')
      ) {
        continue;
      }

      // Formato colunas por pipe (| ou │)
      if (trimmed.includes('|') || trimmed.includes('│')) {
        const parts = trimmed.split(/[|│]/).map((p) => p.trim());
        if (parts.length >= 4) {
          const name = parts[0];
          if (name.toLowerCase() === 'name') continue;

          const version = parts[1] || '';
          const required = parts[2]?.toLowerCase() === 'x' || parts[2]?.toLowerCase() === 'true';
          const state = parts[3] || 'Started';
          const repository = parts[4] || '';
          const description = parts.slice(5).join(' ') || '';

          const isWinthor = /winthor|totvs/i.test(name) || /winthor|totvs/i.test(repository);

          features.push({
            name,
            version,
            required,
            state,
            repository,
            description,
            isWinthor
          });
        }
      }
    }

    return features;
  }

  /**
   * Executa ação de ciclo de vida em um bundle específico (start, stop, restart, uninstall).
   */
  public async manageBundle(
    action: BundleAction,
    bundleId: string,
    credentials?: { user?: string; pass?: string; port?: number },
    onChunk: (chunk: string) => void = () => {}
  ): Promise<{ success: boolean; output: string }> {
    if (!BUNDLE_ACTIONS.includes(action)) {
      return { success: false, output: 'Ação de bundle não permitida.' };
    }
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
        onChunk(chunk);
      },
      credentials
    );

    return {
      success: res.code === 0,
      output: output || res.stdout || res.stderr
    };
  }

  /**
   * Executa ação de ciclo de vida em lote em múltiplos bundles (start, stop, restart, refresh, uninstall).
   */
  public async manageBundlesBatch(
    action: BundleAction,
    bundleIds: string[],
    credentials?: { user?: string; pass?: string; port?: number },
    onChunk: (chunk: string) => void = () => {}
  ): Promise<{ success: boolean; output: string; processedCount: number }> {
    if (!BUNDLE_ACTIONS.includes(action)) {
      return { success: false, output: 'Ação de bundle não permitida.', processedCount: 0 };
    }
    const cleanIds = (bundleIds || [])
      .map((id) => (typeof id === 'string' ? id.trim() : String(id).trim()))
      .filter((id) => /^\d+$/.test(id));

    if (cleanIds.length === 0) {
      return { success: false, output: 'Nenhum ID de bundle válido informado.', processedCount: 0 };
    }

    const command = `bundle:${action} ${cleanIds.join(' ')}`;
    let output = '';
    const res = await this.executeKarafCommand(
      command,
      (chunk) => {
        output += chunk;
        onChunk(chunk);
      },
      credentials
    );

    if (action === 'uninstall' && res.code === 0) {
      await this.executeKarafCommand(
        'bundle:refresh',
        (chunk) => {
          output += chunk;
          onChunk(chunk);
        },
        credentials
      );
    }

    return {
      success: res.code === 0,
      output: output || res.stdout || res.stderr,
      processedCount: cleanIds.length
    };
  }

  /**
   * Obtém detalhes estruturados do bundle inspecionando cabeçalhos do manifesto
   * e fiações de capacidades OSGi.
   */
  public async getBundleDetails(
    bundleId: string,
    credentials?: { user?: string; pass?: string; port?: number }
  ): Promise<KarafBundleDetails | null> {
    const cleanId = bundleId.trim();
    if (!/^\d+$/.test(cleanId)) return null;

    const dummyChunk = () => {};
    const headersRes = await this.executeKarafCommand(`bundle:headers ${cleanId}`, dummyChunk, credentials);
    const capsRes = await this.executeKarafCommand(`bundle:capabilities ${cleanId}`, dummyChunk, credentials);

    const rawHeaders = parseManifestHeaders(headersRes.stdout);
    const dependentBundles = parseCapabilitiesWiredBundles(capsRes.stdout);

    const symbolicName = rawHeaders['Bundle-SymbolicName']?.split(';')[0]?.trim() || '';
    const name = rawHeaders['Bundle-Name']?.trim() || symbolicName || `Bundle ${cleanId}`;
    const version = rawHeaders['Bundle-Version']?.trim() || '0.0.0';
    const location = rawHeaders['Bundle-Update-Location'] || rawHeaders['Bundle-Location'] || '';

    const exportedPackages = parseClauseList(rawHeaders['Export-Package']);
    const importedPackages = parseClauseList(rawHeaders['Import-Package']);
    const requiredBundles = parseClauseList(rawHeaders['Require-Bundle']);

    // Diagnóstico se o bundle estiver em estado não-ativo ou se diag estiver disponível
    let diag: string | undefined;
    const diagRes = await this.executeKarafCommand(`bundle:diag ${cleanId}`, dummyChunk, credentials);
    if (diagRes.stdout && diagRes.stdout.trim().length > 0) {
      diag = diagRes.stdout.trim();
    }

    return {
      id: cleanId,
      name,
      symbolicName,
      version,
      state: 'Active', // Atualizado pelo chamador se houver lista
      location,
      exportedPackages,
      importedPackages,
      requiredBundles,
      dependentBundles,
      rawHeaders,
      diag
    };
  }

  /**
   * Verifica dependências de um bundle existente antes de desinstalar ou alterar,
   * alertando sobre potenciais impactos no runtime OSGi.
   */
  public async checkBundleDependencies(
    bundleId: string,
    credentials?: { user?: string; pass?: string; port?: number }
  ): Promise<BundleDependencyCheckResult> {
    const cleanId = bundleId.trim();
    const details = await this.getBundleDetails(cleanId, credentials);

    if (!details) {
      return {
        bundleId: cleanId,
        alreadyInstalled: false,
        dependentBundles: [],
        exportedPackages: [],
        riskLevel: 'LOW',
        warningMessage: 'Bundle não encontrado no runtime OSGi.',
        canProceed: true
      };
    }

    const hasDependents = details.dependentBundles.length > 0;
    const hasExports = details.exportedPackages.length > 0;

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    let warningMessage = 'Nenhum bundle dependente detectado. É seguro prosseguir com a operação.';

    if (hasDependents) {
      riskLevel = 'HIGH';
      warningMessage = `Atenção: ${details.dependentBundles.length} bundle(s) dependem diretamente deste módulo. Desinstalá-lo quebrará esses módulos ativos.`;
    } else if (hasExports) {
      riskLevel = 'MEDIUM';
      warningMessage = `Este bundle exporta ${details.exportedPackages.length} pacote(s) OSGi. Outros módulos que utilizem essas classes podem ser afetados.`;
    }

    return {
      bundleId: cleanId,
      name: details.name,
      symbolicName: details.symbolicName,
      targetVersion: details.version,
      alreadyInstalled: true,
      dependentBundles: details.dependentBundles,
      exportedPackages: details.exportedPackages,
      riskLevel,
      warningMessage,
      canProceed: true
    };
  }

  /**
   * Verifica dependências e conflitos antes de instalar um novo bundle ou outra versão.
   * Identifica se já existe uma versão instalada e avalia o impacto da substituição.
   */
  public async checkInstallDependencies(
    target: { location?: string; symbolicName?: string; version?: string },
    credentials?: { user?: string; pass?: string; port?: number }
  ): Promise<BundleDependencyCheckResult> {
    const installed = await this.listBundlesParsed(credentials);
    const targetLoc = (target.location || '').trim();

    // Tentar extrair artifactId ou symbolicName a partir de mvn:groupId/artifactId/version
    let derivedName = (target.symbolicName || '').trim().toLowerCase();
    if (!derivedName && targetLoc.startsWith('mvn:')) {
      const parts = targetLoc.replace(/^mvn:/, '').split('/');
      if (parts.length >= 2) {
        derivedName = parts[1].toLowerCase();
      }
    }

    // Busca se já existe um bundle com mesmo nome ou symbolicName no container.
    // Checa os dois campos (não só symbolicName): o artifactId Maven do target
    // costuma bater com o "Name" exibido pelo bundle:list, mas raramente bate
    // com o Bundle-SymbolicName OSGi completo (ex: "br.com.totvs.winthor.faturamento"
    // vs artifactId "rotina-faturamento-service") — usar só um dos dois deixava
    // colisões reais passando batido.
    const matchesDerivedName = (value?: string): boolean => {
      const v = (value || '').toLowerCase();
      return !!derivedName && !!v && (v === derivedName || v.includes(derivedName) || derivedName.includes(v));
    };
    const existing = installed.find(
      (b) => matchesDerivedName(b.symbolicName) || matchesDerivedName(b.name)
    );

    if (existing) {
      const existingDetails = await this.getBundleDetails(existing.id, credentials);
      const dependents = existingDetails?.dependentBundles || [];
      const hasDependents = dependents.length > 0;

      return {
        bundleId: existing.id,
        targetUrl: target.location,
        targetVersion: target.version || 'desconhecida',
        name: existing.name,
        symbolicName: existing.symbolicName,
        alreadyInstalled: true,
        existingBundle: existing,
        dependentBundles: dependents,
        exportedPackages: existingDetails?.exportedPackages || [],
        riskLevel: hasDependents ? 'HIGH' : 'MEDIUM',
        warningMessage: `O bundle "${existing.name}" já está instalado (versão atual: ${existing.version}, nova versão alvo: ${target.version || 'desconhecida'}). ${
          hasDependents
            ? `${dependents.length} bundle(s) dependente(s) serão reconectados.`
            : 'Nenhum dependente ativo no momento.'
        }`,
        canProceed: true
      };
    }

    return {
      targetUrl: target.location,
      targetVersion: target.version,
      alreadyInstalled: false,
      dependentBundles: [],
      exportedPackages: [],
      riskLevel: 'LOW',
      warningMessage: 'Novo bundle no container OSGi. Nenhuma colisão com versão existente detectada.',
      canProceed: true
    };
  }

  /**
   * Instala um novo bundle no Karaf a partir de coordenada Maven ou arquivo local.
   */
  public async installBundle(
    request: InstallBundleRequest,
    onChunk: (chunk: string) => void = () => {}
  ): Promise<{ success: boolean; bundleId?: string; state?: string; diag?: string; output: string }> {
    let loc = (request.location || '').trim();
    if (!loc) {
      return { success: false, output: 'Localização ou coordenada do bundle não informada.' };
    }

    // Normaliza caminhos de arquivo locais no Windows para file:/
    if (!loc.startsWith('mvn:') && !loc.startsWith('file:') && !loc.startsWith('http:') && !loc.startsWith('https:')) {
      loc = `file:/${loc.replace(/\\/g, '/')}`;
    }

    const flag = request.startImmediately !== false ? '-s ' : '';
    const cmd = `bundle:install ${flag}"${loc}"`;

    if (!isSafeKarafCommand(cmd)) {
      return { success: false, output: 'Comando de instalação contém caracteres inválidos.' };
    }

    onChunk(`> ${cmd}\r\n`);
    let output = '';
    const res = await this.executeKarafCommand(
      cmd,
      (chunk) => {
        output += chunk;
        onChunk(chunk);
      },
      request.credentials
    );

    if (res.code !== 0) {
      return { success: false, output: output || res.stderr || 'Falha ao instalar bundle' };
    }

    // Tentar extrair o ID do novo bundle retornado pelo Karaf (ex: "Bundle ID: 123" ou apenas "123")
    const match = (res.stdout || '').match(/(?:Bundle ID:\s*|ID:\s*|^)\s*(\d+)/m);
    const newId = match ? match[1] : undefined;

    let diag: string | undefined;
    if (newId) {
      await this.executeKarafCommand(`bundle:refresh ${newId}`, () => {}, request.credentials);
      const diagRes = await this.executeKarafCommand(`bundle:diag ${newId}`, () => {}, request.credentials);
      if (diagRes.stdout && diagRes.stdout.trim().length > 0) {
        diag = diagRes.stdout.trim();
      }
    }

    return {
      success: true,
      bundleId: newId,
      diag,
      output: output || res.stdout
    };
  }

  /**
   * Desinstala um bundle existente do runtime OSGi e limpa fiações via bundle:refresh.
   */
  public async uninstallBundle(
    bundleId: string,
    credentials?: { user?: string; pass?: string; port?: number },
    onChunk: (chunk: string) => void = () => {}
  ): Promise<{ success: boolean; output: string }> {
    const cleanId = bundleId.trim();
    if (!/^\d+$/.test(cleanId)) {
      return { success: false, output: 'ID do bundle inválido.' };
    }

    let output = '';
    const res = await this.executeKarafCommand(
      `bundle:uninstall ${cleanId}`,
      (chunk) => {
        output += chunk;
        onChunk(chunk);
      },
      credentials
    );

    if (res.code === 0) {
      await this.executeKarafCommand('bundle:refresh', (chunk) => {
        output += chunk;
        onChunk(chunk);
      }, credentials);
    }

    return {
      success: res.code === 0,
      output: output || res.stdout || res.stderr
    };
  }

  /**
   * Desinstala uma Feature Karaf de forma definitiva utilizando `feature:uninstall -r`.
   * A flag -r remove a feature e limpa/desmonta os bundles associados, impedindo
   * que retornem na reinicialização do container Karaf.
   */
  public async uninstallFeature(
    featureName: string,
    version?: string,
    credentials?: { user?: string; pass?: string; port?: number },
    onChunk: (chunk: string) => void = () => {}
  ): Promise<{ success: boolean; output: string }> {
    const cleanName = featureName.trim();
    if (!cleanName || !isSafeKarafCommand(cleanName)) {
      return { success: false, output: 'Nome da feature inválido ou não seguro.' };
    }

    const cleanVer = version?.trim();
    const target = cleanVer && isSafeKarafCommand(cleanVer) ? `${cleanName}/${cleanVer}` : cleanName;
    const command = `feature:uninstall -r ${target}`;

    let output = '';
    const res = await this.executeKarafCommand(
      command,
      (chunk) => {
        output += chunk;
        onChunk(chunk);
      },
      credentials
    );

    return {
      success: res.code === 0,
      output: output || res.stdout || res.stderr
    };
  }

  /**
   * Instala / atualiza uma Feature Karaf utilizando `feature:install -r -u`.
   */
  public async installFeature(
    featureName: string,
    version?: string,
    credentials?: { user?: string; pass?: string; port?: number },
    onChunk: (chunk: string) => void = () => {}
  ): Promise<{ success: boolean; output: string }> {
    const cleanName = featureName.trim();
    if (!cleanName || !isSafeKarafCommand(cleanName)) {
      return { success: false, output: 'Nome da feature inválido ou não seguro.' };
    }

    const cleanVer = version?.trim();
    const target = cleanVer && isSafeKarafCommand(cleanVer) ? `${cleanName}/${cleanVer}` : cleanName;
    const command = `feature:install -r -u ${target}`;

    let output = '';
    const res = await this.executeKarafCommand(
      command,
      (chunk) => {
        output += chunk;
        onChunk(chunk);
      },
      credentials
    );

    return {
      success: res.code === 0,
      output: output || res.stdout || res.stderr
    };
  }

  /**
   * Reinstala / atualiza um bundle no runtime OSGi.
   * Opcionalmente executa mvn clean install previamente e recarrega o bundle via bundle:update.
   */
  public async reinstallBundle(
    request: ReinstallBundleRequest,
    onChunk: (chunk: string) => void = () => {}
  ): Promise<{ success: boolean; state?: string; diag?: string; output: string }> {
    const cleanId = request.bundleId.trim();
    if (!/^\d+$/.test(cleanId)) {
      return { success: false, output: 'ID do bundle inválido.' };
    }

    // 1. Compilação Maven opcional se solicitado
    if (request.rebuild && request.projectPath) {
      onChunk(`\r\n[1/3] Compilando projeto Maven antes de reinstalar...\r\n`);
      const buildRes = await this.runMavenBuild(request.projectPath, true, onChunk);
      if (buildRes.code !== 0) {
        return { success: false, output: 'Falha na compilação Maven prévia. Reinstalação cancelada.' };
      }
    }

    // 2. Atualização do bundle via Karaf
    onChunk(`\r\n[2/3] Atualizando bundle ${cleanId} no container OSGi...\r\n`);
    let updateCmd = `bundle:update ${cleanId}`;
    if (request.location && request.location.trim()) {
      let loc = request.location.trim();
      if (!loc.startsWith('mvn:') && !loc.startsWith('file:') && !loc.startsWith('http:')) {
        loc = `file:/${loc.replace(/\\/g, '/')}`;
      }
      updateCmd = `bundle:update ${cleanId} "${loc}"`;
    }

    let output = '';
    const updateRes = await this.executeKarafCommand(
      updateCmd,
      (chunk) => {
        output += chunk;
        onChunk(chunk);
      },
      request.credentials
    );

    if (updateRes.code !== 0) {
      return { success: false, output: output || updateRes.stderr || 'Falha no bundle:update' };
    }

    // 3. Atualizar fiações e garantir inicialização
    onChunk(`\r\n[3/3] Atualizando fiações (bundle:refresh) e iniciando bundle...\r\n`);
    await this.executeKarafCommand(`bundle:refresh ${cleanId}`, onChunk, request.credentials);
    await this.executeKarafCommand(`bundle:start ${cleanId}`, onChunk, request.credentials);

    // Checagem de diagnóstico
    let diag: string | undefined;
    const diagRes = await this.executeKarafCommand(`bundle:diag ${cleanId}`, () => {}, request.credentials);
    if (diagRes.stdout && diagRes.stdout.trim().length > 0) {
      diag = diagRes.stdout.trim();
    }

    return {
      success: true,
      diag,
      output
    };
  }

  /**
   * Atualiza a versão de um bundle existente especificando uma nova versão ou localização.
   */
  public async updateBundleVersion(
    request: UpdateBundleVersionRequest,
    onChunk: (chunk: string) => void = () => {}
  ): Promise<{ success: boolean; output: string }> {
    const cleanId = request.bundleId.trim();
    if (!/^\d+$/.test(cleanId)) {
      return { success: false, output: 'ID do bundle inválido.' };
    }

    let target = request.newVersionOrLocation.trim();
    if (!target) {
      return { success: false, output: 'Nova versão ou localização não informada.' };
    }

    if (!target.startsWith('mvn:') && !target.startsWith('file:') && !target.startsWith('http:')) {
      target = `file:/${target.replace(/\\/g, '/')}`;
    }

    const cmd = `bundle:update ${cleanId} "${target}"`;
    let output = '';
    const res = await this.executeKarafCommand(
      cmd,
      (chunk) => {
        output += chunk;
        onChunk(chunk);
      },
      request.credentials
    );

    if (res.code === 0) {
      await this.executeKarafCommand(`bundle:refresh ${cleanId}`, (chunk) => {
        output += chunk;
        onChunk(chunk);
      }, request.credentials);
      await this.executeKarafCommand(`bundle:start ${cleanId}`, (chunk) => {
        output += chunk;
        onChunk(chunk);
      }, request.credentials);
    }

    return {
      success: res.code === 0,
      output: output || res.stdout || res.stderr
    };
  }
}

/**
 * Utilitário: quebra cláusulas de pacotes do manifesto OSGi respeitando aspas e parênteses.
 */
export function parseClauseList(val?: string): string[] {
  if (!val || typeof val !== 'string') return [];
  const results: string[] = [];
  let current = '';
  let inQuotes = false;
  let inParentheses = 0;

  for (let i = 0; i < val.length; i++) {
    const char = val[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === '(' || char === '[') {
      inParentheses++;
    } else if (char === ')' || char === ']') {
      if (inParentheses > 0) inParentheses--;
    }

    if (char === ',' && !inQuotes && inParentheses === 0) {
      const trimmed = current.trim();
      if (trimmed) results.push(trimmed);
      current = '';
    } else {
      current += char;
    }
  }
  const lastTrimmed = current.trim();
  if (lastTrimmed) results.push(lastTrimmed);

  return results;
}

/**
 * Utilitário: analisa saída do comando bundle:headers e extrai mapa de chaves/valores.
 */
export function parseManifestHeaders(stdout: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (!stdout) return headers;
  const lines = stdout.split(/\r?\n/);
  let currentKey = '';

  for (const line of lines) {
    const match = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*(.*)$/);
    if (match) {
      currentKey = match[1].trim();
      headers[currentKey] = match[2].trim();
    } else if (currentKey && (line.startsWith('\t') || line.startsWith('  '))) {
      const continuation = line.trim();
      if (continuation) {
        headers[currentKey] = headers[currentKey]
          ? `${headers[currentKey]} ${continuation}`
          : continuation;
      }
    }
  }

  return headers;
}

/**
 * Utilitário: analisa saída de bundle:capabilities e extrai lista de bundles dependentes conectados.
 */
export function parseCapabilitiesWiredBundles(stdout: string): KarafBundleDependent[] {
  const dependents: KarafBundleDependent[] = [];
  if (!stdout) return dependents;

  const lines = stdout.split(/\r?\n/);
  let inWiredSection = false;
  let currentReason = 'osgi.wiring';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('osgi.')) {
      currentReason = trimmed.split(';')[0] || 'osgi.wiring';
      inWiredSection = false;
    }

    if (trimmed.toLowerCase().includes('wired to:')) {
      inWiredSection = true;
      continue;
    }

    if (inWiredSection) {
      if (!line.startsWith(' ') && !line.startsWith('\t') && !trimmed.startsWith('[')) {
        inWiredSection = false;
        continue;
      }

      const match = trimmed.match(/^\[\s*(\d+)\s*\]\s*([^([\r\n]+)(?:\s*\(([^)]+)\))?/);
      if (match) {
        const id = match[1].trim();
        const name = match[2].trim();
        const version = match[3]?.trim();
        if (!dependents.some((d) => d.id === id)) {
          dependents.push({
            id,
            name: name || `Bundle ${id}`,
            version,
            reason: currentReason
          });
        }
      }
    }
  }

  return dependents;
}
