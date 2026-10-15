import { ChildProcess } from 'child_process';
import {
  DeployProfile,
  DeployStep,
  DeployProfileHistoryEntry,
  DeployStepResult,
  DeployProgressEvent,
  getKarafSshPort,
  OsgiResolutionDiagnosticSummary
} from '../../shared/types';
import { ConfigService } from './ConfigService';
import { KarafService } from './KarafService';
import { DockerService } from './DockerService';
import { WindowsService } from './WindowsService';
import { NetworkService } from './NetworkService';
import { isSafeKarafCommand } from '../utils/security';
import { runCapturedProcess, killProcessTree } from '../utils/process';

const MAX_DEPLOY_HISTORY_ENTRIES = 100;

export class DeployService {
  private configService: ConfigService;
  private karafService: KarafService;
  private dockerService: DockerService;
  private windowsService: WindowsService;
  private networkService?: NetworkService;

  private isAborted = false;
  private activeChildProcess: ChildProcess | null = null;

  constructor(
    configService: ConfigService,
    karafService: KarafService,
    dockerService: DockerService,
    windowsService: WindowsService,
    networkService?: NetworkService
  ) {
    this.configService = configService;
    this.karafService = karafService;
    this.dockerService = dockerService;
    this.windowsService = windowsService;
    this.networkService = networkService;
  }

  /**
   * Interpola variáveis dinâmicas em comandos, diretórios e URLs de etapa:
   * {PROJECTS_PATH}, {PROJECT_PATH}, {KARAF_PATH}, {JDK_PATH}, {DATE}, {TIME}, {TIMESTAMP}.
   */
  public substituteVariables(text: string): string {
    if (!text) return '';
    const settings = this.configService.getSettings();
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const timestampStr = `${dateStr}_${timeStr}`;

    return text
      .replace(/\{PROJECTS_PATH\}/gi, settings.projectsPath || '')
      .replace(/\{PROJECT_PATH\}/gi, settings.projectsPath || '')
      .replace(/\{KARAF_PATH\}/gi, settings.karafPath || '')
      .replace(/\{JDK_PATH\}/gi, settings.jdkPath || '')
      .replace(/\{DATE\}/gi, dateStr)
      .replace(/\{TIME\}/gi, timeStr)
      .replace(/\{TIMESTAMP\}/gi, timestampStr);
  }

  /**
   * Interrompe o deploy ativo imediatamente, encerrando qualquer processo filho associado.
   */
  public abortCurrentExecution(): void {
    this.isAborted = true;
    if (this.activeChildProcess && this.activeChildProcess.pid) {
      try {
        killProcessTree(this.activeChildProcess.pid);
      } catch (err) {
        console.warn('Erro ao finalizar árvore de processos abortados:', err);
      }
      this.activeChildProcess = null;
    }
  }

  private runGenericCommand(
    cwd: string,
    command: string,
    onChunk: (chunk: string) => void,
    timeoutSeconds?: number
  ): Promise<{ code: number; stdout: string; stderr: string }> {
    const interpolatedCmd = this.substituteVariables(command);
    const interpolatedCwd = this.substituteVariables(cwd);
    onChunk(`> ${interpolatedCmd}\r\n\r\n`);

    const timeoutMs = timeoutSeconds && timeoutSeconds > 0 ? timeoutSeconds * 1000 : undefined;

    return runCapturedProcess(
      'cmd.exe',
      ['/c', interpolatedCmd],
      { cwd: interpolatedCwd },
      onChunk,
      timeoutMs,
      (child) => {
        this.activeChildProcess = child;
      }
    ).finally(() => {
      this.activeChildProcess = null;
    });
  }

