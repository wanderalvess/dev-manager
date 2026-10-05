import { ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import {
  TestRunnerConfig,
  TestExecutionResult,
  DEFAULT_TEST_RUNNER_PRESETS
} from '../../shared/types';
import { ConfigService } from './ConfigService';
import { WindowsService } from './WindowsService';
import { KarafService } from './KarafService';
import { runCapturedProcess, killProcessTree } from '../utils/process';
import { parseTestOutput } from '../utils/testRunnerParsers';
import { isSafeLocalPath } from '../utils/security';
import { splitCommandLine } from '../utils/commandLineUtils';

const MAX_TEST_HISTORY_ENTRIES = 100;

export class TestRunnerService {
  private activeChildProcess: ChildProcess | null = null;
  private isAborted = false;

  constructor(
    private configService: ConfigService,
    private windowsService?: WindowsService,
    private karafService?: KarafService
  ) {}

  /**
   * Interpola variáveis dinâmicas em caminhos e argumentos:
   * {PROJECTS_PATH}, {KARAF_PATH}, {JDK_PATH}, {DATE}, {TIME}, {TIMESTAMP}.
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
   * Retorna os runners configurados. Caso a lista esteja vazia, retorna presets padrão.
   */
  public getRunners(): TestRunnerConfig[] {
    const settings = this.configService.getSettings();
    const saved = settings.testRunners || [];
    if (saved.length > 0) return saved;

    // Se ainda não houver nenhum, gera sugestões a partir dos presets
    return DEFAULT_TEST_RUNNER_PRESETS.slice(0, 3).map((preset, index) => ({
      id: `runner-default-${index + 1}`,
      name: preset.name,
      type: preset.type,
      workingDir: preset.suggestedWorkingDirPlaceholder,
      commandArgs: preset.defaultCommandArgs,
      description: preset.description,
      timeoutSeconds: 300,
      createdAt: new Date().toISOString()
    }));
  }

  /**
   * Salva ou atualiza uma configuração de Test Runner.
   */
  public saveRunner(runner: Partial<TestRunnerConfig>): TestRunnerConfig {
    if (!runner.name || !runner.name.trim()) {
      throw new Error('O nome do Test Runner é obrigatório.');
    }
    if (!runner.type) {
      throw new Error('O tipo do Test Runner é obrigatório.');
    }

    const currentRunners = this.getRunners();
    const id = runner.id || `runner-${Date.now()}`;
    const fullRunner: TestRunnerConfig = {
      id,
      name: runner.name.trim(),
      type: runner.type,
      workingDir: runner.workingDir?.trim() || undefined,
      customCommand: runner.customCommand?.trim() || undefined,
      commandArgs: runner.commandArgs?.trim() || undefined,
      envVars: runner.envVars,
      timeoutSeconds: runner.timeoutSeconds && runner.timeoutSeconds > 0 ? runner.timeoutSeconds : 300,
      linkedValidationItemIds: runner.linkedValidationItemIds || [],
      description: runner.description?.trim() || undefined,
      createdAt: runner.createdAt || new Date().toISOString()
    };

    const exists = currentRunners.some((r) => r.id === id);
    const updated = exists
      ? currentRunners.map((r) => (r.id === id ? fullRunner : r))
      : [fullRunner, ...currentRunners];

    this.configService.saveSettings({ testRunners: updated });
    return fullRunner;
  }

  /**
   * Remove um runner pelo ID.
   */
  public deleteRunner(id: string): void {
    const currentRunners = this.getRunners();
    const filtered = currentRunners.filter((r) => r.id !== id);
    this.configService.saveSettings({ testRunners: filtered });
  }

  /**
   * Retorna o histórico de execuções de testes (mais recente primeiro).
   */
  public getHistory(): TestExecutionResult[] {
    const settings = this.configService.getSettings();
    return settings.testExecutionHistory || [];
  }

  /**
   * Limpa o histórico de execuções.
   */
  public clearHistory(): void {
    this.configService.saveSettings({ testExecutionHistory: [] });
  }

  /**
   * Cancela a execução ativa do processo de testes.
   */
  public abortExecution(): boolean {
    this.isAborted = true;
    if (this.activeChildProcess && this.activeChildProcess.pid) {
      try {
        killProcessTree(this.activeChildProcess.pid);
        this.activeChildProcess = null;
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Resolve o diretório de trabalho real para execução do runner.
   */
  public resolveWorkingDir(rawDir?: string): string {
    const interpolated = this.substituteVariables(rawDir || '');
    if (!interpolated) {
      const settings = this.configService.getSettings();
      return settings.projectsPath && fs.existsSync(settings.projectsPath)
        ? settings.projectsPath
        : process.cwd();
    }

    if (this.windowsService) {
      return this.windowsService.resolveWorkingDir(interpolated);
    }

    if (path.isAbsolute(interpolated) && fs.existsSync(interpolated)) {
      return interpolated;
    }

    const settings = this.configService.getSettings();
    if (settings.projectsPath) {
      const candidate = path.join(settings.projectsPath, interpolated);
      if (fs.existsSync(candidate)) return candidate;
    }

    return process.cwd();
  }

  /**
   * Executa uma suíte de testes com streaming de saída, coleta de métricas e persistência no histórico.
   */
  public async executeRunner(
    target: string | TestRunnerConfig,
    onChunk: (chunk: string) => void = () => {}
  ): Promise<TestExecutionResult> {
    this.isAborted = false;
    const runner: TestRunnerConfig = typeof target === 'string'
      ? this.getRunners().find((r) => r.id === target) || {
          id: target,
          name: 'Runner Desconhecido',
          type: 'maven'
        }
      : target;

    const startTime = Date.now();
    const executionId = `exec-${Date.now()}`;
    const timeoutMs = (runner.timeoutSeconds || 300) * 1000;

    const workingDir = this.resolveWorkingDir(runner.workingDir);
    const isWin = process.platform === 'win32';

    onChunk(`\r\n==================================================\r\n`);
    onChunk(`🧪 DISPARANDO RUNNER DE TESTES: "${runner.name}"\r\n`);
    onChunk(`Tipo: ${runner.type.toUpperCase()} | Diretório: ${workingDir}\r\n`);
    onChunk(`==================================================\r\n\r\n`);

    // Diretório informado que não existe cai em process.cwd() na resolução; rodar `mvn test` na pasta do app seria enganoso
    if (runner.workingDir?.trim() && workingDir === process.cwd()) {
      const err = `[ERRO] Diretório de trabalho não encontrado: "${runner.workingDir}". Ajuste o runner antes de executar.\r\n`;
      onChunk(err);
      return this.createAndSaveFailedResult(runner, executionId, startTime, 1, err, 'Diretório de trabalho não encontrado.');
    }

    if (workingDir && !isSafeLocalPath(workingDir)) {
      const err = `[ERRO DE SEGURANÇA] Caminho de trabalho inválido ou não seguro: "${workingDir}"\r\n`;
      onChunk(err);
      return this.createAndSaveFailedResult(runner, executionId, startTime, 1, err, 'Caminho de trabalho não seguro.');
    }

    // Configuração de ambiente da JVM / Node
    const childEnv: NodeJS.ProcessEnv = this.karafService
      ? this.karafService.getResolvedJavaEnv(undefined, true)
      : { ...process.env };

    if (runner.envVars) {
      for (const [k, v] of Object.entries(runner.envVars)) {
        childEnv[k] = this.substituteVariables(v);
      }
    }

    let command = '';
    let args: string[] = [];

    const rawArgs = runner.commandArgs ? this.substituteVariables(runner.commandArgs).trim() : '';

    switch (runner.type) {
      case 'maven': {
        const mvnwBat = path.join(workingDir, 'mvnw.cmd');
        const mvnwSh = path.join(workingDir, 'mvnw');

        if (isWin && fs.existsSync(mvnwBat)) {
          command = mvnwBat;
        } else if (!isWin && fs.existsSync(mvnwSh)) {
          command = mvnwSh;
        } else {
          command = 'mvn';
        }

        const splitArgs = rawArgs ? splitCommandLine(rawArgs) : ['test'];
        // Garante que não pule testes
        args = splitArgs.filter((a) => !a.includes('-DskipTests=true'));
        break;
      }

      case 'playwright': {
        command = 'npx';
        const splitArgs = rawArgs ? splitCommandLine(rawArgs) : ['test'];
        args = ['playwright', ...splitArgs];
        break;
      }

      case 'cypress': {
        command = 'npx';
        const splitArgs = rawArgs ? splitCommandLine(rawArgs) : ['run'];
        args = ['cypress', ...splitArgs];
        break;
      }

      case 'newman': {
        command = 'npx';
        const splitArgs = rawArgs ? splitCommandLine(rawArgs) : ['run', './tests/collection.json'];
        args = ['newman', ...splitArgs];
        break;
      }

      case 'custom':
      default: {
        const customExec = runner.customCommand?.trim();
        const fullCmd = customExec
          ? (rawArgs ? `${customExec} ${rawArgs}` : customExec)
          : (rawArgs || 'npm test');
        const parts = splitCommandLine(fullCmd);
        command = parts[0];
        args = parts.slice(1);
        break;
      }
    }

    let accumulatedOutput = '';
    const chunkCollector = (chunk: string) => {
      accumulatedOutput += chunk;
      onChunk(chunk);
    };

    onChunk(`> Executando: ${command} ${args.join(' ')}\r\n\r\n`);

    try {
      const processResult = isWin
        ? await runCapturedProcess(
            'cmd.exe',
            ['/c', command, ...args],
            { cwd: workingDir, env: childEnv },
            chunkCollector,
            timeoutMs,
            (child) => {
              this.activeChildProcess = child;
            }
          ).finally(() => {
            this.activeChildProcess = null;
          })
        : await runCapturedProcess(
            command,
            args,
            { cwd: workingDir, env: childEnv },
            chunkCollector,
            timeoutMs,
            (child) => {
              this.activeChildProcess = child;
            }
          ).finally(() => {
            this.activeChildProcess = null;
          });

      const durationMs = Date.now() - startTime;
      const wasAborted = this.isAborted;
      const parsed = parseTestOutput(runner.type, accumulatedOutput, processResult.code);

      const finalStatus: 'passed' | 'failed' | 'aborted' = wasAborted
        ? 'aborted'
        : parsed.status;

      onChunk(`\r\n==================================================\r\n`);
      if (finalStatus === 'passed') {
        onChunk(`✅ EXECUÇÃO FINALIZADA COM SUCESSO!\r\n`);
      } else if (finalStatus === 'aborted') {
        onChunk(`⏹ EXECUÇÃO INTERROMPIDA PELO USUÁRIO.\r\n`);
      } else {
        onChunk(`❌ EXECUÇÃO FINALIZADA COM FALHAS (Código ${processResult.code}).\r\n`);
      }
      onChunk(`Total: ${parsed.total} | Aprovados: ${parsed.passed} | Falhas: ${parsed.failed} | Ignorados: ${parsed.skipped}\r\n`);
      onChunk(`Duração: ${(durationMs / 1000).toFixed(1)}s\r\n`);
      onChunk(`==================================================\r\n`);

      const executionResult: TestExecutionResult = {
        id: executionId,
        runnerId: runner.id,
        runnerName: runner.name,
        type: runner.type,
        status: finalStatus,
        exitCode: processResult.code,
        totalTests: parsed.total,
        passedCount: parsed.passed,
        failedCount: parsed.failed,
        skippedCount: parsed.skipped,
        durationMs,
        output: accumulatedOutput,
        executedAt: new Date(startTime).toISOString(),
        linkedValidationItemIds: runner.linkedValidationItemIds,
        summaryMessage: parsed.summaryMessage
      };

      this.saveHistoryEntry(executionResult);
      return executionResult;
    } catch (err: any) {
      const errMsg = `[ERRO FATAL] Falha ao disparar processo de teste: ${err?.message || err}\r\n`;
      onChunk(errMsg);
      return this.createAndSaveFailedResult(runner, executionId, startTime, 1, accumulatedOutput + errMsg, err?.message);
    }
  }

  private createAndSaveFailedResult(
    runner: TestRunnerConfig,
    id: string,
    startTime: number,
    exitCode: number,
    output: string,
    message?: string
  ): TestExecutionResult {
    const res: TestExecutionResult = {
      id,
      runnerId: runner.id,
      runnerName: runner.name,
      type: runner.type,
      status: this.isAborted ? 'aborted' : 'failed',
      exitCode,
      totalTests: 1,
      passedCount: 0,
      failedCount: 1,
      skippedCount: 0,
      durationMs: Date.now() - startTime,
      output,
      executedAt: new Date(startTime).toISOString(),
      linkedValidationItemIds: runner.linkedValidationItemIds,
      summaryMessage: message || 'Execução falhou.'
    };
    this.saveHistoryEntry(res);
    return res;
  }

  private saveHistoryEntry(entry: TestExecutionResult): void {
    try {
      const current = this.getHistory();
      const updated = [entry, ...current].slice(0, MAX_TEST_HISTORY_ENTRIES);
      this.configService.saveSettings({ testExecutionHistory: updated });
    } catch (err) {
      console.warn('[TestRunnerService] Falha ao persistir histórico de teste:', err);
    }
  }
}
