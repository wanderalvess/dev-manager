import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import {
  EnvironmentLog,
  EnvironmentResetResult,
  ServiceStatus,
  ServiceState,
  PortStatus,
  ProcessStatus,
  TrackedServiceConfig,
  TrackedProcessConfig,
  EnvironmentAutomationConfig,
  AutomationProfile,
  AutomationStep,
  ProfileExecutionResult,
  detectIdeInfo,
  getWebUrl
} from '../../shared/types';
import {
  ConfigService,
  DEFAULT_TRACKED_SERVICES,
  DEFAULT_TRACKED_PROCESSES,
  DEFAULT_MONITORED_PORTS
} from './ConfigService';
import { KarafService } from './KarafService';
import { DatabaseService } from './DatabaseService';
import { NetworkService } from './NetworkService';
import { execFileAsync, isValidIdentifier } from '../utils/security';
import { checkPortOpen } from '../utils/network';
import { launchProcessSafely } from '../utils/routineLaunchUtils';
import { isWslKaraf, launchWslServerDebug, killWslKarafProcesses } from '../utils/karafWslUtils';

export const TRACKED_SERVICES = DEFAULT_TRACKED_SERVICES;

export class WindowsService {
  private configService: ConfigService;
  private karafService: KarafService;
  private databaseService?: DatabaseService;
  private networkService?: NetworkService;

  // Cache de curta duração (2.5s) e deduplicação de chamadas em voo
  private cachedPortsStatus: { data: PortStatus[]; timestamp: number } | null = null;
  private inFlightPortsCheck: Promise<PortStatus[]> | null = null;

  private cachedProcessesStatus: { data: ProcessStatus[]; timestamp: number } | null = null;
  private inFlightProcessesCheck: Promise<ProcessStatus[]> | null = null;

  private cachedServicesStatus: { data: ServiceStatus[]; timestamp: number } | null = null;
  private inFlightServicesCheck: Promise<ServiceStatus[]> | null = null;

  // Cache de disponibilidade de comando (ex: wt.exe) — evita spawn de where.exe
  // repetido a cada etapa de um perfil multi-step
  private commandAvailabilityCache: Map<string, boolean> = new Map();

  constructor(
    configService: ConfigService,
    karafService: KarafService,
    databaseService?: DatabaseService,
    networkService?: NetworkService
  ) {
    this.configService = configService;
    this.karafService = karafService;
    this.databaseService = databaseService;
    this.networkService = networkService;
  }

  public invalidateStatusCaches(): void {
    this.cachedPortsStatus = null;
    this.cachedProcessesStatus = null;
    this.cachedServicesStatus = null;
  }

  /**
   * Cria uma função de log que registra a entrada no array `logs` (se informado)
   * e repassa para o callback onLog. Evita redefinir o mesmo closure em cada
   * método de execução de perfil/ambiente.
   */
  private makeLogger(
    onLog?: (log: EnvironmentLog) => void,
    logs?: EnvironmentLog[]
  ): (type: EnvironmentLog['type'], message: string) => void {
    return (type, message) => {
      const entry: EnvironmentLog = { timestamp: new Date().toLocaleTimeString(), type, message };
      logs?.push(entry);
      onLog?.(entry);
    };
  }

  /**
   * Dispara uma notificação nativa do sistema. Sem efeito fora do processo principal do
   * Electron (ex: modo servidor Web/Docker via tsx), onde o módulo 'electron' não expõe essa API.
   */
  private async showNativeNotification(title: string, body: string): Promise<void> {
    try {
      const { Notification } = await import('electron');
      if (Notification && Notification.isSupported()) {
        new Notification({ title, body, silent: false }).show();
      }
    } catch {
      // Fora do processo principal do Electron — ignora silenciosamente
    }
  }

  public async checkAdminPrivileges(): Promise<boolean> {
    if (process.platform !== 'win32') {
      return typeof process.getuid === 'function' ? process.getuid() === 0 : true;
    }
    try {
      await execFileAsync('net.exe', ['session']);
      return true;
    } catch {
      return false;
    }
  }

  public async getServiceStatus(serviceName: string): Promise<ServiceState> {
    if (process.platform !== 'win32') {
      return 'STOPPED';
    }
    if (!isValidIdentifier(serviceName)) {
      console.warn(`[Segurança] Nome de serviço inválido rejeitado: ${serviceName}`);
      return 'UNKNOWN';
    }
    try {
      const { stdout } = await execFileAsync('sc.exe', ['query', serviceName]);
      if (stdout.includes('RUNNING')) return 'RUNNING';
      if (stdout.includes('STOPPED')) return 'STOPPED';
      if (stdout.includes('START_PENDING')) return 'START_PENDING';
      if (stdout.includes('STOP_PENDING')) return 'STOP_PENDING';
      return 'UNKNOWN';
    } catch (err: any) {
      if (err?.stdout?.includes('1060') || err?.message?.includes('1060')) {
        return 'NOT_INSTALLED';
      }
      return 'STOPPED';
    }
  }