  private async runStep(
    step: DeployStep,
    onChunk: (chunk: string) => void,
    contextProjectPath?: string
  ): Promise<{ code: number; stderr?: string; resolutionDiagnostic?: OsgiResolutionDiagnosticSummary }> {
    if (this.isAborted) {
      const err = `[CANCELADO] Execução abortada pelo usuário antes da etapa "${step.name}".\r\n`;
      onChunk(err);
      return { code: 1, stderr: err };
    }

    const settings = this.configService.getSettings();

    switch (step.type) {
      case 'maven-build': {
        const rawPath = this.substituteVariables(step.projectPath || '');
        const resolvedPath = this.windowsService.resolveWorkingDir(rawPath);
        const res = await this.karafService.runMavenBuild(resolvedPath, step.skipTests ?? true, onChunk);
        return { code: res.code, stderr: res.stderr };
      }

      case 'karaf-command': {
        const cmd = this.substituteVariables(step.command || '');
        if (!cmd || !isSafeKarafCommand(cmd)) {
          const err = `[ERRO] Etapa "${step.name}": comando Karaf ausente ou inválido.\r\n`;
          onChunk(err);
          return { code: 1, stderr: err };
        }
        const res = await this.karafService.executeKarafCommand(
          cmd,
          onChunk,
          {
            user: settings.karafUser,
            pass: settings.karafPass,
            port: getKarafSshPort(settings)
          },
          step.timeoutSeconds ? step.timeoutSeconds * 1000 : undefined,
          { projectPath: contextProjectPath }
        );
        const combinedOutput = `${res.stdout}\n${res.stderr || ''}`;
        if (res.code !== 0 && combinedOutput.includes('already registered')) {
          onChunk(`\r\n[AVISO] "${step.name}" já registrado, prosseguindo...\r\n`);
          return { code: 0 };
        }
        return { code: res.code, stderr: res.stderr, resolutionDiagnostic: res.resolutionDiagnostic };
      }

      case 'karaf-bundle': {
        const action = step.bundleAction || 'restart';
        const bundleId = this.substituteVariables(step.bundleId || '');
        const location = this.substituteVariables(step.bundleLocation || '');

        if (action === 'install') {
          if (!location) {
            const err = `[ERRO] Etapa "${step.name}": localização do bundle não informada.\r\n`;
            onChunk(err);
            return { code: 1, stderr: err };
          }
          const res = await this.karafService.installBundle(
            { location, startImmediately: step.bundleStart ?? true },
            onChunk
          );
          return { code: res.success ? 0 : 1, stderr: res.success ? undefined : res.output };
        }

        if (action === 'reinstall') {
          if (!bundleId) {
            const err = `[ERRO] Etapa "${step.name}": ID do bundle não informado para reinstalação.\r\n`;
            onChunk(err);
            return { code: 1, stderr: err };
          }
          const res = await this.karafService.reinstallBundle(
            { bundleId, location: location || undefined },
            onChunk
          );
          return { code: res.success ? 0 : 1, stderr: res.success ? undefined : res.output };
        }

        if (action === 'update') {
          if (!bundleId || !location) {
            const err = `[ERRO] Etapa "${step.name}": ID do bundle e nova versão/localização são obrigatórios para atualização.
`;
            onChunk(err);
            return { code: 1, stderr: err };
          }
          const res = await this.karafService.updateBundleVersion(
            { bundleId, newVersionOrLocation: location },
            onChunk
          );
          return { code: res.success ? 0 : 1, stderr: res.success ? undefined : res.output };
        }

        if (action === 'uninstall') {
          if (!bundleId) {
            const err = `[ERRO] Etapa "${step.name}": ID do bundle não informado para desinstalação.\r\n`;
            onChunk(err);
            return { code: 1, stderr: err };
          }
          const res = await this.karafService.uninstallBundle(bundleId);
          onChunk(res.output + '\r\n');
          return { code: res.success ? 0 : 1, stderr: res.success ? undefined : res.output };
        }

        if (!bundleId) {
          const err = `[ERRO] Etapa "${step.name}": ID do bundle não informado.\r\n`;
          onChunk(err);
          return { code: 1, stderr: err };
        }
        const res = await this.karafService.manageBundle(action, bundleId);
        onChunk(res.output + '\r\n');
        return { code: res.success ? 0 : 1, stderr: res.success ? undefined : res.output };
      }

      case 'docker-build': {
        const contextPath = this.substituteVariables(step.dockerContextPath || '');
        const imageTag = this.substituteVariables(step.dockerImageTag || '');
        const dockerFile = step.dockerFile ? this.substituteVariables(step.dockerFile) : undefined;

        if (!contextPath || !imageTag) {
          const err = `[ERRO] Etapa "${step.name}": diretório de contexto ou tag da imagem ausente.\r\n`;
          onChunk(err);
          return { code: 1, stderr: err };
        }
        const res = await this.dockerService.buildImage(contextPath, imageTag, dockerFile, onChunk);
        return { code: res.code, stderr: res.stderr };
      }

      case 'docker-push': {
        const imageTag = this.substituteVariables(step.dockerImageTag || '');
        if (!imageTag) {
          const err = `[ERRO] Etapa "${step.name}": tag da imagem ausente.\r\n`;
          onChunk(err);
          return { code: 1, stderr: err };
        }
        const res = await this.dockerService.pushImage(imageTag, onChunk);
        return { code: res.code, stderr: res.stderr };
      }

      case 'docker-restart': {
        const container = this.substituteVariables(step.dockerContainer || '');
        if (!container) {
          const err = `[ERRO] Etapa "${step.name}": container não informado.\r\n`;
          onChunk(err);
          return { code: 1, stderr: err };
        }
        onChunk(`> Reiniciando container "${container}"...\r\n`);
        try {
          await this.dockerService.restartContainer(container);
          onChunk(`[SUCESSO] Container "${container}" reiniciado.\r\n`);
          return { code: 0 };
        } catch (err: any) {
          const msg = `[ERRO] Falha ao reiniciar container "${container}": ${err?.message || err}\r\n`;
          onChunk(msg);
          return { code: 1, stderr: msg };
        }
      }

      case 'command': {
        if (!step.command || !step.command.trim()) {
          const err = `[ERRO] Etapa "${step.name}": nenhum comando informado.\r\n`;
          onChunk(err);
          return { code: 1, stderr: err };
        }
        const rawCwd = this.substituteVariables(step.cwd || '');
        const resolvedCwd = this.windowsService.resolveWorkingDir(rawCwd);
        const res = await this.runGenericCommand(resolvedCwd, step.command, onChunk, step.timeoutSeconds);
        return { code: res.code, stderr: res.stderr };
      }

      case 'wait': {
        const durationSec = Math.max(1, step.waitDurationSeconds || 5);
        onChunk(`> Aguardando ${durationSec} segundos...\r\n`);
        for (let s = durationSec; s > 0; s--) {
          if (this.isAborted) {
            const err = `[CANCELADO] Espera interrompida pelo usuário.\r\n`;
            onChunk(err);
            return { code: 1, stderr: err };
          }
          onChunk(`... ${s}s restantes\r\n`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        onChunk(`[SUCESSO] Tempo de espera (${durationSec}s) concluído.\r\n`);
        return { code: 0 };
      }

      case 'http-healthcheck': {
        const url = this.substituteVariables(step.healthcheckUrl || '');
        if (!url) {
          const err = `[ERRO] Etapa "${step.name}": URL de healthcheck não informada.\r\n`;
          onChunk(err);
          return { code: 1, stderr: err };
        }
        const expectedStatus = step.healthcheckExpectedStatus || 200;
        const timeoutMs = Math.max(1000, (step.healthcheckTimeoutSeconds || 5) * 1000);
        const maxRetries = Math.max(1, step.healthcheckRetries || 10);
        onChunk(`> Testando URL HTTP: ${url} (Esperado: HTTP ${expectedStatus}, até ${maxRetries} tentativas)...\r\n`);

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          if (this.isAborted) {
            const err = `[CANCELADO] Healthcheck interrompido pelo usuário.\r\n`;
            onChunk(err);
            return { code: 1, stderr: err };
          }
          try {
            const res = this.networkService
              ? await this.networkService.checkHttpHealth(url, timeoutMs)
              : await (async () => {
                  const ctrl = new AbortController();
                  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
                  try {
                    const r = await fetch(url, { signal: ctrl.signal });
                    return { isHealthy: r.status === expectedStatus, status: r.status, timeMs: 0 };
                  } finally {
                    clearTimeout(timer);
                  }
                })();

            const currentStatus = (res as any).status ?? (res as any).statusCode;
            if (currentStatus === expectedStatus || ((res as any).isHealthy && expectedStatus === 200)) {
              onChunk(`[SUCESSO] Healthcheck OK em ${url} (HTTP ${currentStatus}) na tentativa ${attempt}/${maxRetries}.\r\n`);
              return { code: 0 };
            }
            onChunk(`[Tentativa ${attempt}/${maxRetries}] Retornou HTTP ${currentStatus || 'Inacessível'}. Aguardando 2s...\r\n`);
          } catch (err: any) {
            onChunk(`[Tentativa ${attempt}/${maxRetries}] Falha na conexão: ${err?.message || err}. Aguardando 2s...\r\n`);
          }

          if (attempt < maxRetries) {
            await new Promise((r) => setTimeout(r, 2000));
          }
        }

        const msg = `[ERRO] Healthcheck falhou após ${maxRetries} tentativas em ${url}.\r\n`;
        onChunk(msg);
        return { code: 1, stderr: msg };
      }

      case 'service-action': {
        const serviceName = this.substituteVariables(step.serviceName || '');
        const action = step.serviceAction || 'start';
        if (!serviceName) {
          const err = `[ERRO] Etapa "${step.name}": nome do serviço Windows não informado.\r\n`;
          onChunk(err);
          return { code: 1, stderr: err };
        }
        onChunk(`> Executando ação "${action}" no serviço Windows "${serviceName}"...\r\n`);
        const currentStatus = await this.windowsService.getServiceStatus(serviceName);

        if (action === 'start') {
          if (currentStatus === 'RUNNING') {
            onChunk(`[INFO] Serviço "${serviceName}" já está em execução.\r\n`);
            return { code: 0 };
          }
          const ok = await this.windowsService.startService(serviceName);
          if (!ok) {
            const err = `[ERRO] Falha ao iniciar serviço Windows "${serviceName}".\r\n`;
            onChunk(err);
            return { code: 1, stderr: err };
          }
          onChunk(`[SUCESSO] Serviço "${serviceName}" iniciado com sucesso.\r\n`);
          return { code: 0 };
        }

        if (action === 'stop') {
          if (currentStatus === 'STOPPED') {
            onChunk(`[INFO] Serviço "${serviceName}" já está parado.\r\n`);
            return { code: 0 };
          }
          const ok = await this.windowsService.stopService(serviceName);
          if (!ok) {
            const err = `[ERRO] Falha ao parar serviço Windows "${serviceName}".\r\n`;
            onChunk(err);
            return { code: 1, stderr: err };
          }
          onChunk(`[SUCESSO] Serviço "${serviceName}" parado com sucesso.\r\n`);
          return { code: 0 };
        }

        if (action === 'restart') {
          if (currentStatus === 'RUNNING') {
            onChunk(`> Parando serviço "${serviceName}"...\r\n`);
            await this.windowsService.stopService(serviceName);
            await new Promise((r) => setTimeout(r, 1500));
          }
          onChunk(`> Iniciando serviço "${serviceName}"...\r\n`);
          const ok = await this.windowsService.startService(serviceName);
          if (!ok) {
            const err = `[ERRO] Falha ao reiniciar serviço Windows "${serviceName}".\r\n`;
            onChunk(err);
            return { code: 1, stderr: err };
          }
          onChunk(`[SUCESSO] Serviço "${serviceName}" reiniciado com sucesso.\r\n`);
          return { code: 0 };
        }

        return { code: 1, stderr: `Ação de serviço desconhecida: ${action}` };
      }

      default:
        return { code: 1, stderr: `Tipo de etapa desconhecido: ${step.type}` };
    }
  }

  public async executeProfile(
    profile: DeployProfile,
    onChunk: (chunk: string) => void,
    onStepProgress?: (event: DeployProgressEvent) => void
  ): Promise<{ success: boolean; error?: string; resolutionDiagnostic?: OsgiResolutionDiagnosticSummary }> {
    this.isAborted = false;
    const profileStartTime = Date.now();
    const steps = (profile.steps || []).filter((s) => s.enabled !== false);
    const total = steps.length;
    const stepResults: DeployStepResult[] = [];
    const contextProjectPath = steps.find((s) => s.projectPath)?.projectPath;

    onChunk(`\r\n==========================================\r\n`);
    onChunk(`INICIANDO PERFIL DE DEPLOY: "${profile.name}"\r\n`);
    onChunk(`==========================================\r\n`);

    if (total === 0) {
      onChunk(`\r\n[AVISO] Nenhuma etapa habilitada neste perfil.\r\n`);
      return { success: true };
    }

    // Se o perfil depende do Karaf (etapas karaf-command ou karaf-bundle) e NÃO possui nenhuma
    // etapa que inicie o container previamente (ex: service start ou karaf.bat), valida se o
    // container está online antes de começar a executar (evitando aguardar builds Maven demorados
    // para falhar no deploy ou ter falsos positivos com client.bat offline).
    const hasKarafSteps = steps.some((s) => s.type === 'karaf-command' || s.type === 'karaf-bundle');
    const hasStepThatStartsKaraf = steps.some((s) => {
      if (s.type === 'service-action' && s.serviceAction === 'start') return true;
      if (s.type === 'command' && s.command && /(?:karaf|winthor)(?:\.bat|\.sh)?/i.test(s.command)) return true;
      return false;
    });

    if (hasKarafSteps && !hasStepThatStartsKaraf) {
      const isRunning = await this.karafService.isKarafRunning();
      if (!isRunning) {
        const settings = this.configService.getSettings();
        const port = getKarafSshPort(settings);
        const karafStepNames = steps
          .filter((s) => s.type === 'karaf-command' || s.type === 'karaf-bundle')
          .map((s) => `"${s.name}"`)
          .join(', ');
        const offlineErr = `O contêiner Karaf/OSGi não está em execução (porta SSH ${port} inacessível). Inicie o Karaf antes de executar este perfil de deploy.`;
        onChunk(`\r\n==========================================\r\n`);
        onChunk(`❌ EXECUÇÃO ABORTADA: Karaf OSGi offline (porta SSH ${port} fechada).\r\n`);
        onChunk(`💡 [DICA] Este perfil contém etapas OSGi (${karafStepNames}). Inicie o Karaf pelo Console Embutido ou gere o pipeline antes de prosseguir.\r\n`);
        onChunk(`==========================================\r\n`);
        this.saveHistoryEntry({
          id: `deploy-history-${Date.now()}`,
          profileId: profile.id,
          profileName: profile.name,
          success: false,
          error: offlineErr,
          startedAt: new Date(profileStartTime).toISOString(),
          durationMs: Date.now() - profileStartTime,
          totalSteps: total,
          aborted: false,
          stepResults: []
        });
        return { success: false, error: offlineErr };
      }
    }

    for (let i = 0; i < total; i++) {
      const step = steps[i];

      if (this.isAborted) {
        onChunk(`\r\n🛑 [DEPLOY CANCELADO] Execução interrompida antes da etapa "${step.name}".\r\n`);
        onStepProgress?.({
          stepId: step.id,
          stepIndex: i,
          totalSteps: total,
          status: 'skipped'
        });
        const durationMs = Date.now() - profileStartTime;
        this.saveHistoryEntry({
          id: `deploy-history-${Date.now()}`,
          profileId: profile.id,
          profileName: profile.name,
          success: false,
          error: 'Cancelado pelo usuário',
          startedAt: new Date(profileStartTime).toISOString(),
          durationMs,
          totalSteps: total,
          aborted: true,
          stepResults
        });
        return { success: false, error: 'Cancelado pelo usuário.' };
      }

      onChunk(`\r\n[${i + 1}/${total}] ${step.name} (${step.type})...\r\n`);
      onStepProgress?.({
        stepId: step.id,
        stepIndex: i,
        totalSteps: total,
        status: 'running'
      });

      const stepStart = Date.now();
      const result = await this.runStep(step, onChunk, contextProjectPath);
      const stepDuration = Date.now() - stepStart;

      if (result.code !== 0) {
        if (step.continueOnError && !this.isAborted) {
          onChunk(`\r\n⚠️ [AVISO] Etapa "${step.name}" falhou (Código ${result.code}), mas "continueOnError" está ativado. Prosseguindo...\r\n`);
          stepResults.push({
            stepId: step.id,
            stepName: step.name,
            stepType: step.type,
            success: false,
            code: result.code,
            durationMs: stepDuration,
            ignoredError: true,
            error: result.stderr,
            resolutionDiagnostic: result.resolutionDiagnostic
          });
          onStepProgress?.({
            stepId: step.id,
            stepIndex: i,
            totalSteps: total,
            status: 'completed',
            ignoredError: true,
            durationMs: stepDuration,
            resolutionDiagnostic: result.resolutionDiagnostic
          });
          continue;
        }

        onChunk(`\r\n==========================================\r\n`);
        onChunk(`❌ DEPLOY ABORTADO na etapa "${step.name}" (Código ${result.code}).\r\n`);
        onChunk(`==========================================\r\n`);

        stepResults.push({
          stepId: step.id,
          stepName: step.name,
          stepType: step.type,
          success: false,
          code: result.code,
          durationMs: stepDuration,
          ignoredError: false,
          error: result.stderr,
          resolutionDiagnostic: result.resolutionDiagnostic
        });

        const stepErrorMessage = `Falha na etapa "${step.name}"${result.stderr ? `: ${result.stderr}` : ''}`;

        onStepProgress?.({
          stepId: step.id,
          stepIndex: i,
          totalSteps: total,
          status: 'failed',
          error: stepErrorMessage,
          durationMs: stepDuration,
          resolutionDiagnostic: result.resolutionDiagnostic
        });

        const durationMs = Date.now() - profileStartTime;
        this.saveHistoryEntry({
          id: `deploy-history-${Date.now()}`,
          profileId: profile.id,
          profileName: profile.name,
          success: false,
          error: stepErrorMessage,
          startedAt: new Date(profileStartTime).toISOString(),
          durationMs,
          totalSteps: total,
          aborted: this.isAborted,
          stepResults
        });

        return { success: false, error: stepErrorMessage, resolutionDiagnostic: result.resolutionDiagnostic };
      }

      stepResults.push({
        stepId: step.id,
        stepName: step.name,
        stepType: step.type,
        success: true,
        code: 0,
        durationMs: stepDuration
      });

      onStepProgress?.({
        stepId: step.id,
        stepIndex: i,
        totalSteps: total,
        status: 'completed',
        durationMs: stepDuration
      });
    }

    const durationMs = Date.now() - profileStartTime;
    onChunk(`\r\n==========================================\r\n`);
    onChunk(`✨ PERFIL "${profile.name}" EXECUTADO COM SUCESSO! (${(durationMs / 1000).toFixed(1)}s)\r\n`);
    onChunk(`==========================================\r\n`);

    this.saveHistoryEntry({
      id: `deploy-history-${Date.now()}`,
      profileId: profile.id,
      profileName: profile.name,
      success: true,
      startedAt: new Date(profileStartTime).toISOString(),
      durationMs,
      totalSteps: total,
      stepResults
    });

    return { success: true };
  }

  public async executeSingleStep(
    step: DeployStep,
    onChunk: (chunk: string) => void,
    profileName?: string
  ): Promise<{ success: boolean; error?: string; resolutionDiagnostic?: OsgiResolutionDiagnosticSummary }> {
    this.isAborted = false;
    onChunk(`\r\n==========================================\r\n`);
    onChunk(`EXECUTANDO ETAPA INDIVIDUAL: "${step.name}"${profileName ? ` (Perfil: ${profileName})` : ''}\r\n`);
    onChunk(`Tipo: ${step.type}\r\n`);
    onChunk(`==========================================\r\n`);

    let contextProjectPath = step.projectPath;
    if (!contextProjectPath && profileName) {
      const profiles = this.configService.getSettings().deployProfiles || [];
      const parentProfile = profiles.find((p) => p.name === profileName || p.id === profileName);
      contextProjectPath = parentProfile?.steps?.find((s) => s.projectPath)?.projectPath;
    }

    const result = await this.runStep(step, onChunk, contextProjectPath);
    if (result.code !== 0) {
      if (step.continueOnError) {
        onChunk(`\r\n⚠️ [AVISO] Etapa "${step.name}" finalizou com código ${result.code}, mas "continueOnError" está ativado.\r\n`);
        return { success: true };
      }
      onChunk(`\r\n==========================================\r\n`);
      onChunk(`❌ ETAPA "${step.name}" FALHOU (Código ${result.code}).\r\n`);
      onChunk(`==========================================\r\n`);
      return {
        success: false,
        error: `Falha na etapa "${step.name}"${result.stderr ? `: ${result.stderr}` : ''}`,
        resolutionDiagnostic: result.resolutionDiagnostic
      };
    }

    onChunk(`\r\n==========================================\r\n`);
    onChunk(`✨ ETAPA "${step.name}" CONCLUÍDA COM SUCESSO!\r\n`);
    onChunk(`==========================================\r\n`);
    return { success: true };
  }

  public getHistory(): DeployProfileHistoryEntry[] {
    const settings = this.configService.getSettings();
    return settings.deployProfileHistory || [];
  }

  public clearHistory(): void {
    this.configService.saveSettings({ deployProfileHistory: [] });
  }

  private saveHistoryEntry(entry: DeployProfileHistoryEntry): void {
    try {
      const current = this.getHistory();
      const updated = [entry, ...current].slice(0, MAX_DEPLOY_HISTORY_ENTRIES);
      this.configService.saveSettings({ deployProfileHistory: updated });
    } catch (err) {
      console.warn('Falha ao gravar histórico de deploy:', err);
    }
  }
}

