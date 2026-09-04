import { spawn } from 'child_process';
import { DeployProfile, DeployStep, getKarafSshPort } from '../../shared/types';
import { ConfigService } from './ConfigService';
import { KarafService } from './KarafService';
import { DockerService } from './DockerService';
import { WindowsService } from './WindowsService';
import { isSafeKarafCommand } from '../utils/security';

export class DeployService {
  private configService: ConfigService;
  private karafService: KarafService;
  private dockerService: DockerService;
  private windowsService: WindowsService;

  constructor(
    configService: ConfigService,
    karafService: KarafService,
    dockerService: DockerService,
    windowsService: WindowsService
  ) {
    this.configService = configService;
    this.karafService = karafService;
    this.dockerService = dockerService;
    this.windowsService = windowsService;
  }

  private runGenericCommand(
    cwd: string,
    command: string,
    onChunk: (chunk: string) => void
  ): Promise<{ code: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      onChunk(`> ${command}\r\n\r\n`);
      const proc = spawn('cmd.exe', ['/c', command], { cwd, shell: false });
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
      proc.on('close', (code) => resolve({ code: code || 0, stdout, stderr }));
      proc.on('error', (err) => {
        const errMsg = `[FALHA] ${err.message}\r\n`;
        onChunk(errMsg);
        resolve({ code: 1, stdout, stderr: errMsg });
      });
    });
  }

  private async runStep(
    step: DeployStep,
    onChunk: (chunk: string) => void
  ): Promise<{ code: number; stderr?: string }> {
    const settings = this.configService.getSettings();

    switch (step.type) {
      case 'maven-build': {
        const resolvedPath = this.windowsService.resolveWorkingDir(step.projectPath);
        const res = await this.karafService.runMavenBuild(resolvedPath, step.skipTests ?? true, onChunk);
        return { code: res.code, stderr: res.stderr };
      }

      case 'karaf-command': {
        if (!step.command || !isSafeKarafCommand(step.command)) {
          const err = `[ERRO] Etapa "${step.name}": comando Karaf ausente ou inválido.\r\n`;
          onChunk(err);
          return { code: 1, stderr: err };
        }
        const res = await this.karafService.executeKarafCommand(step.command, onChunk, {
          user: settings.karafUser,
          pass: settings.karafPass,
          port: getKarafSshPort(settings)
        });
        if (res.code !== 0 && res.stdout.includes('already registered')) {
          onChunk(`\r\n[AVISO] "${step.name}" já registrado, prosseguindo...\r\n`);
          return { code: 0 };
        }
        return { code: res.code, stderr: res.stderr };
      }

      case 'docker-build': {
        if (!step.dockerContextPath || !step.dockerImageTag) {
          const err = `[ERRO] Etapa "${step.name}": diretório de contexto ou tag da imagem ausente.\r\n`;
          onChunk(err);
          return { code: 1, stderr: err };
        }
        const res = await this.dockerService.buildImage(
          step.dockerContextPath,
          step.dockerImageTag,
          step.dockerFile,
          onChunk
        );
        return { code: res.code, stderr: res.stderr };
      }

      case 'docker-push': {
        if (!step.dockerImageTag) {
          const err = `[ERRO] Etapa "${step.name}": tag da imagem ausente.\r\n`;
          onChunk(err);
          return { code: 1, stderr: err };
        }
        const res = await this.dockerService.pushImage(step.dockerImageTag, onChunk);
        return { code: res.code, stderr: res.stderr };
      }

      case 'docker-restart': {
        const container = step.dockerContainer;
        if (!container) {
          const err = `[ERRO] Etapa "${step.name}": container Docker não informado.\r\n`;
          onChunk(err);
          return { code: 1, stderr: err };
        }
        onChunk(`> docker restart ${container}\r\n`);
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
        const resolvedCwd = this.windowsService.resolveWorkingDir(step.cwd);
        const res = await this.runGenericCommand(resolvedCwd, step.command, onChunk);
        return { code: res.code, stderr: res.stderr };
      }

      default:
        return { code: 1, stderr: `Tipo de etapa desconhecido: ${step.type}` };
    }
  }

  public async executeProfile(
    profile: DeployProfile,
    onChunk: (chunk: string) => void
  ): Promise<{ success: boolean; error?: string }> {
    const steps = (profile.steps || []).filter((s) => s.enabled !== false);
    const total = steps.length;

    onChunk(`\r\n==========================================\r\n`);
    onChunk(`INICIANDO PERFIL DE DEPLOY: "${profile.name}"\r\n`);
    onChunk(`==========================================\r\n`);

    if (total === 0) {
      onChunk(`\r\n[AVISO] Nenhuma etapa habilitada neste perfil.\r\n`);
      return { success: true };
    }

    for (let i = 0; i < total; i++) {
      const step = steps[i];
      onChunk(`\r\n[${i + 1}/${total}] ${step.name} (${step.type})...\r\n`);

      const result = await this.runStep(step, onChunk);
      if (result.code !== 0) {
        onChunk(`\r\n==========================================\r\n`);
        onChunk(`❌ DEPLOY ABORTADO na etapa "${step.name}" (Código ${result.code}).\r\n`);
        onChunk(`==========================================\r\n`);
        return { success: false, error: result.stderr || `Falha na etapa "${step.name}"` };
      }
    }

    onChunk(`\r\n==========================================\r\n`);
    onChunk(`✨ PERFIL "${profile.name}" EXECUTADO COM SUCESSO!\r\n`);
    onChunk(`==========================================\r\n`);
    return { success: true };
  }
}