  public async getAllServicesStatus(customServices?: TrackedServiceConfig[]): Promise<ServiceStatus[]> {
    if (!customServices && this.cachedServicesStatus && Date.now() - this.cachedServicesStatus.timestamp < 2500) {
      return this.cachedServicesStatus.data;
    }
    if (!customServices && this.inFlightServicesCheck) {
      return this.inFlightServicesCheck;
    }

    const runCheck = async () => {
      const settings = this.configService.getSettings();
      const serviceList = (customServices || settings.trackedServices || DEFAULT_TRACKED_SERVICES).filter(
        (s) => s.enabled !== false
      );
      const results = await Promise.all(
        serviceList.map(async (srv) => ({
          name: srv.name,
          displayName: srv.displayName,
          state: await this.getServiceStatus(srv.name)
        }))
      );
      if (!customServices) {
        this.cachedServicesStatus = { data: results, timestamp: Date.now() };
      }
      return results;
    };

    if (customServices) {
      return runCheck();
    }

    this.inFlightServicesCheck = runCheck().finally(() => {
      this.inFlightServicesCheck = null;
    });
    return this.inFlightServicesCheck;
  }

  public async getProcessesStatus(customProcesses?: TrackedProcessConfig[]): Promise<ProcessStatus[]> {
    if (!customProcesses && this.cachedProcessesStatus && Date.now() - this.cachedProcessesStatus.timestamp < 2500) {
      return this.cachedProcessesStatus.data;
    }
    if (!customProcesses && this.inFlightProcessesCheck) {
      return this.inFlightProcessesCheck;
    }

    const runCheck = async () => {
      const settings = this.configService.getSettings();
      const processList = (customProcesses || settings.trackedProcesses || DEFAULT_TRACKED_PROCESSES).filter(
        (p) => p.enabled !== false
      );

      if (process.platform === 'win32') {
        // Otimização: Uma única chamada ao tasklist.exe obtém todos os processos em execução
        const runningImages = new Set<string>();
        try {
          const { stdout } = await execFileAsync('tasklist.exe', ['/FO', 'CSV', '/NH']);
          const lines = stdout.split(/\r?\n/);
          for (const line of lines) {
            const match = line.match(/^"([^"]+)"/);
            if (match) {
              runningImages.add(match[1].toLowerCase());
            }
          }
        } catch {
          // fallback silencioso
        }

        const results = processList.map((proc) => ({
          name: proc.name,
          displayName: proc.displayName,
          isRunning: runningImages.has(proc.name.toLowerCase())
        }));

        if (!customProcesses) {
          this.cachedProcessesStatus = { data: results, timestamp: Date.now() };
        }
        return results;
      }

      const results = await Promise.all(
        processList.map(async (proc) => ({
          name: proc.name,
          displayName: proc.displayName,
          isRunning: await this.isProcessRunning(proc.name)
        }))
      );

      if (!customProcesses) {
        this.cachedProcessesStatus = { data: results, timestamp: Date.now() };
      }
      return results;
    };

    if (customProcesses) {
      return runCheck();
    }

    this.inFlightProcessesCheck = runCheck().finally(() => {
      this.inFlightProcessesCheck = null;
    });
    return this.inFlightProcessesCheck;
  }

  private async batchRun(names: string[], fn: (name: string) => Promise<boolean>): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    await Promise.all(
      names.map(async (name) => {
        results[name] = await fn(name);
      })
    );
    return results;
  }

  public batchStopServices(serviceNames: string[]): Promise<Record<string, boolean>> {
    return this.batchRun(serviceNames, (name) => this.stopService(name));
  }

  public batchStartServices(serviceNames: string[]): Promise<Record<string, boolean>> {
    return this.batchRun(serviceNames, (name) => this.startService(name));
  }

  public batchKillProcesses(imageNames: string[]): Promise<Record<string, boolean>> {
    return this.batchRun(imageNames, (name) => this.killProcess(name));
  }

  public async stopService(serviceName: string): Promise<boolean> {
    this.invalidateStatusCaches();
    if (process.platform !== 'win32') {
      return true;
    }
    if (!isValidIdentifier(serviceName)) {
      console.warn(`[Segurança] Nome de serviço inválido para parada: ${serviceName}`);
      return false;
    }
    try {
      await execFileAsync('net.exe', ['stop', serviceName, '/y']);
      this.invalidateStatusCaches();
      return true;
    } catch (err) {
      console.warn(`Aviso ao parar serviço ${serviceName}:`, err);
      return false;
    }
  }

  public async startService(serviceName: string): Promise<boolean> {
    this.invalidateStatusCaches();
    if (process.platform !== 'win32') {
      return true;
    }
    if (!isValidIdentifier(serviceName)) {
      console.warn(`[Segurança] Nome de serviço inválido para inicialização: ${serviceName}`);
      return false;
    }
    try {
      await execFileAsync('net.exe', ['start', serviceName]);
      this.invalidateStatusCaches();
      return true;
    } catch (err) {
      console.error(`Erro ao iniciar serviço ${serviceName}:`, err);
      return false;
    }
  }

  public async killProcess(imageName: string): Promise<boolean> {
    this.invalidateStatusCaches();
    if (!isValidIdentifier(imageName)) {
      console.warn(`[Segurança] Nome de processo inválido para finalização: ${imageName}`);
      return false;
    }
    try {
      if (process.platform === 'win32') {
        await execFileAsync('taskkill.exe', ['/F', '/IM', imageName, '/T']);
      } else {
        const procName = imageName.replace(/\.exe$/i, '');
        await execFileAsync('pkill', ['-f', procName]);
      }
      this.invalidateStatusCaches();
      return true;
    } catch (err) {
      console.error(`Erro ao finalizar processo ${imageName}:`, err);
      return false;
    }
  }

  public async isProcessRunning(imageName: string): Promise<boolean> {
    if (!isValidIdentifier(imageName)) {
      return false;
    }
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execFileAsync('tasklist.exe', ['/FI', `IMAGENAME eq ${imageName}`]);
        return stdout.toLowerCase().includes(imageName.toLowerCase());
      } else {
        const procName = imageName.replace(/\.exe$/i, '');
        const { stdout } = await execFileAsync('pgrep', ['-f', procName]);
        return !!stdout.trim();
      }
    } catch {
      return false;
    }
  }

  public async launchIntelliJ(): Promise<boolean> {
    const settings = this.configService.getSettings();
    const idePath = settings.intellijPath;
    if (!idePath || !fs.existsSync(idePath)) {
      return false;
    }

    const exe = path.basename(idePath);
    const isRunning = await this.isProcessRunning(exe);
    if (isRunning) {
      return true;
    }

    const dir = path.dirname(idePath);
    try {
      launchProcessSafely(idePath, [], dir);
      return true;
    } catch (err) {
      console.error('Erro ao acionar IDE:', err);
      return false;
    }
  }

  /**
   * Abre qualquer aplicativo local pelo caminho completo do executável (ex: Postman, terminal),
   * sem restrição de pasta como as rotinas (RoutinesService.launchRoutine) — uso previsto para
   * ferramentas externas ao ecossistema Karaf/IDE já cobertas pelos outros launchers.
   */
  public launchExternalApp(fullPath: string): boolean {
    try {
      if (!fullPath || !fs.existsSync(fullPath)) {
        return false;
      }
      const dir = path.dirname(fullPath);
      launchProcessSafely(fullPath, [], dir);
      return true;
    } catch (err) {
      console.error('Erro ao abrir aplicativo externo:', err);
      return false;
    }
  }

  public launchServerDebug(launchMode?: 'wt' | 'cmd', customDebugPort?: number): boolean {
    const settings = this.configService.getSettings();
    if (isWslKaraf(settings)) {
      const hasWt = this.commandAvailabilityCache.get('wt.exe') ?? false;
      return launchWslServerDebug(settings, hasWt, launchMode, customDebugPort);
    }

    const exe = this.karafService.getKarafServerExecutable();
    if (exe && fs.existsSync(exe)) {
      const karafBin = path.dirname(exe);
      try {
        const childEnv = this.karafService.getResolvedJavaEnv(customDebugPort);
        if (process.platform === 'win32') {
          const scriptName = path.basename(exe);
          const cmdExe = childEnv.ComSpec || process.env.ComSpec || process.env.COMSPEC || 'cmd.exe';
          const hasWt = this.commandAvailabilityCache.get('wt.exe') ?? false;
          const useWt = launchMode === 'wt' || (!launchMode && hasWt);

          if (useWt) {
            const wtProc = spawn(
              'wt.exe',
              ['-w', 'dev-manager', 'new-tab', '--title', 'Karaf Debug', '-d', karafBin, 'cmd.exe', '/k', scriptName, 'debug'],
              {
                cwd: karafBin,
                detached: true,
                stdio: 'ignore',
                env: childEnv
              }
            );
            wtProc.on('error', () => {
              // Se wt.exe falhar (ex: não instalado), cai para cmd.exe /c start sem abrir pastas
              spawn(cmdExe, ['/c', 'start', 'Karaf Debug Console', '/d', karafBin, 'cmd.exe', '/k', scriptName, 'debug'], {
                cwd: karafBin,
                detached: true,
                stdio: 'ignore',
                env: childEnv
              }).unref();
            });
            wtProc.unref();
          } else {
            spawn(cmdExe, ['/c', 'start', 'Karaf Debug Console', '/d', karafBin, 'cmd.exe', '/k', scriptName, 'debug'], {
              cwd: karafBin,
              detached: true,
              stdio: 'ignore',
              env: childEnv
            }).unref();
          }
        } else {
          spawn(exe, ['debug'], { cwd: karafBin, detached: true, stdio: 'ignore', env: childEnv }).unref();
        }
        return true;
      } catch (err) {
        console.error('Erro ao acionar Servidor Debug:', err);
        return false;
      }
    }
    return false;
  }

  public async checkPorts(): Promise<PortStatus[]> {
    if (this.cachedPortsStatus && Date.now() - this.cachedPortsStatus.timestamp < 2500) {
      return this.cachedPortsStatus.data;
    }
    if (this.inFlightPortsCheck) {
      return this.inFlightPortsCheck;
    }

    this.inFlightPortsCheck = (async () => {
      try {
        const settings = this.configService.getSettings();
        const basePorts = (settings.monitoredPorts && settings.monitoredPorts.length > 0
          ? settings.monitoredPorts
          : DEFAULT_MONITORED_PORTS
        ).filter((p) => p.enabled !== false);

        const monitoredPorts = [...basePorts];
        const kDebugPort = settings.karafDebugPort || 5005;
        if (!monitoredPorts.some((p) => p.port === kDebugPort)) {
          monitoredPorts.push({ port: kDebugPort, label: `Java Debug JVM (JDWP :${kDebugPort})`, enabled: true });
        }
        if (settings.automationProfiles) {
          for (const prof of settings.automationProfiles) {
            for (const step of prof.steps) {
              if (step.port && !monitoredPorts.some((p) => p.port === step.port)) {
                monitoredPorts.push({ port: step.port, label: `Porta :${step.port} (${step.name})`, enabled: true });
              }
            }
          }
        }

        if (process.platform !== 'win32') {
          const res = await Promise.all(
            monitoredPorts.map(async (item) => {
              const inUse = await this.checkPortSocket(item.port);
              return { port: item.port, label: item.label, inUse, pid: undefined };
            })
          );
          this.cachedPortsStatus = { data: res, timestamp: Date.now() };
          return res;
        }

        const results: PortStatus[] = [];
        let netstatOutput = '';
        try {
          const { stdout } = await execFileAsync('netstat.exe', ['-ano']);
          netstatOutput = stdout;
        } catch {
          netstatOutput = '';
        }

        const lines = netstatOutput.split('\n');

        for (const item of monitoredPorts) {
          let inUse = false;
          let pid: string | undefined = undefined;

          const matchingLine = lines.find(
            (l) => l.includes(`:${item.port} `) || l.includes(`:${item.port}\t`) || l.includes(`:${item.port}\r`)
          );

          if (matchingLine && matchingLine.includes('LISTENING')) {
            inUse = true;
            const tokens = matchingLine.trim().split(/\s+/);
            pid = tokens[tokens.length - 1];
          }

          results.push({
            port: item.port,
            label: item.label,
            inUse,
            pid
          });
        }

        this.cachedPortsStatus = { data: results, timestamp: Date.now() };
        return results;
      } finally {
        this.inFlightPortsCheck = null;
      }
    })();

    return this.inFlightPortsCheck;
  }

  private checkPortSocket(port: number): Promise<boolean> {
    return checkPortOpen(port);
  }

  public async resetEnvironment(
    options: 'embedded' | 'external' | EnvironmentAutomationConfig = 'embedded',
    onLog?: (log: EnvironmentLog) => void,
    onKarafChunk?: (chunk: string) => void
  ): Promise<EnvironmentResetResult> {
    const config: EnvironmentAutomationConfig =
      typeof options === 'string'
        ? {
            stopServices: true,
            killProcesses: true,
            launchIde: true,
            startKaraf: true,
            openBrowser: false,
            launchMode: options
          }
        : options;

    const logs: EnvironmentLog[] = [];
    const pushLog = this.makeLogger(onLog, logs);

    try {
      pushLog('info', 'Iniciando Assistente de Preparação de Ambiente...');

      const isAdmin = await this.checkAdminPrivileges();
      if (!isAdmin) {
        pushLog('warning', 'Aviso: Privilégios de Administrador não confirmados. Comandos de parada podem exigir elevação.');
      } else {
        pushLog('success', 'Privilégios de Administrador confirmados.');
      }

      const settings = this.configService.getSettings();

      const stepsToRun: { id: string; name: string }[] = [];
      if (config.stopServices) stepsToRun.push({ id: 'stop-services', name: 'Parar Serviços' });
      if (config.killProcesses) stepsToRun.push({ id: 'kill-processes', name: 'Liberar Portas/Processos' });
      if (config.selectedStartServiceNames && config.selectedStartServiceNames.length > 0) {
        stepsToRun.push({ id: 'start-services', name: 'Iniciar Serviços' });
      }
      if (config.launchIde) stepsToRun.push({ id: 'launch-ide', name: 'Inicializar IDE' });
      if (config.startKaraf) stepsToRun.push({ id: 'start-karaf', name: 'Iniciar Karaf Debug' });
      if (config.openBrowser) stepsToRun.push({ id: 'open-browser', name: 'Abrir Navegador' });

      const totalSteps = stepsToRun.length || 1;
      let currentStepIndex = 0;

      // 1. Parar Serviços
      if (config.stopServices) {
        currentStepIndex++;
        pushLog('info', `[${currentStepIndex}/${totalSteps}] Parando Serviços do Windows...`);
        const allTracked = settings.trackedServices || DEFAULT_TRACKED_SERVICES;
        const targets =
          config.selectedServiceNames && config.selectedServiceNames.length > 0
            ? allTracked.filter((s) => config.selectedServiceNames!.includes(s.name))
            : allTracked.filter((s) => s.enabled !== false && s.autoStop !== false);

        if (targets.length === 0) {
          pushLog('info', 'Nenhum serviço Windows selecionado para parada.');
        } else {
          for (const srv of targets) {
            const ok = await this.stopService(srv.name);
            pushLog(
              ok ? 'success' : 'warning',
              `Serviço ${srv.displayName || srv.name}: ${ok ? 'Parado com sucesso.' : 'Já estava parado ou falha ao parar.'}`
            );
          }
        }
      }

      // 2. Finalizar Processos Conflitantes
      if (config.killProcesses) {
        currentStepIndex++;
        pushLog('info', `[${currentStepIndex}/${totalSteps}] Finalizando processos em segundo plano para liberar portas...`);
        const allProcs = settings.trackedProcesses || DEFAULT_TRACKED_PROCESSES;
        const targets =
          config.selectedProcesses && config.selectedProcesses.length > 0
            ? allProcs.filter((p) => config.selectedProcesses!.includes(p.name))
            : allProcs.filter((p) => p.enabled !== false && p.autoKill !== false);

        if (targets.length === 0) {
          pushLog('info', 'Nenhum processo configurado para finalização.');
        } else {
          for (const proc of targets) {
            const isRunning = await this.isProcessRunning(proc.name);
            if (isRunning) {
              const killed = await this.killProcess(proc.name);
              pushLog(
                killed ? 'success' : 'warning',
                `Processo ${proc.displayName || proc.name}: ${killed ? 'Finalizado com sucesso.' : 'Falha ao finalizar.'}`
              );
            } else {
              pushLog('info', `Processo ${proc.displayName || proc.name}: Não está ativo.`);
            }
          }
        }

        if (isWslKaraf(settings)) {
          const killedWsl = await killWslKarafProcesses(settings.karafWslDistro!);
          if (killedWsl) {
            pushLog('success', `Karaf na distro WSL (${settings.karafWslDistro}): Processos finalizados.`);
          }
        }

        pushLog('info', 'Aguardando liberação de portas e arquivos pelo SO...');
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      // 3. Iniciar Serviços Selecionados
      if (config.selectedStartServiceNames && config.selectedStartServiceNames.length > 0) {
        currentStepIndex++;
        pushLog('info', `[${currentStepIndex}/${totalSteps}] Inicializando Serviços Selecionados...`);
        for (const srvName of config.selectedStartServiceNames) {
          const ok = await this.startService(srvName);
          pushLog(ok ? 'success' : 'warning', `Serviço ${srvName}: ${ok ? 'Iniciado com sucesso.' : 'Falha ao iniciar.'}`);
        }
      }

      // 4. Inicializar IDE
      if (config.launchIde) {
        currentStepIndex++;
        const ideInfo = detectIdeInfo(settings.intellijPath, settings.ideName);
        const exe = settings.intellijPath ? path.basename(settings.intellijPath) : 'idea64.exe';

        pushLog('info', `[${currentStepIndex}/${totalSteps}] Verificando IDE (${ideInfo.name})...`);
        const ideRunning = await this.isProcessRunning(exe);
        if (ideRunning) {
          pushLog('info', `${ideInfo.name} (${exe}) já está em execução.`);
        } else {
          const launched = await this.launchIntelliJ();
          if (launched) {
            pushLog('success', `${ideInfo.name} iniciado com sucesso.`);
          } else {
            pushLog('warning', `Executável da IDE (${ideInfo.name}) não encontrado nas configurações.`);
          }
        }
      }

      // 5. Iniciar Karaf OSGi Debug
      if (config.startKaraf) {
        currentStepIndex++;
        const mode = config.launchMode || 'embedded';
        pushLog('info', `[${currentStepIndex}/${totalSteps}] Inicializando Servidor OSGi Debug (${mode === 'embedded' ? 'Console Embutido' : 'Janela Externa'})...`);
        if (mode === 'embedded') {
          const started = this.karafService.startEmbeddedKarafDebug((chunk) => {
            if (onKarafChunk) onKarafChunk(chunk);
          });
          if (started) {
            pushLog('success', 'Servidor OSGi Debug acionado diretamente no Console Embutido do painel.');
          } else {
            pushLog('error', 'Falha ao iniciar Servidor OSGi no console embutido.');
          }
        } else {
          const serverLaunched = this.launchServerDebug();
          if (serverLaunched) {
            pushLog('success', 'Servidor OSGi Debug acionado em nova janela de console.');
          } else {
            pushLog('error', 'Script de inicialização do Karaf não foi encontrado em ' + settings.karafPath);
          }
        }
      }

      // 6. Abrir Navegador
      if (config.openBrowser) {
        currentStepIndex++;
        const targetUrl = getWebUrl(settings, '');
        pushLog('info', `[${currentStepIndex}/${totalSteps}] Abrindo Portal Web no navegador (${targetUrl})...`);
        try {
          const { shell } = await import('electron');
          if (shell && shell.openExternal) {
            await shell.openExternal(targetUrl);
            pushLog('success', `Navegador aberto em ${targetUrl}`);
          }
        } catch {
          // Ignora se não puder abrir
        }
      }

      pushLog('success', '🎉 Ambiente preparado com sucesso! Bom trabalho!');

      await this.showNativeNotification('Hub Manager', 'Ambiente de desenvolvimento preparado com sucesso!');

      return { success: true, logs };
    } catch (err: any) {
      pushLog('error', `Falha durante a preparação do ambiente: ${err?.message || err}`);
      return { success: false, logs, error: err?.message || String(err) };
    }
  }

  public async isCommandAvailable(command: string): Promise<boolean> {
    if (process.platform !== 'win32') return true;
    const cached = this.commandAvailabilityCache.get(command);
    if (cached !== undefined) return cached;
    let available: boolean;
    try {
      await execFileAsync('where.exe', [command]);
      available = true;
    } catch {
      available = false;
    }
    this.commandAvailabilityCache.set(command, available);
    return available;
  }

  public async killPortProcess(port: number): Promise<boolean> {
    if (!port || port <= 0) return false;
    if (process.platform !== 'win32') {
      try {
        await execFileAsync('fuser', ['-k', `${port}/tcp`]);
        return true;
      } catch {
        return false;
      }
    }

    try {
      const { stdout } = await execFileAsync('netstat.exe', ['-ano']);
      const lines = stdout.split('\n');
      const pids = new Set<string>();

      for (const line of lines) {
        if ((line.includes(`:${port} `) || line.includes(`:${port}\t`)) && line.includes('LISTENING')) {
          const tokens = line.trim().split(/\s+/);
          const pid = tokens[tokens.length - 1];
          if (pid && /^\d+$/.test(pid) && pid !== '0') {
            pids.add(pid);
          }
        }
      }

      if (pids.size === 0) {
        return true;
      }

      let allOk = true;
      for (const pid of pids) {
        try {
          await execFileAsync('taskkill.exe', ['/F', '/T', '/PID', pid]);
        } catch {
          allOk = false;
        }
      }
      this.invalidateStatusCaches();
      return allOk;
    } catch (err) {
      console.error(`Erro ao encerrar processo da porta ${port}:`, err);
      return false;
    }
  }

  public resolveWorkingDir(cwd?: string, command?: string): string {
    if (cwd && cwd.trim()) {
      const trimmed = cwd.trim();
      if (path.isAbsolute(trimmed)) {
        return fs.existsSync(trimmed) ? trimmed : process.cwd();
      }

      const settings = this.configService.getSettings();
      if (settings.projectsPath) {
        const fromProjects = path.join(settings.projectsPath, trimmed);
        if (fs.existsSync(fromProjects)) return fromProjects;
      }

      const fromAppRoot = path.join(process.cwd(), trimmed);
      if (fs.existsSync(fromAppRoot)) return fromAppRoot;

      const fromParent = path.join(__dirname, '..', '..', '..', trimmed);
      if (fs.existsSync(fromParent)) return fromParent;

      return trimmed;
    }

    // Se cwd não foi especificado, mas o comando faz referência a scripts do Karaf:
    if (command && command.trim()) {
      const settings = this.configService.getSettings();
      const firstToken = command.trim().split(/\s+/)[0];
      const baseToken = path.basename(firstToken);
      if (settings.karafPath) {
        const karafBin = path.join(settings.karafPath, 'bin');
        if (fs.existsSync(path.join(karafBin, baseToken)) || /^(winthor|karaf|client)(\.bat|\.sh)?$/i.test(baseToken)) {
          return karafBin;
        }
      }
    }

    return process.cwd();
  }

  public async runProfileStep(
    step: AutomationStep,
    profileName?: string,
    onLog?: (log: EnvironmentLog) => void
  ): Promise<boolean> {
    const pushLog = this.makeLogger(onLog);

    const settings = this.configService.getSettings();

    switch (step.type) {
      case 'command': {
        if (!step.command || !step.command.trim()) {
          pushLog('warning', `Etapa "${step.name}": Nenhum comando informado.`);
          return false;
        }
        const resolvedCwd = this.resolveWorkingDir(step.cwd, step.command);
        const javaEnv = this.karafService.getResolvedJavaEnv();
        const childEnv = { ...javaEnv, ...(step.envVars || {}) };
        const mode = step.launchMode || 'wt';
        const hasWt = await this.isCommandAvailable('wt.exe');
        const windowId = (step.wtWindowId || profileName || 'dev-manager')
          .replace(/[^a-zA-Z0-9_-]/g, '')
          .toLowerCase() || 'dev-manager';

        pushLog(
          'info',
          `Disparando "${step.name}" [modo: ${mode === 'wt' && hasWt ? 'Windows Terminal (abas)' : mode === 'cmd' ? 'CMD' : 'Background'}] em "${resolvedCwd}"...`
        );

        try {
          if (mode === 'wt' && hasWt) {
            spawn(
              'wt.exe',
              ['-w', windowId, 'new-tab', '--title', step.name, '-d', resolvedCwd, 'cmd.exe', '/k', step.command],
              {
                cwd: resolvedCwd,
                detached: true,
                stdio: 'ignore',
                env: childEnv
              }
            ).unref();
          } else if (mode === 'cmd' || (mode === 'wt' && !hasWt)) {
            spawn(
              'cmd.exe',
              ['/c', 'start', step.name || 'Comando', '/d', resolvedCwd, 'cmd.exe', '/k', step.command],
              {
                cwd: resolvedCwd,
                detached: true,
                stdio: 'ignore',
                env: childEnv
              }
            ).unref();
          } else {
            spawn('cmd.exe', ['/c', step.command], {
              cwd: resolvedCwd,
              detached: true,
              stdio: 'ignore',
              env: childEnv
            }).unref();
          }
          pushLog('success', `"${step.name}" disparado com sucesso.`);
          return true;
        } catch (err: any) {
          pushLog('error', `Falha ao disparar "${step.name}": ${err?.message || err}`);
          return false;
        }
      }

      case 'kill-port': {
        if (step.port) {
          pushLog('info', `Liberando porta ${step.port} para "${step.name}"...`);
          const ok = await this.killPortProcess(step.port);
          pushLog(ok ? 'success' : 'warning', `Porta ${step.port}: ${ok ? 'Liberada com sucesso.' : 'Já livre ou erro.'}`);
          return ok;
        }
        return false;
      }

      case 'service-start': {
        const srv = step.targetName || step.name;
        if ((await this.getServiceStatus(srv)) === 'RUNNING') {
          pushLog('success', `Serviço "${srv}": já está em execução, nada a fazer.`);
          return true;
        }
        pushLog('info', `Iniciando serviço Windows "${srv}"...`);
        const ok = await this.startService(srv);
        pushLog(ok ? 'success' : 'warning', `Serviço "${srv}": ${ok ? 'Iniciado com sucesso.' : 'Falha ao iniciar.'}`);
        return ok;
      }

      case 'service-stop': {
        const srv = step.targetName || step.name;
        const currentState = await this.getServiceStatus(srv);
        if (currentState === 'STOPPED' || currentState === 'NOT_INSTALLED') {
          pushLog('success', `Serviço "${srv}": já está parado, nada a fazer.`);
          return true;
        }
        pushLog('info', `Parando serviço Windows "${srv}"...`);
        const ok = await this.stopService(srv);
        pushLog(ok ? 'success' : 'warning', `Serviço "${srv}": ${ok ? 'Parado com sucesso.' : 'Falha ou já parado.'}`);
        return ok;
      }

      case 'kill-process': {
        const proc = step.targetName || step.name;
        if (!(await this.isProcessRunning(proc))) {
          pushLog('success', `Processo "${proc}": já não está em execução, nada a fazer.`);
          return true;
        }
        pushLog('info', `Finalizando processo "${proc}"...`);
        const ok = await this.killProcess(proc);
        pushLog(ok ? 'success' : 'info', `Processo "${proc}": ${ok ? 'Finalizado.' : 'Não encontrado ativo.'}`);
        return ok;
      }

      case 'ide': {
        const ideInfo = detectIdeInfo(settings.intellijPath, settings.ideName);
        pushLog('info', `Iniciando IDE (${ideInfo.name})...`);
        const ok = await this.launchIntelliJ();
        pushLog(ok ? 'success' : 'warning', `IDE (${ideInfo.name}): ${ok ? 'Iniciada.' : 'Caminho não configurado.'}`);
        return ok;
      }

      case 'karaf': {
        const mode = step.launchMode || 'wt';
        const debugPort = step.port || settings.karafDebugPort || 5005;

        // Libera a porta de debug caso esteja ocupada por processo anterior
        try {
          await this.killPortProcess(debugPort);
        } catch {
          // segue em frente
        }

        if (mode === 'embedded') {
          pushLog('info', `Iniciando Karaf OSGi Debug Server no Console Embutido (porta debug :${debugPort})...`);
          const ok = this.karafService.startEmbeddedKarafDebug((chunk) => {
            pushLog('info', chunk);
          });
          pushLog(ok ? 'success' : 'error', `Karaf Debug: ${ok ? 'Acionado no console embutido.' : 'Falha ao acionar console embutido.'}`);
          return ok;
        }

        pushLog('info', `Iniciando Karaf OSGi Debug Server [modo: ${mode === 'cmd' ? 'Janela CMD' : 'Terminal/Janela Externa'}, porta debug :${debugPort}]...`);
        const ok = this.launchServerDebug(mode as 'wt' | 'cmd', debugPort);
        pushLog(ok ? 'success' : 'error', `Karaf Debug: ${ok ? 'Acionado em janela de debug.' : 'Executável Karaf não localizado.'}`);
        return ok;
      }

      case 'browser': {
        const url = step.browserUrl || getWebUrl(settings);
        pushLog('info', `Abrindo navegador em ${url}...`);
        try {
          const { shell } = await import('electron');
          if (shell && shell.openExternal) {
            await shell.openExternal(url);
            pushLog('success', `Navegador aberto em ${url}`);
            return true;
          }
        } catch (err) {
          pushLog('warning', `Falha ao abrir navegador: ${(err as Error).message}`);
        }
        return false;
      }

      case 'db-query': {
        if (!this.databaseService || !this.networkService) {
          pushLog('error', `Etapa "${step.name}": Suporte a consulta de banco não disponível neste contexto.`);
          return false;
        }
        if (!step.dbConnectionId) {
          pushLog('warning', `Etapa "${step.name}": Nenhuma conexão de banco selecionada.`);
          return false;
        }
        if (!step.sql || !step.sql.trim()) {
          pushLog('warning', `Etapa "${step.name}": Nenhum SQL informado.`);
          return false;
        }

        const dbConfig = (settings.databaseConnections || []).find((c) => c.id === step.dbConnectionId);
        if (!dbConfig) {
          pushLog('error', `Etapa "${step.name}": Conexão de banco "${step.dbConnectionId}" não encontrada nas configurações.`);
          return false;
        }

        pushLog('info', `Executando SQL em "${dbConfig.name}" (${dbConfig.type}) para "${step.name}"...`);
        try {
          const { primaryLocalIp, wslIp } = await this.networkService.getNetworkIps();
          const resolvedSql = step.sql
            .replace(/\{\{\s*localIp\s*\}\}/g, primaryLocalIp)
            .replace(/\{\{\s*wslIp\s*\}\}/g, wslIp || '');

          const result = await this.databaseService.executeQuery(dbConfig, resolvedSql);
          if (result.success) {
            const affected = result.affectedRows ?? result.rowCount;
            pushLog('success', `"${step.name}": SQL executado com sucesso (${affected} linha(s) afetada(s)).`);
            return true;
          }
          pushLog('error', `"${step.name}": Falha ao executar SQL: ${result.error}`);
          return false;
        } catch (err: any) {
          pushLog('error', `"${step.name}": Falha ao executar SQL: ${err?.message || err}`);
          return false;
        }
      }

      default:
        return false;
    }
  }

  public async stopProfileStep(
    step: AutomationStep,
    onLog?: (log: EnvironmentLog) => void
  ): Promise<boolean> {
    const pushLog = this.makeLogger(onLog);

    let stopped = false;
    if (step.port) {
      pushLog('info', `Encerrando processos na porta ${step.port} (${step.name})...`);
      stopped = await this.killPortProcess(step.port);
      pushLog(stopped ? 'success' : 'info', `Porta ${step.port} liberada.`);
    }

    if (step.type === 'karaf') {
      const debugPort = step.port || this.configService.getSettings().karafDebugPort || 5005;
      pushLog('info', `Parando Karaf OSGi (porta debug :${debugPort})...`);
      try {
        await this.karafService.stopEmbeddedKaraf();
      } catch {
        // segue para liberação de porta
      }
      const portKilled = await this.killPortProcess(debugPort);
      stopped = portKilled || stopped;
      pushLog('success', `Karaf OSGi finalizado e porta :${debugPort} liberada.`);
    }

    if (step.type === 'service-start' && step.targetName) {
      const currentState = await this.getServiceStatus(step.targetName);
      if (currentState === 'STOPPED' || currentState === 'NOT_INSTALLED') {
        pushLog('success', `Serviço ${step.targetName}: já está parado, nada a fazer.`);
      } else {
        pushLog('info', `Parando serviço ${step.targetName}...`);
        await this.stopService(step.targetName);
      }
      stopped = true;
    }

    if (step.type === 'service-stop' && (step.targetName || step.name)) {
      const srv = step.targetName || step.name;
      const currentState = await this.getServiceStatus(srv);
      if (currentState === 'STOPPED' || currentState === 'NOT_INSTALLED') {
        pushLog('success', `Serviço ${srv}: já está parado, nada a fazer.`);
      } else {
        pushLog('info', `Garantindo parada do serviço ${srv}...`);
        await this.stopService(srv);
      }
      stopped = true;
    }

    if (step.type === 'kill-process' && (step.targetName || step.name)) {
      const proc = step.targetName || step.name;
      if (!(await this.isProcessRunning(proc))) {
        pushLog('success', `Processo ${proc}: já não está em execução, nada a fazer.`);
      } else {
        pushLog('info', `Encerrando processo ${proc}...`);
        await this.killProcess(proc);
      }
      stopped = true;
    }

    if (step.command && step.command.toLowerCase().includes('docker start')) {
      const match = step.command.match(/docker\s+start\s+([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) {
        const container = match[1];
        pushLog('info', `Parando container Docker ${container}...`);
        try {
          await execFileAsync('docker.exe', ['stop', container]);
          pushLog('success', `Container ${container} parado com sucesso.`);
          stopped = true;
        } catch (err) {
          pushLog('warning', `Falha ao parar container ${container}: ${(err as Error).message}`);
        }
      }
    }

    return stopped;
  }

  public async restartProfileStep(
    step: AutomationStep,
    profileName?: string,
    onLog?: (log: EnvironmentLog) => void
  ): Promise<boolean> {
    const pushLog = this.makeLogger(onLog);
    pushLog('info', `Reiniciando etapa "${step.name}"...`);
    await this.stopProfileStep(step, onLog);
    await new Promise((r) => setTimeout(r, 1500));
    return await this.runProfileStep(step, profileName, onLog);
  }

  public async executeProfile(
    profile: AutomationProfile,
    onLog?: (log: EnvironmentLog) => void,
    onStepProgress?: (stepIndex: number, totalSteps: number, step: AutomationStep) => void
  ): Promise<ProfileExecutionResult> {
    const logs: EnvironmentLog[] = [];
    const pushLog = this.makeLogger(onLog, logs);

    try {
      pushLog('info', `🚀 Iniciando execução do Perfil: "${profile.name}"...`);
      const enabledSteps = (profile.steps || []).filter((s) => s.enabled !== false);
      const total = enabledSteps.length;

      if (total === 0) {
        pushLog('warning', 'Nenhum passo ativo encontrado para este perfil.');
        return { success: true, logs };
      }

      for (let i = 0; i < total; i++) {
        const step = enabledSteps[i];
        const stepNum = i + 1;
        pushLog('info', `[${stepNum}/${total}] Executando: ${step.name}...`);
        if (onStepProgress) onStepProgress(stepNum, total, step);

        await this.runProfileStep(step, profile.name, onLog);

        if (step.waitForPort && step.port) {
          pushLog('info', `Aguardando porta ${step.port} responder...`);
          let portUp = false;
          for (let attempt = 0; attempt < 30; attempt++) {
            const inUse = await this.checkPortSocket(step.port);
            if (inUse) {
              portUp = true;
              break;
            }
            await new Promise((r) => setTimeout(r, 1000));
          }
          if (portUp) {
            pushLog('success', `Porta ${step.port} ativa e respondendo.`);
          } else {
            pushLog('warning', `Tempo limite ao aguardar resposta da porta ${step.port}. Continuando esteira...`);
          }
        }

        const delaySeconds = step.delayAfterSeconds;
        if (delaySeconds && delaySeconds > 0 && i < total - 1) {
          pushLog('info', `Aguardando ${delaySeconds}s antes da próxima etapa...`);
          await new Promise((r) => setTimeout(r, delaySeconds * 1000));
        }
      }

      pushLog('success', `🎉 Perfil "${profile.name}" executado com sucesso! Todos os passos disparados.`);

      await this.showNativeNotification('Hub Manager', `Perfil "${profile.name}" iniciado com sucesso!`);

      return { success: true, logs };
    } catch (err: any) {
      pushLog('error', `Erro na execução do perfil: ${err?.message || err}`);
      return { success: false, logs, error: err?.message || String(err) };
    }
  }

  public async stopProfile(
    profile: AutomationProfile,
    onLog?: (log: EnvironmentLog) => void
  ): Promise<{ success: boolean; logs: EnvironmentLog[] }> {
    const logs: EnvironmentLog[] = [];
    const pushLog = this.makeLogger(onLog, logs);

    pushLog('info', `⏹ Parando serviços do perfil "${profile.name}"...`);
    const steps = (profile.steps || []).filter((s) => s.enabled !== false);

    for (const step of steps) {
      await this.stopProfileStep(step, onLog);
    }

    pushLog('success', `Todos os processos e portas do perfil "${profile.name}" foram liberados.`);
    return { success: true, logs };
  }
}
