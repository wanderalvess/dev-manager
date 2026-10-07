import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Injetada pelo bundle de release (scripts/build-mcp.cjs): na máquina do usuário não existe o
// package.json do repositório para ler.
declare const __DEV_MANAGER_VERSION__: string | undefined;

const __mcpDirname = path.dirname(fileURLToPath(import.meta.url));
const mcpRepoRoot = path.resolve(__mcpDirname, '../..');
const appVersion = (() => {
  if (typeof __DEV_MANAGER_VERSION__ === 'string') return __DEV_MANAGER_VERSION__;
  try {
    return JSON.parse(fs.readFileSync(path.join(mcpRepoRoot, 'package.json'), 'utf-8')).version || '1.35.0';
  } catch {
    return '1.35.0';
  }
})();
import { ConfigService } from '../main/services/ConfigService';
import { KarafService } from '../main/services/KarafService';
import { WindowsService } from '../main/services/WindowsService';
import { GitAzureService } from '../main/services/GitAzureService';
import { RoutinesService } from '../main/services/RoutinesService';
import { DocsIndexService } from '../main/services/DocsIndexService';
import { DockerService } from '../main/services/DockerService';
import { DatabaseService } from '../main/services/DatabaseService';
import { BackupService } from '../main/services/BackupService';
import { BackupSchedulerService } from '../main/services/BackupSchedulerService';
import { NetworkService } from '../main/services/NetworkService';
import { DeployService } from '../main/services/DeployService';
import { KarafLogPersistenceService } from '../main/services/KarafLogPersistenceService';
import { LogWatcherService } from '../main/services/LogWatcherService';
import { LlmService } from '../main/services/LlmService';
import { Routine801Service } from '../main/services/Routine801Service';
import { OracleTracerCaptureService } from '../main/services/OracleTracerCaptureService';
import { getApmReceiverHandlePath } from '../main/services/ApmService';
import { ApmReceiverClient } from '../main/services/ApmReceiverClient';
import { QaRegressionService } from '../main/services/QaRegressionService';
import { QaPayloadService } from '../main/services/QaPayloadService';
import { TestRunnerService } from '../main/services/TestRunnerService';
import { TautAutomationService } from '../main/services/TautAutomationService';
import { generateMarkdownEvidence } from '../main/utils/qaRegressionUtils';
import { buildCompactTraceDetails } from '../main/utils/apmUtils';
import * as cron from 'node-cron';
import { isValidIdentifier, isSafeLocalPath, isSafeKarafCommand, isSafeUrl } from '../main/utils/security';
import { analyzeExplainPlan } from '../main/services/explainAnalyzer';
import { isReadOnlySql } from '../shared/sqlSplitUtils';
import { annotationsFor, getMcpMode, isToolAllowed } from './toolSafety';
import type { AppSettings, BackupConfig, BackupWebhookConfig, DatabaseConnectionConfig, DeployProfile } from '../shared/types';

// --- Composição dos serviços (mesma ordem usada em src/server/index.ts e src/main/index.ts) ---
const configService = new ConfigService();
const karafService = new KarafService(configService);
const databaseService = new DatabaseService(configService);
const backupService = new BackupService(configService);
const backupSchedulerService = new BackupSchedulerService(configService, backupService);
const networkService = new NetworkService();
const windowsService = new WindowsService(configService, karafService, databaseService, networkService);
const gitAzureService = new GitAzureService(configService, karafService);
const routinesService = new RoutinesService(configService);
const docsIndexService = new DocsIndexService(configService, gitAzureService);
const dockerService = new DockerService();
const deployService = new DeployService(configService, karafService, dockerService, windowsService, networkService);
const karafLogPersistenceService = new KarafLogPersistenceService();
const logWatcherService = new LogWatcherService();
const llmService = new LlmService(configService, docsIndexService);
const routine801Service = new Routine801Service(configService, karafService);
const oracleTracerCaptureService = new OracleTracerCaptureService(databaseService);
const qaRegressionService = new QaRegressionService(configService, databaseService);
const qaPayloadService = new QaPayloadService(configService, databaseService);
const testRunnerService = new TestRunnerService(configService, windowsService, karafService);
const tautAutomationService = new TautAutomationService(configService, databaseService, testRunnerService);
// Os traces vivem na memória do processo dono da porta OTLP (app desktop ou servidor web): este
// processo não sobe receptor próprio — tomaria a porta do app — e consulta aquele buffer.
const apmClient = new ApmReceiverClient(getApmReceiverHandlePath());

// --- Helpers de resposta MCP ---
function ok(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function fail(message: string) {
  return { isError: true, content: [{ type: 'text' as const, text: message }] };
}

/**
 * Métodos de serviço que aceitam callback(s) de streaming (onLog/onChunk/onProgress) foram
 * pensados para um cliente conectado via WebSocket recebendo eventos em tempo real. Uma chamada
 * de tool MCP via stdio é requisição/resposta única — não há como empurrar eventos no meio da
 * chamada. `collect()` acumula tudo que os callbacks emitirem e devolve junto do resultado final
 * da Promise, então o agente recebe o transcript completo de uma vez quando a operação termina.
 */
function collect() {
  const events: Array<{ type: string; data: unknown }> = [];
  const push = (type: string) => (data: unknown) => {
    events.push({ type, data });
  };
  return { events, push };
}

// Console Karaf embutido roda pela vida inteira do processo MCP, não de uma única chamada —
// mantém um buffer local para `karaf_get_embedded_output` drenar sob demanda.
const EMBEDDED_OUTPUT_LIMIT = 500;
const embeddedOutput: string[] = [];
function captureEmbeddedOutput(chunk: string) {
  embeddedOutput.push(chunk);
  if (embeddedOutput.length > EMBEDDED_OUTPUT_LIMIT) embeddedOutput.shift();
  karafLogPersistenceService.append(chunk);
}

// --- Schemas Zod reutilizados entre tools (espelham src/shared/types.ts) ---
const AutomationStepTypeSchema = z.enum([
  'command',
  'kill-port',
  'service-start',
  'service-stop',
  'kill-process',
  'ide',
  'karaf',
  'browser',
  'db-query'
]);

const AutomationStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: AutomationStepTypeSchema,
  enabled: z.boolean(),
  command: z.string().optional(),
  cwd: z.string().optional(),
  envVars: z.record(z.string(), z.string()).optional(),
  port: z.number().int().optional(),
  launchMode: z.enum(['wt', 'cmd', 'background']).optional(),
  wtWindowId: z.string().optional(),
  delayAfterSeconds: z.number().optional(),
  waitForPort: z.boolean().optional(),
  browserUrl: z.string().optional(),
  targetName: z.string().optional(),
  dbConnectionId: z.string().optional(),
  sql: z.string().optional()
});

const AutomationProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  steps: z.array(AutomationStepSchema),
  isDefault: z.boolean().optional()
});

const EnvironmentAutomationConfigSchema = z.object({
  stopServices: z.boolean(),
  killProcesses: z.boolean(),
  launchIde: z.boolean(),
  startKaraf: z.boolean(),
  openBrowser: z.boolean().optional(),
  launchMode: z.enum(['embedded', 'external']),
  selectedServiceNames: z.array(z.string()).optional(),
  selectedProcesses: z.array(z.string()).optional(),
  selectedStartServiceNames: z.array(z.string()).optional()
});

const KarafDeployRequestSchema = z.object({
  karafClientPath: z.string(),
  user: z.string(),
  pass: z.string(),
  repoUrl: z.string(),
  featureInstall: z.string(),
  port: z.number().int().optional()
});

const SETTINGS_PATH_KEYS = ['appPath', 'karafPath', 'intellijPath', 'projectsPath', 'oracleTnsnamesPath'] as const;

const DatabaseTypeSchema = z.enum(['oracle', 'mysql', 'postgres']);

const DatabaseConnectionConfigSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  type: DatabaseTypeSchema,
  host: z.string(),
  port: z.number().int(),
  database: z.string(),
  user: z.string(),
  password: z.string().optional(),
  oracleMode: z.enum(['serviceName', 'sid']).optional(),
  oracleClientPath: z.string().optional(),
  oracleThickMode: z.boolean().optional(),
  tnsAlias: z.string().optional(),
  ssl: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  isProduction: z.boolean().optional()
});

const DeployStepTypeSchema = z.enum([
  'maven-build',
  'karaf-command',
  'karaf-bundle',
  'docker-build',
  'docker-push',
  'docker-restart',
  'command',
  'wait',
  'http-healthcheck',
  'service-action'
]);

const DeployStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: DeployStepTypeSchema,
  enabled: z.boolean(),
  continueOnError: z.boolean().optional(),
  timeoutSeconds: z.number().optional(),
  projectPath: z.string().optional(),
  skipTests: z.boolean().optional(),
  command: z.string().optional(),
  cwd: z.string().optional(),
  bundleAction: z.enum(['install', 'reinstall', 'uninstall', 'update', 'restart', 'refresh', 'start', 'stop']).optional(),
  bundleId: z.string().optional(),
  bundleLocation: z.string().optional(),
  bundleStart: z.boolean().optional(),
  dockerContextPath: z.string().optional(),
  dockerFile: z.string().optional(),
  dockerImageTag: z.string().optional(),
  dockerContainer: z.string().optional(),
  waitDurationSeconds: z.number().optional(),
  healthcheckUrl: z.string().optional(),
  healthcheckExpectedStatus: z.number().optional(),
  healthcheckTimeoutSeconds: z.number().optional(),
  healthcheckRetries: z.number().optional(),
  serviceName: z.string().optional(),
  serviceAction: z.enum(['start', 'stop', 'restart']).optional()
});

const DeployProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  steps: z.array(DeployStepSchema)
});

function resolveDbConfig(connectionId?: string, customConfig?: any): DatabaseConnectionConfig | null {
  if (customConfig && customConfig.type && customConfig.host && customConfig.user) {
    return {
      id: customConfig.id || 'custom',
      name: customConfig.name || 'Conexão Informada',
      ...customConfig
    };
  }
  const settings = configService.getSettings();
  const conns = settings.databaseConnections || [];
  if (connectionId) {
    const found = conns.find(
      (c) => c.id === connectionId || c.name.toLowerCase() === connectionId.toLowerCase()
    );
    if (found) return found;
  }
  return conns.find((c) => c.isDefault) || conns[0] || null;
}

/** Conexão marcada como produção (a própria, ou uma salva com o mesmo destino quando o config veio inline). */
function isProductionConnection(target: DatabaseConnectionConfig): boolean {
  if (target.isProduction) return true;
  const saved = configService.getSettings().databaseConnections || [];
  return saved.some(
    (c) => c.isProduction && (c.id === target.id || (c.host === target.host && c.port === target.port && c.database === target.database))
  );
}

const server = new McpServer({ name: 'hub-manager', version: appVersion });

// Toda tool sai com annotations (readOnlyHint/destructiveHint) para o cliente poder pedir confirmação.
// Com HUB_MCP_MODE=readonly só as tools de leitura chegam a ser registradas.
const mcpMode = getMcpMode();
const registerToolRaw = server.registerTool.bind(server) as (...a: unknown[]) => unknown;
(server as unknown as { registerTool: (...a: unknown[]) => unknown }).registerTool = (name, config, handler) => {
  if (!isToolAllowed(name as string, mcpMode)) return undefined;
  return registerToolRaw(name, { annotations: annotationsFor(name as string), ...(config as object) }, handler);
};

// --- 1. Sistema ---
server.registerTool(
  'system_get_info',
  { title: 'Info do sistema', description: 'Informações de SO, runtime Node e status de administrador.' },
  async () => {
    const isAdmin = await windowsService.checkAdminPrivileges();
    const configPath = configService.getConfigFilePath();
    return ok({
      appName: 'Hub Manager (MCP)',
      appVersion,
      nodeVersion: process.version,
      osPlatform: os.platform(),
      osRelease: os.release(),
      osArch: os.arch(),
      osHostname: os.hostname(),
      totalMemoryMb: Math.round(os.totalmem() / 1024 / 1024),
      freeMemoryMb: Math.round(os.freemem() / 1024 / 1024),
      configPath,
      isAdmin
    });
  }
);

server.registerTool(
  'system_check_path',
  {
    title: 'Verificar caminho',
    description: 'Verifica se um caminho local existe e se é arquivo ou diretório.',
    inputSchema: { targetPath: z.string() }
  },
  async ({ targetPath }) => {
    if (!isSafeLocalPath(targetPath)) return fail('Caminho inválido ou remoto não permitido.');
    return ok(configService.checkPath(targetPath));
  }
);

server.registerTool(
  'system_auto_detect_paths',
  { title: 'Auto-detectar caminhos', description: 'Tenta localizar automaticamente IDE, Karaf e pasta de projetos.' },
  async () => ok(configService.autoDetectPaths())
);

// --- 2. Ambiente ---
server.registerTool(
  'env_check_admin',
  { title: 'Checar privilégios admin', description: 'Verifica se o processo tem privilégios administrativos no Windows.' },
  async () => ok({ isAdmin: await windowsService.checkAdminPrivileges() })
);

server.registerTool(
  'env_get_services_status',
  { title: 'Status dos serviços', description: 'Status atual dos serviços Windows monitorados.' },
  async () => ok(await windowsService.getAllServicesStatus())
);

server.registerTool(
  'env_get_processes_status',
  { title: 'Status dos processos', description: 'Status atual dos processos monitorados (rodando/PID).' },
  async () => ok(await windowsService.getProcessesStatus())
);

server.registerTool(
  'env_check_ports',
  { title: 'Checar portas', description: 'Status das portas de rede monitoradas (em uso/PID).' },
  async () => ok(await windowsService.checkPorts())
);

server.registerTool(
  'env_start_service',
  {
    title: 'Iniciar serviço Windows',
    description: 'Inicia um serviço Windows pelo nome.',
    inputSchema: { name: z.string() }
  },
  async ({ name }) => {
    if (!isValidIdentifier(name)) return fail('Nome de serviço inválido.');
    return ok({ success: await windowsService.startService(name) });
  }
);

server.registerTool(
  'env_stop_service',
  {
    title: 'Parar serviço Windows',
    description: 'Para um serviço Windows pelo nome.',
    inputSchema: { name: z.string() }
  },
  async ({ name }) => {
    if (!isValidIdentifier(name)) return fail('Nome de serviço inválido.');
    return ok({ success: await windowsService.stopService(name) });
  }
);

server.registerTool(
  'env_batch_start_services',
  {
    title: 'Iniciar múltiplos serviços',
    description: 'Inicia vários serviços Windows de uma vez.',
    inputSchema: { names: z.array(z.string()) }
  },
  async ({ names }) => ok(await windowsService.batchStartServices(names.filter(isValidIdentifier)))
);

server.registerTool(
  'env_batch_stop_services',
  {
    title: 'Parar múltiplos serviços',
    description: 'Para vários serviços Windows de uma vez.',
    inputSchema: { names: z.array(z.string()) }
  },
  async ({ names }) => ok(await windowsService.batchStopServices(names.filter(isValidIdentifier)))
);

server.registerTool(
  'env_batch_kill_processes',
  {
    title: 'Matar múltiplos processos',
    description: 'Encerra vários processos de uma vez.',
    inputSchema: { names: z.array(z.string()) }
  },
  async ({ names }) => ok(await windowsService.batchKillProcesses(names.filter(isValidIdentifier)))
);

server.registerTool(
  'env_launch_ide',
  { title: 'Abrir IDE', description: 'Abre a IDE configurada (IntelliJ, VS Code, Cursor, etc.) se não estiver rodando.' },
  async () => ok({ success: await windowsService.launchIntelliJ() })
);

server.registerTool(
  'env_launch_server_debug',
  { title: 'Iniciar servidor debug', description: 'Inicia o script de debug do Karaf em janela externa.' },
  async () => ok({ success: windowsService.launchServerDebug() })
);

server.registerTool(
  'env_launch_app',
  {
    title: 'Abrir aplicativo externo',
    description:
      'Abre qualquer aplicativo local pelo caminho completo do executável (ex: Postman, terminal), sem restrição de pasta.',
    inputSchema: { fullPath: z.string() }
  },
  async ({ fullPath }) => {
    if (!isSafeLocalPath(fullPath)) return fail('Caminho inválido ou remoto não permitido.');
    return ok({ success: windowsService.launchExternalApp(fullPath) });
  }
);

server.registerTool(
  'env_reset_environment',
  {
    title: 'Resetar ambiente dev',
    description:
      'Executa o pipeline de preparação de ambiente (parar serviços, matar processos, abrir IDE, subir Karaf). Bloqueia até concluir.',
    inputSchema: { options: z.union([z.enum(['embedded', 'external']), EnvironmentAutomationConfigSchema]).optional() }
  },
  async ({ options }) => {
    const { events, push } = collect();
    const result = await windowsService.resetEnvironment(options ?? 'embedded', push('log'), push('chunk'));
    return ok({ result, events });
  }
);

// --- 2b. Perfis de automação ---
server.registerTool(
  'profile_run',
  {
    title: 'Rodar perfil',
    description: 'Executa um perfil de automação (sequência de passos) do início ao fim. Bloqueia até concluir.',
    inputSchema: { profile: AutomationProfileSchema }
  },
  async ({ profile }) => {
    const { events, push } = collect();
    const result = await windowsService.executeProfile(profile, push('log'), (stepIndex, totalSteps, step) =>
      push('progress')({ stepIndex, totalSteps, step })
    );
    return ok({ result, events });
  }
);

server.registerTool(
  'profile_stop',
  {
    title: 'Parar perfil',
    description: 'Interrompe/libera um perfil de automação em execução.',
    inputSchema: { profile: AutomationProfileSchema }
  },
  async ({ profile }) => {
    const { events, push } = collect();
    const result = await windowsService.stopProfile(profile, push('log'));
    return ok({ result, events });
  }
);

server.registerTool(
  'profile_run_step',
  {
    title: 'Rodar passo do perfil',
    description: 'Executa um único passo de automação.',
    inputSchema: { step: AutomationStepSchema, profileName: z.string().optional() }
  },
  async ({ step, profileName }) => {
    const { events, push } = collect();
    const result = await windowsService.runProfileStep(step, profileName, push('log'));
    return ok({ success: result, events });
  }
);

server.registerTool(
  'profile_stop_step',
  {
    title: 'Parar passo do perfil',
    description: 'Interrompe um único passo de automação em execução.',
    inputSchema: { step: AutomationStepSchema }
  },
  async ({ step }) => {
    const { events, push } = collect();
    const result = await windowsService.stopProfileStep(step, push('log'));
    return ok({ success: result, events });
  }
);

server.registerTool(
  'profile_restart_step',
  {
    title: 'Reiniciar passo do perfil',
    description: 'Reinicia um único passo de automação.',
    inputSchema: { step: AutomationStepSchema, profileName: z.string().optional() }
  },
  async ({ step, profileName }) => {
    const { events, push } = collect();
    const result = await windowsService.restartProfileStep(step, profileName, push('log'));
    return ok({ success: result, events });
  }
);

server.registerTool(
  'profile_kill_port',
  {
    title: 'Liberar porta',
    description: 'Mata o processo que está usando a porta TCP informada.',
    inputSchema: { port: z.number().int().min(1).max(65535) }
  },
  async ({ port }) => ok({ success: await windowsService.killPortProcess(port) })
);

// --- 3. Karaf ---
server.registerTool(
  'karaf_is_running',
  {
    title: 'Verificar status do Karaf/OSGi',
    description:
      'Verifica se o contêiner Apache Karaf/OSGi está em execução e respondendo na porta SSH (padrão 8101). Use antes de tentar executar comandos ou deploys.',
    inputSchema: { sshPort: z.number().int().positive().optional() }
  },
  async ({ sshPort }) => ok({ isRunning: await karafService.isKarafRunning(sshPort) })
);

server.registerTool(
  'karaf_is_embedded_running',
  { title: 'Console embutido rodando?', description: 'Verifica se o console Karaf embutido está ativo.' },
  async () => ok({ isRunning: karafService.isEmbeddedRunning() })
);

server.registerTool(
  'karaf_start_embedded',
  {
    title: 'Iniciar console embutido',
    description: 'Inicia o console Karaf embutido em modo debug. Retorna imediatamente; use karaf_get_embedded_output para ler a saída.'
  },
  async () => ok({ started: karafService.startEmbeddedKarafDebug(captureEmbeddedOutput) })
);

server.registerTool(
  'karaf_send_embedded_input',
  {
    title: 'Enviar comando ao console embutido',
    description: 'Envia uma linha de input ao console Karaf embutido em execução.',
    inputSchema: { input: z.string().optional() }
  },
  async ({ input }) => ok({ success: karafService.sendEmbeddedInput(input ?? '') })
);

server.registerTool(
  'karaf_get_embedded_output',
  {
    title: 'Ler saída do console embutido',
    description: 'Drena e retorna o buffer de saída acumulado do console Karaf embutido desde a última leitura.'
  },
  async () => ok({ output: embeddedOutput.splice(0, embeddedOutput.length).join('') })
);

server.registerTool(
  'karaf_get_persisted_logs',
  {
    title: 'Ler histórico persistido do console embutido',
    description:
      'Retorna os últimos caracteres do log do Karaf embutido persistido em disco, sem apagar nada (diferente de karaf_get_embedded_output). Sobrevive a reinícios do processo.',
    inputSchema: { maxChars: z.number().int().positive().optional() }
  },
  async ({ maxChars }) => ok({ output: karafLogPersistenceService.read(maxChars) })
);

server.registerTool(
  'karaf_stop_embedded',
  { title: 'Parar console embutido', description: 'Encerra o console Karaf embutido.' },
  async () => ok({ result: await karafService.stopEmbeddedKaraf() })
);

server.registerTool(
  'karaf_deploy',
  {
    title: 'Deploy Karaf',
    description: 'Adiciona o repositório de feature e instala no Karaf via client.bat. Bloqueia até concluir.',
    inputSchema: { request: KarafDeployRequestSchema }
  },
  async ({ request }) => {
    const { events, push } = collect();
    const result = await karafService.deploy(request, push('chunk'), 'mcp');
    return ok({ result, events });
  }
);

server.registerTool(
  'karaf_exec_command',
  {
    title: 'Executar comando Karaf',
    description: 'Executa um único comando no shell Karaf via client.bat (ex: "feature:list -i"). Bloqueia até concluir.',
    inputSchema: { command: z.string() }
  },
  async ({ command }) => {
    if (!isSafeKarafCommand(command)) return fail('Comando contém caracteres não permitidos ou formato inválido.');
    const { events, push } = collect();
    const result = await karafService.executeKarafCommand(command, push('chunk'));
    return ok({ result, events });
  }
);

server.registerTool(
  'karaf_build_and_deploy',
  {
    title: 'Build Maven + deploy Karaf',
    description: 'Roda o build Maven do projeto e, se bem-sucedido, faz o deploy no Karaf. Bloqueia até concluir.',
    inputSchema: { request: KarafDeployRequestSchema, projectPath: z.string(), skipTests: z.boolean().optional() }
  },
  async ({ request, projectPath, skipTests }) => {
    if (!isSafeLocalPath(projectPath)) return fail('Caminho de projeto inválido.');
    const { events, push } = collect();
    const result = await karafService.buildAndDeployMaven(request, projectPath, skipTests !== false, push('chunk'), 'mcp');
    return ok({ result, events });
  }
);

server.registerTool(
  'karaf_get_deploy_history',
  {
    title: 'Histórico de deploys Karaf',
    description: 'Lista o histórico persistido de deploys/builds Karaf (mais recente primeiro, até 200 entradas).'
  },
  async () => ok({ history: karafService.getDeployHistory() })
);

server.registerTool(
  'karaf_run_maven_build',
  {
    title: 'Build Maven',
    description: 'Roda "mvn clean install" no projeto informado. Bloqueia até concluir.',
    inputSchema: { projectPath: z.string(), skipTests: z.boolean().optional() }
  },
  async ({ projectPath, skipTests }) => {
    if (!isSafeLocalPath(projectPath)) return fail('Caminho de projeto inválido.');
    const { events, push } = collect();
    const result = await karafService.runMavenBuild(projectPath, skipTests !== false, push('chunk'));
    return ok({ result, events });
  }
);

server.registerTool(
  'karaf_verify_bundle',
  {
    title: 'Verificar instalação no Karaf',
    description:
      'Confirma se a feature/bundle está instalada e ativa após o deploy. Roda "feature:list -i" e "bundle:list" e filtra as linhas pelo termo informado (artifactId ou nome da feature). Bloqueia até concluir.',
    inputSchema: {
      matchTerm: z.string(),
      user: z.string().optional(),
      pass: z.string().optional(),
      port: z.number().int().optional()
    }
  },
  async ({ matchTerm, user, pass, port }) => {
    const { events, push } = collect();
    const result = await karafService.verifyInstallation(matchTerm, push('chunk'), { user, pass, port });
    return ok({ result, events });
  }
);

server.registerTool(
  'karaf_parse_pom',
  {
    title: 'Parsear pom.xml',
    description: 'Lê pom.xml/deploy-local.bat do projeto e sugere comandos de deploy Karaf.',
    inputSchema: { projectPath: z.string() }
  },
  async ({ projectPath }) => {
    if (!isSafeLocalPath(projectPath)) return fail('Caminho de projeto inválido.');
    return ok(karafService.parseProjectPomOrBat(projectPath));
  }
);

// --- 3b. Karaf - Gerência de Bundles ---
const KarafCredentialsSchema = z.object({
  user: z.string().optional(),
  pass: z.string().optional(),
  port: z.number().int().optional()
});

const BundleActionSchema = z.enum(['start', 'stop', 'restart', 'uninstall', 'refresh', 'resolve']);

server.registerTool(
  'karaf_list_bundles',
  {
    title: 'Listar bundles',
    description: 'Executa "bundle:list -s" e retorna a lista estruturada de bundles OSGi instalados.',
    inputSchema: { credentials: KarafCredentialsSchema.optional() }
  },
  async ({ credentials }) => ok(await karafService.listBundlesParsed(credentials))
);

server.registerTool(
  'karaf_get_bundle_details',
  {
    title: 'Detalhes do bundle',
    description: 'Inspeciona cabeçalhos do manifesto e fiações OSGi de um bundle específico pelo ID.',
    inputSchema: { bundleId: z.string(), credentials: KarafCredentialsSchema.optional() }
  },
  async ({ bundleId, credentials }) => {
    const details = await karafService.getBundleDetails(bundleId, credentials);
    if (!details) return fail('Bundle não encontrado ou ID inválido.');
    return ok(details);
  }
);

server.registerTool(
  'karaf_check_bundle_dependencies',
  {
    title: 'Checar dependentes do bundle',
    description: 'Verifica bundles dependentes antes de desinstalar/alterar um bundle existente, com nível de risco.',
    inputSchema: { bundleId: z.string(), credentials: KarafCredentialsSchema.optional() }
  },
  async ({ bundleId, credentials }) => ok(await karafService.checkBundleDependencies(bundleId, credentials))
);

server.registerTool(
  'karaf_check_install_dependencies',
  {
    title: 'Checar colisão antes de instalar',
    description: 'Verifica se já existe um bundle com o mesmo nome/localização instalado antes de instalar/atualizar.',
    inputSchema: {
      location: z.string().optional(),
      symbolicName: z.string().optional(),
      version: z.string().optional(),
      credentials: KarafCredentialsSchema.optional()
    }
  },
  async ({ location, symbolicName, version, credentials }) =>
    ok(await karafService.checkInstallDependencies({ location, symbolicName, version }, credentials))
);

server.registerTool(
  'karaf_manage_bundle',
  {
    title: 'Gerenciar ciclo de vida do bundle',
    description:
      'Executa start, stop, restart, uninstall, refresh ou resolve em um bundle pelo ID. "resolve" força o framework OSGi a tentar resolver novamente um bundle travado em Installed (dependência ausente).',
    inputSchema: { action: BundleActionSchema, bundleId: z.string(), credentials: KarafCredentialsSchema.optional() }
  },
  async ({ action, bundleId, credentials }) => ok(await karafService.manageBundle(action, bundleId, credentials))
);

server.registerTool(
  'karaf_get_log',
  {
    title: 'Ler log do container Karaf',
    description:
      'Lê o log interno do Karaf (log:display, Pax Logging) — diferente da saída do console embedded, reflete o que os bundles de fato logaram e funciona contra Karaf local ou remoto via SSH.',
    inputSchema: { lines: z.number().int().positive().optional(), credentials: KarafCredentialsSchema.optional() }
  },
  async ({ lines, credentials }) => ok(await karafService.getKarafLog(lines, credentials))
);

server.registerTool(
  'karaf_install_bundle',
  {
    title: 'Instalar novo bundle',
    description: 'Instala um bundle no Karaf a partir de coordenada Maven (mvn:...) ou caminho de arquivo local.',
    inputSchema: {
      location: z.string(),
      startImmediately: z.boolean().optional(),
      credentials: KarafCredentialsSchema.optional()
    }
  },
  async ({ location, startImmediately, credentials }) => {
    const { events, push } = collect();
    const result = await karafService.installBundle({ location, startImmediately, credentials }, push('chunk'));
    return ok({ result, events });
  }
);

server.registerTool(
  'karaf_uninstall_bundle',
  {
    title: 'Desinstalar bundle',
    description: 'Desinstala um bundle existente do runtime OSGi e atualiza fiações (bundle:refresh).',
    inputSchema: { bundleId: z.string(), credentials: KarafCredentialsSchema.optional() }
  },
  async ({ bundleId, credentials }) => ok(await karafService.uninstallBundle(bundleId, credentials))
);

server.registerTool(
  'karaf_reinstall_bundle',
  {
    title: 'Reinstalar/atualizar bundle',
    description:
      'Atualiza um bundle já instalado (bundle:update + refresh + start). Opcionalmente roda "mvn clean install" antes (rebuild+projectPath). Bloqueia até concluir.',
    inputSchema: {
      bundleId: z.string(),
      location: z.string().optional(),
      projectPath: z.string().optional(),
      rebuild: z.boolean().optional(),
      credentials: KarafCredentialsSchema.optional()
    }
  },
  async ({ bundleId, location, projectPath, rebuild, credentials }) => {
    if (projectPath && !isSafeLocalPath(projectPath)) return fail('Caminho de projeto inválido.');
    const { events, push } = collect();
    const result = await karafService.reinstallBundle(
      { bundleId, location, projectPath, rebuild, credentials },
      push('chunk')
    );
    return ok({ result, events });
  }
);

server.registerTool(
  'karaf_update_bundle_version',
  {
    title: 'Atualizar versão do bundle',
    description: 'Atualiza um bundle para uma nova versão/localização (bundle:update + refresh + start). Bloqueia até concluir.',
    inputSchema: {
      bundleId: z.string(),
      newVersionOrLocation: z.string(),
      credentials: KarafCredentialsSchema.optional()
    }
  },
  async ({ bundleId, newVersionOrLocation, credentials }) =>
    ok(await karafService.updateBundleVersion({ bundleId, newVersionOrLocation, credentials }))
);

server.registerTool(
  'karaf_detect_wiring_conflicts',
  {
    title: 'Detectar conflitos de fiação (wiring) e pacotes OSGi',
    description:
      'Analisa os bundles do Apache Karaf detectando estados não ativos (Resolved/Installed/Failure) e colisões de versão do mesmo symbolicName (split packages/classloader conflicts), retornando diagnósticos e ações recomendadas.',
    inputSchema: {
      credentials: KarafCredentialsSchema.optional()
    }
  },
  async ({ credentials }) => {
    const bundles = await karafService.listBundlesParsed(credentials);
    if (!bundles || bundles.length === 0) {
      return fail('Não foi possível listar os bundles do Karaf. Verifique se o Karaf está em execução e as credenciais SSH/porta.');
    }

    // 1. Bundles não-ativos
    const nonActiveBundles = bundles.filter((b) => b.state !== 'Active');

    // 2. Colisões de versão (mesmo symbolicName ou name com múltiplas instâncias)
    const bySymbolicName = new Map<string, typeof bundles>();
    for (const b of bundles) {
      const key = (b.symbolicName || b.name || '').trim();
      if (!key || key.startsWith('Bundle ')) continue;
      if (!bySymbolicName.has(key)) {
        bySymbolicName.set(key, []);
      }
      bySymbolicName.get(key)!.push(b);
    }

    const duplicateBundles = Array.from(bySymbolicName.entries())
      .filter(([_, list]) => list.length > 1)
      .map(([name, list]) => ({
        symbolicName: name,
        instances: list.map((b) => ({ id: b.id, version: b.version, state: b.state })),
        hasMultipleActive: list.filter((b) => b.state === 'Active').length > 1
      }));

    // Coletar diagnóstico para os primeiros bundles não ativos (máx 5 para evitar overhead de comando SSH)
    const unresolvedDetails: Array<{ id: string; name: string; state: string; diag?: string }> = [];
    for (const b of nonActiveBundles.slice(0, 5)) {
      let diagText: string | undefined;
      try {
        const diagRes = await karafService.executeKarafCommand(`bundle:diag ${b.id}`, () => {}, credentials);
        if (diagRes.stdout && diagRes.stdout.trim().length > 0) {
          diagText = diagRes.stdout.trim();
        }
      } catch {
        // fallback silencioso se diag falhar
      }
      unresolvedDetails.push({
        id: b.id,
        name: b.symbolicName || b.name,
        state: b.state,
        diag: diagText
      });
    }

    const conflicts: Array<{
      severity: 'high' | 'medium' | 'low';
      title: string;
      description: string;
      recommendation: string;
      bundleIds: string[];
    }> = [];

    // Gerar conflitos para versões duplicadas ativas
    for (const dup of duplicateBundles) {
      if (dup.hasMultipleActive) {
        conflicts.push({
          severity: 'high',
          title: `Múltiplas versões ativas de ${dup.symbolicName}`,
          description: `O bundle '${dup.symbolicName}' possui ${dup.instances.length} versões instaladas sendo mais de uma no estado 'Active'. Isso pode causar ClassCastException ou conflito de export/import package OSGi.`,
          recommendation: `Desinstale a versão obsoleta com 'bundle:uninstall <ID>' ou use a ferramenta 'karaf_uninstall_bundle'.`,
          bundleIds: dup.instances.map((i) => i.id)
        });
      } else {
        conflicts.push({
          severity: 'medium',
          title: `Múltiplas instâncias instaladas de ${dup.symbolicName}`,
          description: `Existem ${dup.instances.length} versões registradas (${dup.instances.map((i) => `${i.version} [${i.state}]`).join(', ')}).`,
          recommendation: `Verifique se as versões inativas são necessárias ou remova-as para economizar memória e evitar ambiguidades.`,
          bundleIds: dup.instances.map((i) => i.id)
        });
      }
    }

    // Gerar conflitos para bundles em estado Installed ou Resolved
    for (const b of nonActiveBundles) {
      conflicts.push({
        severity: b.state === 'Installed' || b.state === 'Resolved' ? 'medium' : 'low',
        title: `Bundle ${b.id} (${b.symbolicName || b.name}) em estado '${b.state}'`,
        description: `O bundle não está ativo no runtime OSGi.`,
        recommendation: `Execute 'bundle:diag ${b.id}' para verificar dependências ausentes (Unsatisfied Requirements) ou 'bundle:start ${b.id}' para iniciá-lo.`,
        bundleIds: [b.id]
      });
    }

    const healthy = conflicts.filter((c) => c.severity === 'high').length === 0 && nonActiveBundles.length === 0;

    return ok({
      healthy,
      summary: {
        totalBundles: bundles.length,
        activeBundles: bundles.filter((b) => b.state === 'Active').length,
        nonActiveBundlesCount: nonActiveBundles.length,
        duplicateSymbolicNamesCount: duplicateBundles.length,
        highSeverityConflicts: conflicts.filter((c) => c.severity === 'high').length
      },
      conflicts,
      unresolvedDiagnostics: unresolvedDetails,
      duplicates: duplicateBundles
    });
  }
);

// --- 3c. Karaf - Métricas de Memória JVM ---
server.registerTool(
  'karaf_get_jvm_memory',
  {
    title: 'Consultar métricas de memória JVM (Heap/Non-Heap)',
    description:
      'Obtém telemetria em tempo real da JVM do Karaf: consumo de Heap e Non-Heap (usado, alocado, máximo), percentual, contagem de threads, classes carregadas e status de alerta de OutOfMemory (OOM).',
    inputSchema: { credentials: KarafCredentialsSchema.optional() }
  },
  async ({ credentials }) => ok(await karafService.getJvmMemoryMetrics(credentials))
);

server.registerTool(
  'karaf_trigger_gc',
  {
    title: 'Executar Garbage Collection (GC) na JVM',
    description: 'Solicita a execução imediata do Garbage Collector na JVM do Apache Karaf via comando nativo ou JMX.',
    inputSchema: { credentials: KarafCredentialsSchema.optional() }
  },
  async ({ credentials }) => ok(await karafService.triggerGarbageCollection(credentials))
);

// --- 3d. Karaf - Features e Repositórios Maven ---
server.registerTool(
  'karaf_list_feature_repos',
  {
    title: 'Listar repositórios de features Karaf',
    description: 'Lista todos os repositórios Maven/XML de features registrados no Apache Karaf (feature:repo-list).',
    inputSchema: { credentials: KarafCredentialsSchema.optional() }
  },
  async ({ credentials }) => ok(await karafService.listFeatureRepositories(credentials))
);

server.registerTool(
  'karaf_add_feature_repo',
  {
    title: 'Adicionar repositório de feature',
    description:
      'Registra uma nova URL de repositório de features (ex: mvn:br.com.totvs.winthor/features/1.0.0/xml/features) no Karaf.',
    inputSchema: {
      url: z.string(),
      credentials: KarafCredentialsSchema.optional()
    }
  },
  async ({ url, credentials }) =>
    ok(await karafService.addFeatureRepository(url, credentials))
);

server.registerTool(
  'karaf_remove_feature_repo',
  {
    title: 'Remover repositório de feature',
    description: 'Remove um repositório de features registrado pelo nome ou URL (feature:repo-remove).',
    inputSchema: {
      repoNameOrUrl: z.string(),
      credentials: KarafCredentialsSchema.optional()
    }
  },
  async ({ repoNameOrUrl, credentials }) =>
    ok(await karafService.removeFeatureRepository(repoNameOrUrl, credentials))
);

server.registerTool(
  'karaf_refresh_feature_repo',
  {
    title: 'Atualizar repositório de feature',
    description:
      'Recarrega as definições de um repositório de features registrado ou de todos os repositórios (feature:repo-refresh).',
    inputSchema: {
      repoNameOrUrl: z.string().optional(),
      credentials: KarafCredentialsSchema.optional()
    }
  },
  async ({ repoNameOrUrl, credentials }) =>
    ok(await karafService.refreshFeatureRepository(repoNameOrUrl, credentials))
);

server.registerTool(
  'karaf_list_all_features',
  {
    title: 'Listar todas as features do Karaf',
    description:
      'Lista todas as features registradas no Karaf (instaladas e disponíveis), com nome, versão, status e repositório de origem.',
    inputSchema: {
      installedOnly: z.boolean().optional(),
      credentials: KarafCredentialsSchema.optional()
    }
  },
  async ({ installedOnly, credentials }) =>
    ok(await karafService.listAllFeatures(installedOnly, credentials))
);

// --- 3e. Karaf - Análise de Logs e Exceções ---
server.registerTool(
  'karaf_analyze_log',
  {
    title: 'Analisar log de exceções WinThor e Karaf',
    description:
      'Analisa um texto de log ou o log recente do Karaf, detectando e categorizando erros críticos (ORA-XXXXX, NullPointerException, BundleException, OutOfMemoryError, ClassNotFoundException) com comandos sugeridos de diagnóstico.',
    inputSchema: {
      logText: z.string().optional(),
      lines: z.number().int().positive().optional(),
      credentials: KarafCredentialsSchema.optional()
    }
  },
  async ({ logText, lines, credentials }) => {
    let text = logText;
    if (!text) {
      const res = await karafService.getKarafLog(lines ?? 300, credentials);
      text = res.output;
    }
    return ok(karafService.analyzeLogText(text || ''));
  }
);

// --- 3.5. Containers (Docker / Podman) ---
server.registerTool(
  'docker_status',
  { title: 'Status dos Containers', description: 'Verifica se o motor de containers (Docker ou Podman) está instalado e em execução.' },
  async () => ok(await dockerService.checkDockerStatus())
);
server.registerTool(
  'container_status',
  { title: 'Status dos Containers', description: 'Verifica se o motor de containers (Docker ou Podman) está instalado e em execução.' },
  async () => ok(await dockerService.checkDockerStatus())
);

server.registerTool(
  'docker_list_containers',
  { title: 'Listar containers', description: 'Lista todos os containers locais (em execução e parados) via Docker ou Podman.' },
  async () => ok(await dockerService.listContainers())
);
server.registerTool(
  'container_list',
  { title: 'Listar containers', description: 'Lista todos os containers locais (em execução e parados) via Docker ou Podman.' },
  async () => ok(await dockerService.listContainers())
);

server.registerTool(
  'docker_start_container',
  {
    title: 'Iniciar container',
    description: 'Inicia um container existente pelo ID ou nome.',
    inputSchema: { containerId: z.string() }
  },
  async ({ containerId }) => {
    try {
      return ok({ success: await dockerService.startContainer(containerId) });
    } catch (err: any) {
      return fail(err.message || 'Falha ao iniciar container');
    }
  }
);
server.registerTool(
  'container_start',
  {
    title: 'Iniciar container',
    description: 'Inicia um container existente pelo ID ou nome.',
    inputSchema: { containerId: z.string() }
  },
  async ({ containerId }) => {
    try {
      return ok({ success: await dockerService.startContainer(containerId) });
    } catch (err: any) {
      return fail(err.message || 'Falha ao iniciar container');
    }
  }
);

server.registerTool(
  'docker_stop_container',
  {
    title: 'Parar container',
    description: 'Para um container em execução pelo ID ou nome.',
    inputSchema: { containerId: z.string() }
  },
  async ({ containerId }) => {
    try {
      return ok({ success: await dockerService.stopContainer(containerId) });
    } catch (err: any) {
      return fail(err.message || 'Falha ao parar container');
    }
  }
);
server.registerTool(
  'container_stop',
  {
    title: 'Parar container',
    description: 'Para um container em execução pelo ID ou nome.',
    inputSchema: { containerId: z.string() }
  },
  async ({ containerId }) => {
    try {
      return ok({ success: await dockerService.stopContainer(containerId) });
    } catch (err: any) {
      return fail(err.message || 'Falha ao parar container');
    }
  }
);

const startSequenceSchema = {
  containers: z.array(
    z.object({
      name: z.string(),
      delay: z.number().int().optional()
    })
  ).describe('Lista ordenada de containers para iniciar com delay opcional em segundos')
};

server.registerTool(
  'docker_start_sequence',
  {
    title: 'Subir grupo de containers',
    description: 'Inicia uma lista ou grupo de containers em ordem com delays opcionais entre eles.',
    inputSchema: startSequenceSchema
  },
  async ({ containers }) => {
    return ok(await dockerService.startContainerSequence(containers));
  }
);
server.registerTool(
  'container_start_sequence',
  {
    title: 'Subir grupo de containers',
    description: 'Inicia uma lista ou grupo de containers em ordem com delays opcionais entre eles.',
    inputSchema: startSequenceSchema
  },
  async ({ containers }) => {
    return ok(await dockerService.startContainerSequence(containers));
  }
);

const stopSequenceSchema = {
  containers: z.array(z.string()).describe('Lista de nomes ou IDs de containers a parar')
};

server.registerTool(
  'docker_stop_sequence',
  {
    title: 'Parar grupo de containers',
    description: 'Para uma lista ou grupo de containers em sequência.',
    inputSchema: stopSequenceSchema
  },
  async ({ containers }) => {
    return ok(await dockerService.stopContainerSequence(containers));
  }
);
server.registerTool(
  'container_stop_sequence',
  {
    title: 'Parar grupo de containers',
    description: 'Para uma lista ou grupo de containers em sequência.',
    inputSchema: stopSequenceSchema
  },
  async ({ containers }) => {
    return ok(await dockerService.stopContainerSequence(containers));
  }
);

server.registerTool(
  'docker_restart_container',
  {
    title: 'Reiniciar container',
    description: 'Reinicia um container pelo ID ou nome.',
    inputSchema: { containerId: z.string() }
  },
  async ({ containerId }) => {
    try {
      return ok({ success: await dockerService.restartContainer(containerId) });
    } catch (err: any) {
      return fail(err.message || 'Falha ao reiniciar container');
    }
  }
);
server.registerTool(
  'container_restart',
  {
    title: 'Reiniciar container',
    description: 'Reinicia um container pelo ID ou nome.',
    inputSchema: { containerId: z.string() }
  },
  async ({ containerId }) => {
    try {
      return ok({ success: await dockerService.restartContainer(containerId) });
    } catch (err: any) {
      return fail(err.message || 'Falha ao reiniciar container');
    }
  }
);

server.registerTool(
  'docker_get_container_logs',
  {
    title: 'Logs do container',
    description: 'Retorna as últimas linhas de log de um container.',
    inputSchema: { containerId: z.string(), lines: z.number().int().optional() }
  },
  async ({ containerId, lines }) => {
    try {
      return ok({ logs: await dockerService.getContainerLogs(containerId, lines) });
    } catch (err: any) {
      return fail(err.message || 'Falha ao obter logs do container');
    }
  }
);
server.registerTool(
  'container_logs',
  {
    title: 'Logs do container',
    description: 'Retorna as últimas linhas de log de um container.',
    inputSchema: { containerId: z.string(), lines: z.number().int().optional() }
  },
  async ({ containerId, lines }) => {
    try {
      return ok({ logs: await dockerService.getContainerLogs(containerId, lines) });
    } catch (err: any) {
      return fail(err.message || 'Falha ao obter logs do container');
    }
  }
);

server.registerTool(
  'docker_remove_container',
  {
    title: 'Remover container',
    description: 'Remove forçadamente um container pelo ID ou nome (irreversível).',
    inputSchema: { containerId: z.string() }
  },
  async ({ containerId }) => {
    try {
      return ok({ success: await dockerService.removeContainer(containerId) });
    } catch (err: any) {
      return fail(err.message || 'Falha ao remover container');
    }
  }
);
server.registerTool(
  'container_remove',
  {
    title: 'Remover container',
    description: 'Remove forçadamente um container pelo ID ou nome (irreversível).',
    inputSchema: { containerId: z.string() }
  },
  async ({ containerId }) => {
    try {
      return ok({ success: await dockerService.removeContainer(containerId) });
    } catch (err: any) {
      return fail(err.message || 'Falha ao remover container');
    }
  }
);

server.registerTool(
  'docker_get_stats',
  {
    title: 'Estatísticas dos containers',
    description: 'Retorna estatísticas de uso de CPU, memória e rede dos containers ativos (Docker ou Podman).'
  },
  async () => ok(await dockerService.getContainerStats())
);
server.registerTool(
  'container_get_stats',
  {
    title: 'Estatísticas dos containers',
    description: 'Retorna estatísticas de uso de CPU, memória e rede dos containers ativos (Docker ou Podman).'
  },
  async () => ok(await dockerService.getContainerStats())
);

const composeUpSchema = {
  composeFilePath: z.string(),
  profile: z.string().optional(),
  detach: z.boolean().optional()
};
const runComposeUp = async ({ composeFilePath, profile, detach }: { composeFilePath: string; profile?: string; detach?: boolean }) => {
  if (!isSafeLocalPath(composeFilePath)) return fail('Caminho de arquivo docker-compose inválido.');
  let output = '';
  const result = await dockerService.composeUp(composeFilePath, { profile, detach }, (chunk) => {
    output += chunk;
  });
  return ok({ ...result, output });
};
server.registerTool(
  'docker_compose_up',
  { title: 'Subir docker-compose', description: 'Sobe os serviços definidos em um docker-compose.yml (equivalente a docker compose up -d).', inputSchema: composeUpSchema },
  runComposeUp
);
server.registerTool(
  'container_compose_up',
  { title: 'Subir docker-compose', description: 'Sobe os serviços definidos em um docker-compose.yml (equivalente a docker compose up -d).', inputSchema: composeUpSchema },
  runComposeUp
);

const composeDownSchema = { composeFilePath: z.string(), profile: z.string().optional() };
const runComposeDown = async ({ composeFilePath, profile }: { composeFilePath: string; profile?: string }) => {
  if (!isSafeLocalPath(composeFilePath)) return fail('Caminho de arquivo docker-compose inválido.');
  let output = '';
  const result = await dockerService.composeDown(composeFilePath, { profile }, (chunk) => {
    output += chunk;
  });
  return ok({ ...result, output });
};
server.registerTool(
  'docker_compose_down',
  { title: 'Derrubar docker-compose', description: 'Derruba os serviços definidos em um docker-compose.yml (equivalente a docker compose down).', inputSchema: composeDownSchema },
  runComposeDown
);
server.registerTool(
  'container_compose_down',
  { title: 'Derrubar docker-compose', description: 'Derruba os serviços definidos em um docker-compose.yml (equivalente a docker compose down).', inputSchema: composeDownSchema },
  runComposeDown
);

const composeStatusSchema = { composeFilePath: z.string(), profile: z.string().optional() };
const runComposeStatus = async ({ composeFilePath, profile }: { composeFilePath: string; profile?: string }) => {
  if (!isSafeLocalPath(composeFilePath)) return fail('Caminho de arquivo docker-compose inválido.');
  return ok(await dockerService.composeStatus(composeFilePath, profile));
};
server.registerTool(
  'docker_compose_status',
  { title: 'Status do docker-compose', description: 'Lista o status dos serviços de um docker-compose.yml (equivalente a docker compose ps).', inputSchema: composeStatusSchema },
  runComposeStatus
);
server.registerTool(
  'container_compose_status',
  { title: 'Status do docker-compose', description: 'Lista o status dos serviços de um docker-compose.yml (equivalente a docker compose ps).', inputSchema: composeStatusSchema },
  runComposeStatus
);

// --- 4. Git & Azure DevOps ---
server.registerTool(
  'git_list_projects',
  {
    title: 'Listar repositórios',
    description:
      'Lista os repositórios Git encontrados na pasta de projetos configurada. Por padrão só lê o filesystem; ' +
      'com includeUncommittedCount=true roda git status em cada repositório e preenche uncommittedCount.',
    inputSchema: {
      includeUncommittedCount: z
        .boolean()
        .optional()
        .describe('Conta as alterações pendentes de cada repositório (mais lento em pastas com muitos projetos).')
    }
  },
  async ({ includeUncommittedCount }) => {
    if (!includeUncommittedCount) return ok(await gitAzureService.listProjects());
    const counts = await gitAzureService.getUncommittedCounts();
    const projects = await gitAzureService.listProjects();
    return ok(projects.map((p) => ({ ...p, uncommittedCount: counts[p.path] ?? p.uncommittedCount })));
  }
);

server.registerTool(
  'git_get_project_info',
  {
    title: 'Info do repositório',
    description: 'Branch atual, branches, remote e info do Azure DevOps de um repositório.',
    inputSchema: { projectPath: z.string() }
  },
  async ({ projectPath }) => {
    if (!isSafeLocalPath(projectPath)) return fail('Caminho de projeto inválido.');
    return ok(await gitAzureService.getProjectInfo(projectPath));
  }
);

server.registerTool(
  'git_build_pr_url',
  {
    title: 'Montar URL de Pull Request',
    description: 'Monta a URL de criação de PR/MR no provedor detectado do repositório (Azure DevOps, GitHub ou GitLab) para o branch de destino.',
    inputSchema: { projectPath: z.string(), targetBranch: z.string().optional() }
  },
  async ({ projectPath, targetBranch }) => {
    if (!isSafeLocalPath(projectPath)) return fail('Caminho de projeto inválido.');
    return ok({ url: await gitAzureService.buildPrUrl(projectPath, targetBranch) });
  }
);

server.registerTool(
  'git_exec_command',
  {
    title: 'Comando Git',
    description: 'Executa um comando Git pré-definido (fetch, pull, status, stash, stash-pop) no repositório.',
    inputSchema: {
      projectPath: z.string(),
      command: z.enum(['fetch', 'pull', 'status', 'stash', 'stash-pop'])
    }
  },
  async ({ projectPath, command }) => {
    if (!isSafeLocalPath(projectPath)) return fail('Caminho de projeto inválido.');
    return ok(await gitAzureService.executeGitCommand(projectPath, command));
  }
);

server.registerTool(
  'git_checkout_branch',
  {
    title: 'Trocar/criar branch',
    description: 'Faz checkout de uma branch existente ou cria uma nova (createNew) no repositório informado.',
    inputSchema: {
      projectPath: z.string(),
      branchName: z.string(),
      createNew: z.boolean().optional(),
      baseBranch: z.string().optional().describe('Branch base de onde derivar ao criar nova branch.')
    }
  },
  async ({ projectPath, branchName, createNew, baseBranch }) => {
    if (!isSafeLocalPath(projectPath)) return fail('Caminho de projeto inválido.');
    return ok(await gitAzureService.checkoutBranch(projectPath, branchName, createNew ?? false, baseBranch));
  }
);

server.registerTool(
  'git_create_task_branch',
  {
    title: 'Criar branch a partir de tarefa (Azure DevOps / Jira)',
    description:
      'Cria e alterna para uma nova branch padronizada baseada em ID/chave e título de tarefa (Azure DevOps ou Jira), gerando o slug correto e permitindo escolher prefixo e branch base.',
    inputSchema: {
      projectPath: z.string().describe('Caminho absoluto do repositório Git.'),
      taskId: z.string().optional().describe('ID numérico da tarefa no Azure DevOps (ex: "12345") ou chave no Jira (ex: "PROJ-10").'),
      title: z.string().optional().describe('Título ou descrição resumida da tarefa para slugificação.'),
      prefix: z.string().optional().describe('Prefixo da branch (ex: "feature/", "bugfix/", "hotfix/", "task/"). Padrão: "feature/".'),
      baseBranch: z.string().optional().describe('Branch base a partir da qual a nova branch será criada (ex: "develop", "main"). Padrão: branch atual.')
    }
  },
  async ({ projectPath, taskId, title, prefix, baseBranch }) => {
    if (!isSafeLocalPath(projectPath)) return fail('Caminho de projeto inválido.');
    const result = await gitAzureService.createTaskBranch(projectPath, { taskId, title, prefix, baseBranch });
    if (!result.success) return fail(result.output || 'Falha ao criar branch de tarefa.');
    return ok(result);
  }
);

server.registerTool(
  'git_list_tasks',
  {
    title: 'Listar tarefas integradas (Azure DevOps e Jira)',
    description:
      'Consulta tarefas de trabalho ativas no Azure DevOps (Work Items) e no Jira para vinculação de branches e commits.',
    inputSchema: {
      projectPath: z.string().optional().describe('Caminho do repositório para detectar contexto do Azure DevOps.'),
      query: z.string().optional().describe('Termo de busca opcional (ID da tarefa, chave ou parte do título).')
    }
  },
  async ({ projectPath, query }) => {
    if (projectPath && !isSafeLocalPath(projectPath)) return fail('Caminho de projeto inválido.');
    const tasks = await gitAzureService.fetchTasks(projectPath, query);
    return ok({ total: tasks.length, tasks });
  }
);

// Tools de leitura: o service devolve lista vazia para caminho que não é repositório, o que para
// um agente pareceria "sem alterações". Por isso cada uma confirma o repositório antes.
async function requireGitRepo(projectPath: string): Promise<string | null> {
  if (!isSafeLocalPath(projectPath)) return 'Caminho de projeto inválido.';
  const info = await gitAzureService.getProjectInfo(projectPath, false);
  return info ? null : `Nenhum repositório Git encontrado em ${projectPath}.`;
}

server.registerTool(
  'git_get_status',
  {
    title: 'Status do repositório',
    description:
      'Lista os arquivos alterados, novos, removidos e renomeados do repositório (git status), indicando se estão no stage.',
    inputSchema: { projectPath: z.string() }
  },
  async ({ projectPath }) => {
    const error = await requireGitRepo(projectPath);
    if (error) return fail(error);
    const files = await gitAzureService.getStatusDetails(projectPath);
    return ok({ totalFiles: files.length, files });
  }
);

const GIT_DIFF_DEFAULT_MAX_CHARS = 50_000;

server.registerTool(
  'git_get_diff',
  {
    title: 'Diff do repositório',
    description:
      'Diff unificado das alterações em relação ao HEAD (staged + não staged), do repositório inteiro ou de um arquivo. ' +
      'Arquivos não rastreados só aparecem quando pedidos individualmente em `file`.',
    inputSchema: {
      projectPath: z.string(),
      file: z.string().optional().describe('Caminho do arquivo relativo à raiz do repositório.'),
      maxChars: z
        .number()
        .int()
        .positive()
        .max(500_000)
        .optional()
        .describe(`Limite de caracteres do diff devolvido (padrão ${GIT_DIFF_DEFAULT_MAX_CHARS}).`)
    }
  },
  async ({ projectPath, file, maxChars }) => {
    const error = await requireGitRepo(projectPath);
    if (error) return fail(error);
    const result = await gitAzureService.getDiff(projectPath, file);
    if (!result.success) return fail(result.error || 'Falha ao obter o diff.');
    const limit = maxChars ?? GIT_DIFF_DEFAULT_MAX_CHARS;
    const truncated = result.diff.length > limit;
    return ok({
      files: result.files,
      diff: truncated ? result.diff.slice(0, limit) : result.diff,
      ...(truncated
        ? {
            truncated: true,
            totalChars: result.diff.length,
            notice: 'Diff cortado no limite; peça um arquivo específico em `file` ou aumente `maxChars`.'
          }
        : {})
    });
  }
);

server.registerTool(
  'git_get_commit_history',
  {
    title: 'Histórico de commits',
    description: 'Últimos commits da branch atual (hash abreviado, autor, data e assunto).',
    inputSchema: {
      projectPath: z.string(),
      limit: z.number().int().min(1).max(50).optional().describe('Quantidade de commits (1 a 50, padrão 10).')
    }
  },
  async ({ projectPath, limit }) => {
    const error = await requireGitRepo(projectPath);
    if (error) return fail(error);
    return ok(await gitAzureService.getCommitHistory(projectPath, limit ?? 10));
  }
);

// --- 5. Rotinas ---
server.registerTool(
  'routines_list',
  { title: 'Listar rotinas', description: 'Lista as rotinas (.EXE/.PC) descobertas no catálogo.' },
  async () => ok(routinesService.listRoutines())
);

server.registerTool(
  'routines_check_karaf_status',
  {
    title: 'Verificar status do Karaf/WTA para rotinas',
    description: 'Verifica se o servidor Apache Karaf / WTA está online e respondendo para permitir a autenticação de rotinas via WinThor Start.',
    inputSchema: {}
  },
  async () => {
    return ok(await routinesService.checkKarafWtaStatus());
  }
);

server.registerTool(
  'routines_launch',
  {
    title: 'Executar rotina',
    description: 'Executa uma rotina do catálogo pelo caminho completo do arquivo, via WinThor Start autenticado ou execução direta.',
    inputSchema: {
      fullPath: z.string(),
      forceDirect: z.boolean().optional()
    }
  },
  async ({ fullPath, forceDirect }) => {
    if (!isSafeLocalPath(fullPath)) return fail('Caminho inválido.');
    const result = await routinesService.launchRoutine(fullPath, Boolean(forceDirect));
    if (!result.success) {
      return fail(result.message || 'Falha ao iniciar rotina.');
    }
    return ok(result);
  }
);

server.registerTool(
  'routines_launch_mapped',
  {
    title: 'Executar programa mapeado',
    description: 'Executa um programa mapeado manualmente pelo usuário, pelo id.',
    inputSchema: { id: z.string().min(1) }
  },
  async ({ id }) => ok({ success: routinesService.launchMappedProgram(id) })
);

server.registerTool(
  'routines_toggle_favorite',
  {
    title: 'Alternar favorito',
    description: 'Marca/desmarca uma rotina como favorita.',
    inputSchema: { routineId: z.string().min(1) }
  },
  async ({ routineId }) => ok(configService.toggleFavoriteRoutine(routineId))
);

server.registerTool(
  'routines_download_ccw_routine',
  {
    title: 'Baixar e atualizar rotina da Central de Controle (CCW)',
    description:
      'Baixa a rotina (executável ou pacote ZIP) diretamente da Central de Controle WinThor (CCW) e atualiza na pasta correspondente em C:\\Winthor\\Prod, criando backup prévio (.bak).',
    inputSchema: {
      routineCodeOrName: z
        .string()
        .min(1)
        .describe('Código numérico (ex: "132", "529") ou nome da rotina (ex: "PCSIS132", "PC1406").'),
      winthorVersion: z
        .string()
        .optional()
        .describe('Versão major do WinThor na CCW (ex: "30", "31", "29"). Padrão: "30".'),
      targetModule: z
        .string()
        .optional()
        .describe('Pasta do módulo de destino específico (ex: "MOD-001", "MOD-014", "Raiz"). Se omitido, deduz automaticamente.'),
      backupExisting: z
        .boolean()
        .optional()
        .describe('Se true (padrão), cria cópia de segurança (.bak) do executável existente antes de substituir.')
    }
  },
  async ({ routineCodeOrName, winthorVersion, targetModule, backupExisting }) => {
    const result = await routinesService.downloadAndInstallRoutine({
      routineCodeOrName,
      winthorVersion,
      targetModule,
      backupExisting: backupExisting !== false
    });
    if (!result.success) {
      return fail(result.message || 'Falha ao baixar/atualizar rotina da Central de Controle.');
    }
    return ok(result);
  }
);

server.registerTool(
  'routines_install_local_file',
  {
    title: 'Instalar rotina a partir de arquivo local',
    description:
      'Instala uma rotina no diretório do WinThor (C:\\Winthor\\Prod) a partir de um arquivo .EXE ou .ZIP já baixado localmente na máquina.',
    inputSchema: {
      filePath: z.string().describe('Caminho absoluto do arquivo (.EXE ou .ZIP) no disco local.'),
      routineCodeOrName: z.string().optional().describe('Código ou nome da rotina (opcional, deduzido do nome do arquivo se omitido).'),
      targetModule: z.string().optional().describe('Módulo de destino específico (ex: "MOD-001"). Se omitido, deduz automaticamente.'),
      backupExisting: z.boolean().optional().describe('Se deve criar backup (.bak) do arquivo atual. Padrão: true.')
    }
  },
  async ({ filePath, routineCodeOrName, targetModule, backupExisting }) => {
    if (!isSafeLocalPath(filePath)) return fail('Caminho inválido.');
    const result = await routinesService.installRoutineFromFile(filePath, routineCodeOrName, targetModule, backupExisting !== false);
    if (!result.success) {
      return fail(result.message || 'Falha ao instalar arquivo local da rotina.');
    }
    return ok(result);
  }
);

server.registerTool(
  'routines_get_ccw_catalog',
  {
    title: 'Consultar catálogo de rotinas da Central de Controle',
    description:
      'Consulta a árvore de rotinas e versões disponíveis na Central de Controle (CCW) caso um cookie de sessão esteja configurado.',
    inputSchema: {
      authCookie: z.string().optional().describe('Cookie de autenticação da sessão CCW (opcional se já configurado no app).')
    }
  },
  async ({ authCookie }) => {
    return ok(await routinesService.getCcwCatalog(authCookie));
  }
);

server.registerTool(
  'routines_get_ccw_download_link',
  {
    title: 'Obter link de download da CCW',
    description: 'Retorna a URL oficial direta para download da rotina na Central de Controle do WinThor.',
    inputSchema: {
      routineCodeOrName: z.string().describe('Código numérico ou nome da rotina (ex: "132", "PCSIS132").'),
      winthorVersion: z.string().optional().describe('Versão major do WinThor (ex: "30", "31"). Padrão: "30".')
    }
  },
  async ({ routineCodeOrName, winthorVersion }) => {
    return ok({ url: routinesService.getCcwRoutineDownloadLink(routineCodeOrName, winthorVersion) });
  }
);

server.registerTool(
  'routines_list_backups',
  {
    title: 'Listar backups de rotina',
    description: 'Lista os backups (.bak) existentes para uma rotina ou módulo específico, com data/hora, tamanho e versão PE extraída.',
    inputSchema: {
      routineIdOrName: z.string().describe('Código ou nome da rotina (ex: "PCSIS132", "132") ou nome do arquivo de backup.'),
      moduleFolder: z.string().optional().describe('Pasta do módulo (ex: "MOD-001"). Se omitido, pesquisa no diretório da rotina ou em todos.')
    }
  },
  async ({ routineIdOrName, moduleFolder }) => {
    try {
      const backups = await routinesService.listRoutineBackups(routineIdOrName, moduleFolder);
      return ok({ total: backups.length, backups });
    } catch (err: any) {
      return fail(err.message || 'Falha ao listar backups de rotina.');
    }
  }
);

server.registerTool(
  'routines_restore_backup',
  {
    title: 'Restaurar backup de rotina (Rollback)',
    description: 'Restaura uma versão anterior (.bak) de uma rotina do WinThor, criando preventivamente um backup de segurança (_pre_rollback.bak) da versão atual antes da substituição.',
    inputSchema: {
      backupFilePath: z.string().describe('Caminho absoluto do arquivo .bak a ser restaurado.'),
      targetRoutinePath: z.string().describe('Caminho absoluto do executável .EXE que receberá a versão restaurada.')
    }
  },
  async ({ backupFilePath, targetRoutinePath }) => {
    if (!isSafeLocalPath(backupFilePath)) return fail('Caminho de arquivo de backup inválido.');
    if (!isSafeLocalPath(targetRoutinePath)) return fail('Caminho de executável de destino inválido.');
    const result = await routinesService.restoreRoutineBackup(backupFilePath, targetRoutinePath);
    if (!result.success) {
      return fail(result.message || 'Falha ao restaurar backup da rotina.');
    }
    return ok(result);
  }
);

server.registerTool(
  'routines_delete_backup',
  {
    title: 'Excluir backup de rotina',
    description: 'Exclui definitivamente um arquivo de backup (.bak) de rotina do disco.',
    inputSchema: {
      backupFilePath: z.string().describe('Caminho absoluto do arquivo .bak a ser removido.')
    }
  },
  async ({ backupFilePath }) => {
    if (!isSafeLocalPath(backupFilePath)) return fail('Caminho de backup inválido.');
    const result = await routinesService.deleteRoutineBackup(backupFilePath);
    if (!result.success) {
      return fail(result.message || (result as any).error || 'Falha ao excluir backup de rotina.');
    }
    return ok(result);
  }
);

server.registerTool(
  'routines_get_executable_version',
  {
    title: 'Inspecionar versão do executável (PE Header)',
    description: 'Lê os metadados do cabeçalho PE de um executável .EXE do WinThor para extrair a FileVersion e ProductVersion reais gravadas no binário.',
    inputSchema: {
      filePath: z.string().describe('Caminho absoluto do executável .EXE.')
    }
  },
  async ({ filePath }) => {
    if (!isSafeLocalPath(filePath)) return fail('Caminho de executável inválido.');
    const versionInfo = await routinesService.getExecutableVersion(filePath);
    return ok({ versionInfo });
  }
);

server.registerTool(
  'routines_batch_download',
  {
    title: 'Download em lote de rotinas da CCW',
    description: 'Executa download e atualização em lote de rotinas da Central de Controle (CCW) para todas as favoritas, um módulo funcional ou uma lista específica.',
    inputSchema: {
      targetType: z.enum(['favorites', 'module', 'custom']).describe('Alvo do download em lote: "favorites", "module" ou "custom".'),
      winthorVersion: z.string().optional().describe('Versão major do WinThor na CCW (ex: "30", "31"). Padrão: "30".'),
      moduleFolder: z.string().optional().describe('Pasta do módulo caso targetType seja "module" (ex: "MOD-001").'),
      routineCodes: z.array(z.string()).optional().describe('Lista de códigos/nomes de rotina caso targetType seja "custom".'),
      backupExisting: z.boolean().optional().describe('Se deve gerar backup (.bak) dos executáveis antes de substituir. Padrão: true.')
    }
  },
  async ({ targetType, winthorVersion, moduleFolder, routineCodes, backupExisting }) => {
    const { events, push } = collect();
    const result = await routinesService.downloadRoutinesBatch(
      {
        targetType,
        winthorVersion,
        moduleFolder,
        routineCodes,
        backupExisting: backupExisting !== false
      },
      push('batch-progress')
    );
    return ok({ result, events });
  }
);

// --- 6. Documentação (RAG local) ---
server.registerTool(
  'rag_reindex_docs',
  {
    title: 'Reindexar documentação',
    description:
      'Escaneia os projetos configurados e as pastas de documentação adicionais em busca de README/docs (.md, .mdx, .txt, .pdf, .docx), gera embeddings locais e atualiza o índice de busca. Na primeira vez baixa o modelo de IA da internet. Bloqueia até concluir.'
  },
  async () => ok(await docsIndexService.reindex())
);

server.registerTool(
  'rag_search_docs',
  {
    title: 'Buscar na documentação',
    description: 'Busca semântica (RAG) nos trechos de documentação já indexados (projetos e pastas configuradas).',
    inputSchema: {
      query: z.string().min(1),
      sourceLabel: z.string().optional(),
      topK: z.number().int().min(1).max(50).optional()
    }
  },
  async ({ query, sourceLabel, topK }) => {
    const status = docsIndexService.getStatus();
    if (status.totalChunks === 0) {
      return fail('Índice de documentação vazio. Rode rag_reindex_docs primeiro.');
    }
    return ok(await docsIndexService.search(query, { sourceLabel, topK }));
  }
);

server.registerTool(
  'rag_index_status',
  { title: 'Status do índice de documentação', description: 'Retorna metadados do índice de busca (nº de trechos, arquivos, fontes, última indexação).' },
  async () => ok(docsIndexService.getStatus())
);

server.registerTool(
  'docs_ask_ai',
  {
    title: 'Perguntar à documentação com IA (RAG)',
    description: 'Realiza busca semântica na documentação local indexada e sintetiza uma resposta contextualizada através do LLM ativo (BYOK).',
    inputSchema: {
      query: z.string().min(1),
      topK: z.number().int().min(1).max(20).optional(),
      sourceLabel: z.string().optional()
    }
  },
  async ({ query, topK, sourceLabel }) => {
    try {
      const response = await llmService.askWithDocs({ query, topK, sourceLabel });
      return ok(response);
    } catch (err: any) {
      return fail(err.message || 'Erro ao processar consulta RAG com IA');
    }
  }
);

server.registerTool(
  'llm_chat',
  {
    title: 'Conversar com LLM (BYOK)',
    description: 'Envia mensagens diretamente para o provedor de LLM configurado e ativo no Hub Manager.',
    inputSchema: {
      messages: z.array(
        z.object({
          role: z.enum(['system', 'user', 'assistant']),
          content: z.string()
        })
      ),
      providerId: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().int().min(1).max(32768).optional()
    }
  },
  async (request) => {
    try {
      const response = await llmService.chat(request);
      return ok(response);
    } catch (err: any) {
      return fail(err.message || 'Erro ao comunicar com o LLM');
    }
  }
);

// --- 7. Configurações ---
server.registerTool(
  'settings_get',
  { title: 'Ler configurações', description: 'Retorna as configurações atuais do Hub Manager (com segredos ofuscados).' },
  async () => ok(configService.sanitizeSecrets(configService.getSettings()))
);

server.registerTool(
  'settings_save',
  {
    title: 'Salvar configurações',
    description: 'Persiste um conjunto parcial de configurações do Hub Manager.',
    inputSchema: { settings: z.record(z.string(), z.unknown()) }
  },
  async ({ settings }) => {
    for (const key of SETTINGS_PATH_KEYS) {
      const value = settings[key];
      if (typeof value === 'string' && value && !isSafeLocalPath(value)) {
        return fail(`Caminho inválido ou remoto não permitido para o campo ${key}.`);
      }
    }
    return ok(configService.sanitizeSecrets(configService.saveSettings(settings as Partial<AppSettings>)));
  }
);

// --- 8. Banco de Dados ---
server.registerTool(
  'db_list_connections',
  {
    title: 'Listar conexões de banco',
    description: 'Lista as conexões de banco de dados configuradas no Hub Manager (com senhas ocultadas).'
  },
  async () => {
    const settings = configService.getSettings();
    const connections = (settings.databaseConnections || []).map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      host: c.host,
      port: c.port,
      database: c.database,
      user: c.user,
      oracleMode: c.oracleMode,
      oracleClientPath: c.oracleClientPath,
      oracleThickMode: c.oracleThickMode,
      ssl: c.ssl,
      isDefault: c.isDefault
    }));
    return ok({ connections });
  }
);

server.registerTool(
  'db_list_tns_entries',
  {
    title: 'Listar conexões do tnsnames.ora',
    description:
      'Lê e extrai os aliases e configurações de conexão (Host, Porta, Service Name, SID) do arquivo tnsnames.ora do Oracle configurado no Hub Manager ou de um arquivo específico.',
    inputSchema: {
      filePath: z.string().optional().describe('Caminho do arquivo tnsnames.ora (opcional se já configurado em oracleTnsnamesPath).')
    }
  },
  async ({ filePath }) => {
    const result = await databaseService.parseTnsNames(filePath);
    if (!result.success) {
      return fail(result.error || 'Falha ao processar arquivo tnsnames.ora.');
    }
    return ok(result);
  }
);

server.registerTool(
  'db_test_connection',
  {
    title: 'Testar conexão de banco',
    description: 'Testa conectividade com Oracle, PostgreSQL ou MySQL usando ID salvo ou configuração direta.',
    inputSchema: {
      connectionId: z.string().optional(),
      config: DatabaseConnectionConfigSchema.optional()
    }
  },
  async ({ connectionId, config }) => {
    const targetConfig = resolveDbConfig(connectionId, config);
    if (!targetConfig) {
      return fail('Nenhuma conexão configurada ou encontrada. Informe connectionId ou config.');
    }
    const result = await databaseService.testConnection(targetConfig);
    return ok(result);
  }
);

server.registerTool(
  'db_execute_query',
  {
    title: 'Executar SQL no banco',
    description: 'Executa comando SQL (SELECT, INSERT, UPDATE, DELETE) e retorna linhas, colunas e tempo de resposta.',
    inputSchema: {
      sql: z.string(),
      connectionId: z.string().optional(),
      config: DatabaseConnectionConfigSchema.optional(),
      maxRows: z.number().int().positive().optional()
    }
  },
  async ({ sql, connectionId, config, maxRows }) => {
    const targetConfig = resolveDbConfig(connectionId, config);
    if (!targetConfig) {
      return fail('Nenhuma conexão configurada ou encontrada. Informe connectionId ou config.');
    }
    if (isProductionConnection(targetConfig) && !isReadOnlySql(sql)) {
      return fail(
        `Conexão "${targetConfig.name}" está marcada como produção: o MCP só executa consultas de leitura nela (SELECT, EXPLAIN, SHOW, DESCRIBE). Use o Database Studio para alterar dados.`
      );
    }
    const result = await databaseService.executeQuery(targetConfig, sql, maxRows ?? 200);
    return ok(result);
  }
);

server.registerTool(
  'db_explain_plan',
  {
    title: 'Explain Plan no banco',
    description: 'Obtém o plano de execução SQL no Oracle (DBMS_XPLAN), PostgreSQL ou MySQL.',
    inputSchema: {
      sql: z.string(),
      connectionId: z.string().optional(),
      config: DatabaseConnectionConfigSchema.optional()
    }
  },
  async ({ sql, connectionId, config }) => {
    const targetConfig = resolveDbConfig(connectionId, config);
    if (!targetConfig) {
      return fail('Nenhuma conexão configurada ou encontrada. Informe connectionId ou config.');
    }
    const result = await databaseService.explainPlan(targetConfig, sql);
    return ok(result);
  }
);

server.registerTool(
  'db_analyze_explain_plan',
  {
    title: 'Analisar Explain Plan no banco com Heurísticas',
    description:
      'Obtém o plano de execução SQL no Oracle, PostgreSQL ou MySQL e realiza análise heurística automática apontando Full Table Scans, produtos cartesianos, falta de índices, ordenações em disco e recomendações de otimização.',
    inputSchema: {
      sql: z.string(),
      connectionId: z.string().optional(),
      config: DatabaseConnectionConfigSchema.optional()
    }
  },
  async ({ sql, connectionId, config }) => {
    const targetConfig = resolveDbConfig(connectionId, config);
    if (!targetConfig) {
      return fail('Nenhuma conexão configurada ou encontrada. Informe connectionId ou config.');
    }
    const explainResult = await databaseService.explainPlan(targetConfig, sql);
    const analysis = analyzeExplainPlan(explainResult.planLines, targetConfig.type, sql);
    return ok({
      dbType: targetConfig.type,
      plan: explainResult,
      analysis
    });
  }
);

server.registerTool(
  'db_list_tables',
  {
    title: 'Listar tabelas do banco',
    description: 'Lista as tabelas disponíveis no schema/banco de dados conectado.',
    inputSchema: {
      connectionId: z.string().optional(),
      config: DatabaseConnectionConfigSchema.optional()
    }
  },
  async ({ connectionId, config }) => {
    const targetConfig = resolveDbConfig(connectionId, config);
    if (!targetConfig) {
      return fail('Nenhuma conexão configurada ou encontrada. Informe connectionId ou config.');
    }
    const { tables, error } = await databaseService.listTables(targetConfig);
    if (error) return fail(`Falha ao listar tabelas: ${error}`);
    return ok({ tables, count: tables.length });
  }
);

server.registerTool(
  'db_get_table_columns',
  {
    title: 'Obter colunas da tabela',
    description: 'Lista as colunas, tipos de dados e chaves de uma tabela no Oracle, PostgreSQL ou MySQL.',
    inputSchema: {
      tableName: z.string(),
      connectionId: z.string().optional(),
      config: DatabaseConnectionConfigSchema.optional()
    }
  },
  async ({ tableName, connectionId, config }) => {
    const targetConfig = resolveDbConfig(connectionId, config);
    if (!targetConfig) {
      return fail('Nenhuma conexão configurada ou encontrada. Informe connectionId ou config.');
    }
    const { columns, error } = await databaseService.getTableColumns(targetConfig, tableName);
    if (error) return fail(`Falha ao obter colunas de ${tableName}: ${error}`);
    return ok({ tableName, columns, count: columns.length });
  }
);

server.registerTool(
  'db_get_oracle_active_sessions',
  {
    title: 'Statement Tracer: sessões ativas no Oracle',
    description:
      'Lista as sessões conectadas ao Oracle (v$session) com a instrução SQL atual/última executada por cada uma (join com v$sql via SQL_ID/PREV_SQL_ID). Use para descobrir o que cada app/rotina está rodando agora quando vários sistemas compartilham o mesmo banco.',
    inputSchema: {
      connectionId: z.string().optional(),
      config: DatabaseConnectionConfigSchema.optional(),
      schemaFilter: z.string().optional().describe('Filtra por USERNAME da sessão (schema Oracle).'),
      textFilter: z.string().optional().describe('Filtra sessões cuja SQL contém este texto (case-insensitive).'),
      limit: z.number().int().positive().optional()
    }
  },
  async ({ connectionId, config, schemaFilter, textFilter, limit }) => {
    const targetConfig = resolveDbConfig(connectionId, config);
    if (!targetConfig) {
      return fail('Nenhuma conexão configurada ou encontrada. Informe connectionId ou config.');
    }
    const result = await databaseService.getOracleActiveSessions(targetConfig, { schemaFilter, textFilter, limit });
    return ok(result);
  }
);

server.registerTool(
  'db_get_oracle_recent_statements',
  {
    title: 'Statement Tracer: SQL recente no Oracle',
    description:
      'Lista as instruções SQL mais recentes no cursor cache do Oracle (v$sql), ordenadas por última atividade, mesmo que a sessão que executou já tenha encerrado. Use para descobrir "qual query rodou" logo após uma ação em algum app conectado ao banco.',
    inputSchema: {
      connectionId: z.string().optional(),
      config: DatabaseConnectionConfigSchema.optional(),
      schemaFilter: z.string().optional().describe('Filtra por PARSING_SCHEMA_NAME (schema que fez o parse da SQL).'),
      textFilter: z.string().optional().describe('Filtra instruções cujo texto contém este trecho (case-insensitive).'),
      limit: z.number().int().positive().optional()
    }
  },
  async ({ connectionId, config, schemaFilter, textFilter, limit }) => {
    const targetConfig = resolveDbConfig(connectionId, config);
    if (!targetConfig) {
      return fail('Nenhuma conexão configurada ou encontrada. Informe connectionId ou config.');
    }
    const result = await databaseService.getOracleRecentStatements(targetConfig, { schemaFilter, textFilter, limit });
    return ok(result);
  }
);

server.registerTool(
  'db_get_oracle_statement_binds',
  {
    title: 'Statement Tracer: ler parâmetros de bind (v$sql_bind_capture)',
    description:
      'Consulta no Oracle (v$sql_bind_capture) os parâmetros e variáveis de bind passados na execução de uma instrução SQL (pelo SQL_ID). Retorna a lista de parâmetros (nome, posição, tipo, valor) e o SQL interpolado pronto para execução.',
    inputSchema: {
      connectionId: z.string().optional(),
      config: DatabaseConnectionConfigSchema.optional(),
      sqlId: z.string().describe('O SQL_ID da instrução no Oracle.'),
      sqlText: z.string().optional().describe('Texto original da consulta para gerar o SQL interpolado com os valores de bind.')
    }
  },
  async ({ connectionId, config, sqlId, sqlText }) => {
    const targetConfig = resolveDbConfig(connectionId, config);
    if (!targetConfig) {
      return fail('Nenhuma conexão configurada ou encontrada. Informe connectionId ou config.');
    }
    const result = await databaseService.getOracleStatementBinds(targetConfig, sqlId, sqlText);
    return ok(result);
  }
);

// Captura própria deste processo, independente da iniciada na tela do app (o estado não atravessa
// processos). Não há o que buscar no app aqui: é o próprio assistente que liga a captura, espera o
// usuário agir e lê o resultado — ver OracleTracerCaptureService.
server.registerTool(
  'db_start_oracle_capture',
  {
    title: 'Statement Tracer: iniciar captura contínua',
    description:
      'Inicia uma captura contínua no Oracle: consulta v$session/v$sql em segundo plano a cada intervalMs e acumula as SQLs distintas e a linha do tempo de qual sessão passou a rodar qual SQL. Fluxo típico: iniciar, pedir ao usuário que execute a ação no app/rotina, depois ler com db_get_oracle_capture_state. Reiniciar descarta a captura anterior da conexão. Para sozinha após 30 minutos. Captura própria do servidor MCP: não enxerga a captura iniciada na tela do app.',
    inputSchema: {
      connectionId: z.string().optional(),
      config: DatabaseConnectionConfigSchema.optional(),
      intervalMs: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Intervalo entre consultas ao Oracle em ms (padrão 3000, mínimo 2000).'),
      schemaFilter: z.string().optional().describe('Filtra por schema (USERNAME da sessão / PARSING_SCHEMA_NAME).'),
      textFilter: z.string().optional().describe('Filtra SQLs que contêm este texto (case-insensitive).')
    }
  },
  async ({ connectionId, config, intervalMs, schemaFilter, textFilter }) => {
    const targetConfig = resolveDbConfig(connectionId, config);
    if (!targetConfig) {
      return fail('Nenhuma conexão configurada ou encontrada. Informe connectionId ou config.');
    }
    try {
      const state = oracleTracerCaptureService.startCapture(targetConfig, {
        intervalMs: intervalMs ?? 3000,
        schemaFilter,
        textFilter
      });
      return ok({ connectionId: targetConfig.id, connectionName: targetConfig.name, ...state });
    } catch (err: any) {
      return fail(err?.message || 'Falha ao iniciar a captura.');
    }
  }
);

server.registerTool(
  'db_get_oracle_capture_state',
  {
    title: 'Statement Tracer: ler captura contínua',
    description:
      'Lê o que a captura contínua iniciada por db_start_oracle_capture acumulou até agora (sem pará-la): SQLs distintas (mais recentes primeiro) e a linha do tempo de mudanças de SQL por sessão, além de contadores e último erro.',
    inputSchema: {
      connectionId: z.string().optional(),
      config: DatabaseConnectionConfigSchema.optional(),
      limit: z
        .number()
        .int()
        .positive()
        .max(500)
        .optional()
        .describe('Máximo de SQLs e de eventos de sessão devolvidos (padrão 50); os totais vêm em totalStatements/totalSessionEvents.')
    }
  },
  async ({ connectionId, config, limit }) => {
    const targetConfig = resolveDbConfig(connectionId, config);
    if (!targetConfig) {
      return fail('Nenhuma conexão configurada ou encontrada. Informe connectionId ou config.');
    }
    const max = limit ?? 50;
    const state = oracleTracerCaptureService.getCaptureState(targetConfig.id);
    return ok({
      connectionId: targetConfig.id,
      connectionName: targetConfig.name,
      ...state,
      totalStatements: state.statements.length,
      totalSessionEvents: state.sessionEvents.length,
      statements: state.statements.slice(0, max),
      sessionEvents: state.sessionEvents.slice(0, max)
    });
  }
);

server.registerTool(
  'db_stop_oracle_capture',
  {
    title: 'Statement Tracer: parar captura contínua',
    description:
      'Para a captura contínua da conexão, mantendo o que já foi acumulado para leitura com db_get_oracle_capture_state. Devolve só os contadores.',
    inputSchema: {
      connectionId: z.string().optional(),
      config: DatabaseConnectionConfigSchema.optional()
    }
  },
  async ({ connectionId, config }) => {
    const targetConfig = resolveDbConfig(connectionId, config);
    if (!targetConfig) {
      return fail('Nenhuma conexão configurada ou encontrada. Informe connectionId ou config.');
    }
    const { statements, sessionEvents, ...state } = oracleTracerCaptureService.stopCapture(targetConfig.id);
    return ok({
      connectionId: targetConfig.id,
      ...state,
      totalStatements: statements.length,
      totalSessionEvents: sessionEvents.length
    });
  }
);

server.registerTool(
  'db_clear_oracle_capture',
  {
    title: 'Statement Tracer: descartar captura contínua',
    description: 'Para a captura contínua da conexão (se estiver ativa) e descarta tudo o que ela acumulou.',
    inputSchema: {
      connectionId: z.string().optional(),
      config: DatabaseConnectionConfigSchema.optional()
    }
  },
  async ({ connectionId, config }) => {
    const targetConfig = resolveDbConfig(connectionId, config);
    if (!targetConfig) {
      return fail('Nenhuma conexão configurada ou encontrada. Informe connectionId ou config.');
    }
    oracleTracerCaptureService.clearCapture(targetConfig.id);
    return ok({ connectionId: targetConfig.id, cleared: true });
  }
);

// --- 8b. Backup & Restore de Banco ---
server.registerTool(
  'db_run_backup',
  {
    title: 'Executar backup de banco',
    description: 'Executa um backup manual (pg_dump/expdp/mysqldump ou comando customizado) de uma conexão para uma pasta de destino.',
    inputSchema: {
      connectionId: z.string().optional(),
      config: DatabaseConnectionConfigSchema.optional(),
      destinationFolder: z.string(),
      oracleDirectory: z.string().optional(),
      compress: z.boolean().optional(),
      useCustomCommand: z.boolean().optional(),
      customCommand: z.string().optional()
    }
  },
  async ({ connectionId, config, destinationFolder, oracleDirectory, compress, useCustomCommand, customCommand }) => {
    const targetConfig = resolveDbConfig(connectionId, config);
    if (!targetConfig) return fail('Nenhuma conexão configurada ou encontrada. Informe connectionId ou config.');
    if (!isSafeLocalPath(destinationFolder)) return fail('Pasta de destino inválida ou remota não permitida.');
    const result = await backupSchedulerService.runManualBackup(targetConfig, destinationFolder, {
      oracleDirectory,
      compress,
      useCustomCommand,
      customCommand
    });
    return ok(result);
  }
);

server.registerTool(
  'db_list_backups',
  {
    title: 'Listar arquivos de backup',
    description: 'Lista os arquivos de backup existentes em uma pasta de destino, mais recentes primeiro.',
    inputSchema: { destinationFolder: z.string() }
  },
  async ({ destinationFolder }) => {
    if (!isSafeLocalPath(destinationFolder)) return fail('Pasta de destino inválida ou remota não permitida.');
    const backups = await backupService.listBackups(destinationFolder);
    return ok({ backups, count: backups.length });
  }
);

server.registerTool(
  'db_restore_backup',
  {
    title: 'Restaurar backup de banco',
    description: 'Restaura um arquivo de backup existente na conexão informada. Ação destrutiva: sobrescreve os dados atuais da conexão de destino.',
    inputSchema: {
      connectionId: z.string().optional(),
      config: DatabaseConnectionConfigSchema.optional(),
      filePath: z.string()
    }
  },
  async ({ connectionId, config, filePath }) => {
    const targetConfig = resolveDbConfig(connectionId, config);
    if (!targetConfig) return fail('Nenhuma conexão configurada ou encontrada. Informe connectionId ou config.');
    if (!isSafeLocalPath(filePath)) return fail('Caminho de arquivo inválido ou remoto não permitido.');
    const result = await backupSchedulerService.runManualRestore(targetConfig, filePath);
    return ok(result);
  }
);

server.registerTool(
  'db_run_restore_drill',
  {
    title: 'Testar restauração de backup (drill)',
    description: 'Restaura um backup contra uma conexão "scratch" descartável, sem afetar a conexão de origem — usado para validar que o backup é restaurável.',
    inputSchema: {
      connectionId: z.string().optional(),
      config: DatabaseConnectionConfigSchema.optional(),
      filePath: z.string()
    }
  },
  async ({ connectionId, config, filePath }) => {
    const scratchConfig = resolveDbConfig(connectionId, config);
    if (!scratchConfig) return fail('Nenhuma conexão scratch configurada ou encontrada. Informe connectionId ou config.');
    if (!isSafeLocalPath(filePath)) return fail('Caminho de arquivo inválido ou remoto não permitido.');
    const result = await backupSchedulerService.runRestoreDrill(scratchConfig, filePath, 'manual');
    return ok(result);
  }
);

server.registerTool(
  'db_list_backup_history',
  {
    title: 'Histórico de backups/restaurações',
    description: 'Lista o histórico persistido de execuções de backup, restore e restore drill, mais recente primeiro.',
    inputSchema: { connectionId: z.string().optional() }
  },
  async ({ connectionId }) => ok(backupSchedulerService.getHistory(connectionId))
);

server.registerTool(
  'db_save_backup_config',
  {
    title: 'Salvar agendamento de backup',
    description:
      'Salva a configuração de agendamento (cron) de backup e/ou restore drill de uma conexão. Não ativa o agendamento neste processo MCP — quem executa os jobs de cron é o processo Electron/servidor Web já em execução; esta tool só grava a configuração para ele.',
    inputSchema: {
      connectionId: z.string(),
      destinationFolder: z.string(),
      cronExpression: z.string().optional(),
      enabled: z.boolean().optional(),
      retentionCount: z.number().int().positive().optional(),
      retentionDays: z.number().int().positive().optional(),
      compress: z.boolean().optional(),
      oracleDirectory: z.string().optional(),
      useCustomCommand: z.boolean().optional(),
      customCommand: z.string().optional(),
      restoreDrillCronExpression: z.string().optional(),
      restoreDrillEnabled: z.boolean().optional(),
      restoreDrillScratchConnectionId: z.string().optional()
    }
  },
  async (input) => {
    const config = input as BackupConfig;
    if (!isSafeLocalPath(config.destinationFolder)) return fail('Pasta de destino inválida ou remota não permitida.');
    if (config.cronExpression && !cron.validate(config.cronExpression)) return fail('Expressão cron inválida.');
    if (config.restoreDrillCronExpression && !cron.validate(config.restoreDrillCronExpression)) {
      return fail('Expressão cron de restore drill inválida.');
    }

    const settings = configService.getSettings();
    const existing = settings.backupConfigs || [];
    const previous = existing.find((b) => b.connectionId === config.connectionId);
    const merged: BackupConfig = { ...previous, ...config };
    const updated = [merged, ...existing.filter((b) => b.connectionId !== config.connectionId)];
    configService.saveSettings({ backupConfigs: updated });

    return ok({
      success: true,
      message:
        'Configuração gravada. O cron só é (re)agendado pelo app desktop/servidor, que é o dono do agendador: reinicie-o ou salve a configuração pela tela de Backup para ativar.'
    });
  }
);

server.registerTool(
  'backup_test_webhook',
  {
    title: 'Testar webhook de backup',
    description: 'Envia um payload de teste para um webhook de notificação de backup (Slack, Discord, Teams ou genérico).',
    inputSchema: {
      id: z.string(),
      name: z.string(),
      endpointUrl: z.string(),
      method: z.enum(['POST', 'PUT']).optional(),
      authHeader: z.string().optional(),
      authValue: z.string().optional(),
      enabled: z.boolean(),
      events: z.array(z.enum(['success', 'failure'])).optional(),
      platform: z.enum(['generic', 'slack', 'discord', 'teams']).optional()
    }
  },
  async (input) => {
    const webhook = input as BackupWebhookConfig;
    if (!isSafeUrl(webhook.endpointUrl)) return fail('URL do webhook inválida ou protocolo inseguro (apenas http/https permitidos).');
    return ok(await backupSchedulerService.testWebhook(webhook));
  }
);

// --- 9. Perfis de Deploy ---
server.registerTool(
  'deploy_list_profiles',
  {
    title: 'Listar perfis de deploy',
    description: 'Retorna todos os perfis de deploy configurados (Maven, Karaf, Docker).'
  },
  async () => {
    const settings = configService.getSettings();
    return ok({
      activeDeployProfileId: settings.activeDeployProfileId,
      deployProfiles: settings.deployProfiles || []
    });
  }
);

server.registerTool(
  'deploy_run_profile',
  {
    title: 'Executar perfil de deploy',
    description: 'Executa uma esteira de deploy configurada (Maven build, comandos Karaf, build/restart Docker).',
    inputSchema: {
      profileId: z.string().optional(),
      profile: DeployProfileSchema.optional()
    }
  },
  async ({ profileId, profile }) => {
    let targetProfile: DeployProfile | undefined = profile;
    if (!targetProfile) {
      const settings = configService.getSettings();
      const profiles = settings.deployProfiles || [];
      targetProfile = profileId
        ? profiles.find((p) => p.id === profileId || p.name.toLowerCase() === profileId.toLowerCase())
        : profiles.find((p) => p.id === settings.activeDeployProfileId) || profiles[0];
    }
    if (!targetProfile) {
      return fail('Nenhum perfil de deploy especificado ou encontrado.');
    }
    const { events, push } = collect();
    const result = await deployService.executeProfile(targetProfile, push('chunk'));
    return ok({ result, events });
  }
);

// --- 10. Rede e Métricas ---
server.registerTool(
  'network_get_ips',
  {
    title: 'Obter IPs de rede e WSL',
    description: 'Retorna a lista de interfaces de rede físicas/virtuais, o IP principal da máquina e o IP da VM WSL2.'
  },
  async () => ok(await networkService.getNetworkIps())
);

server.registerTool(
  'network_check_health',
  {
    title: 'Checar saúde de URL HTTP',
    description: 'Faz uma requisição HTTP para testar disponibilidade, status HTTP e tempo de resposta.',
    inputSchema: {
      url: z.string(),
      timeoutMs: z.number().int().positive().optional()
    }
  },
  async ({ url, timeoutMs }) => {
    if (!isSafeUrl(url)) return fail('URL inválida ou protocolo inseguro (apenas http/https permitidos).');
    return ok(await networkService.checkHttpHealth(url, timeoutMs));
  }
);

server.registerTool(
  'system_get_metrics',
  {
    title: 'Obter métricas do sistema',
    description: 'Retorna uso de CPU (%), consumo de memória RAM (MB e %) e tempo de atividade do sistema.'
  },
  async () => ok(await networkService.getSystemMetrics())
);

// --- 11. Logs (observador de arquivos) ---
// `startWatch`/`stopWatch` não são expostos aqui: são operações de streaming contínuo
// (tail -f) pensadas para um cliente WebSocket recebendo eventos ao vivo via onChunk, e uma
// chamada de tool MCP via stdio é requisição/resposta única — não há "fim" natural para
// aguardar, ao contrário do padrão collect() usado alhures neste arquivo para operações que
// de fato terminam. Em vez disso, `logs_read_last_lines` cobre o caso de uso equivalente
// para um assistente de IA: um retrato pontual das últimas linhas do arquivo, sob demanda.
server.registerTool(
  'logs_check_file',
  {
    title: 'Checar arquivo de log',
    description: 'Verifica se um arquivo de log existe, seu tamanho e data de modificação.',
    inputSchema: { filePath: z.string(), sourceId: z.string().optional() }
  },
  async ({ filePath, sourceId }) => {
    if (!isSafeLocalPath(filePath)) return fail('Caminho de arquivo inválido ou remoto não permitido.');
    return ok(logWatcherService.checkFile(filePath, sourceId));
  }
);

server.registerTool(
  'logs_read_last_lines',
  {
    title: 'Ler últimas linhas de um log',
    description: 'Lê eficientemente as últimas N linhas de um arquivo de log, sem carregar o arquivo inteiro em memória.',
    inputSchema: {
      filePath: z.string(),
      maxLines: z.number().int().positive().max(5000).optional()
    }
  },
  async ({ filePath, maxLines }) => {
    if (!isSafeLocalPath(filePath)) return fail('Caminho de arquivo inválido ou remoto não permitido.');
    const result = await logWatcherService.readLastLines(filePath, maxLines ?? 300);
    return ok(result);
  }
);

server.registerTool(
  'logs_clear_file',
  {
    title: 'Limpar arquivo de log',
    description: 'Zera (trunca) o conteúdo de um arquivo de log no disco. Ação destrutiva e irreversível.',
    inputSchema: { filePath: z.string() }
  },
  async ({ filePath }) => {
    if (!isSafeLocalPath(filePath)) return fail('Caminho de arquivo inválido ou remoto não permitido.');
    const success = await logWatcherService.clearLogFile(filePath);
    return success ? ok({ success: true }) : fail('Não foi possível limpar o arquivo (não existe ou sem permissão).');
  }
);

// --- Rotina 801: Catálogo Oficial e Instalação de Serviços Web ---
server.registerTool(
  'routine801_get_catalog',
  {
    title: 'Consultar catálogo oficial da Rotina 801',
    description: 'Lista instalações ou atualizações disponíveis de serviços web e rotinas oficiais do WinThor.',
    inputSchema: {
      type: z.enum(['instalacao', 'atualizacao']).describe('Tipo de consulta: instalacao (novos) ou atualizacao (pendentes)'),
      serverUrl: z.string().optional().describe('URL alternativa do servidor (ex: http://localhost:8889)')
    }
  },
  async ({ type, serverUrl }) => {
    try {
      const data = type === 'instalacao'
        ? await routine801Service.fetchInstallations(serverUrl)
        : await routine801Service.fetchUpdates(serverUrl);
      return ok(data);
    } catch (err: any) {
      return fail(err?.message || 'Falha ao consultar catálogo da Rotina 801.');
    }
  }
);

server.registerTool(
  'routine801_check_health',
  {
    title: 'Verificar status da Rotina 801',
    description: 'Testa a conectividade com o serviço HTTP da Rotina 801 no Karaf.',
    inputSchema: {
      serverUrl: z.string().optional().describe('URL do servidor a testar (padrão: http://localhost:8889)')
    }
  },
  async ({ serverUrl }) => {
    const result = await routine801Service.checkServerHealth(serverUrl);
    return ok(result);
  }
);

server.registerTool(
  'routine801_install_features',
  {
    title: 'Instalar features da Rotina 801',
    description: 'Instala uma ou mais funcionalidades oficiais selecionadas no container Apache Karaf com resolução de dependências, ou apenas registra repositórios Maven.',
    inputSchema: {
      funcionalidades: z.array(
        z.object({
          nome: z.string(),
          versao: z.string(),
          codigoRotina: z.number().optional(),
          codigoModulo: z.number().optional(),
          tipoProjeto: z.string().optional(),
          descricao: z.string().optional(),
          status: z.string().optional(),
          featureMavenUrl: z.string().optional()
        })
      ),
      action: z.enum(['install', 'repo_add_only']).optional().describe('Ação a executar: install (adicionar repo e instalar) ou repo_add_only (apenas feature:repo-add)'),
      targetVersionOverride: z.string().optional().describe('Forçar uma versão específica para todos os pacotes selecionados (ex: "1.38.0.2")'),
      executeVia: z.enum(['karaf_cli', 'api']).optional().describe('Método de execução: karaf_cli (padrão) ou api'),
      serverUrl: z.string().optional()
    }
  },
  async ({ funcionalidades, action, targetVersionOverride, executeVia, serverUrl }) => {
    try {
      const chunks: string[] = [];
      const result = await routine801Service.installFeatures(
        {
          funcionalidades: funcionalidades.map((f) => ({
            ...f,
            codigoRotina: f.codigoRotina || 0,
            codigoModulo: f.codigoModulo || 0,
            tipoProjeto: f.tipoProjeto || 'SERVICO',
            descricao: f.descricao || f.nome,
            status: f.status || 'LIBERADO'
          })),
          action: action || 'install',
          targetVersionOverride,
          executeVia: executeVia || 'karaf_cli',
          serverUrl
        },
        (chunk) => chunks.push(chunk)
      );
      return ok({ ...result, collectedLogs: chunks.join('') });
    } catch (err: any) {
      return fail(err?.message || 'Falha na instalação das features da Rotina 801.');
    }
  }
);

// ==========================================
// Tools de APM & Observabilidade (OpenTelemetry / SigNoz)
// ==========================================

// Buffer vazio no app é diferente de "sem tráfego": o motivo mais comum é o Karaf sem o agente
const APM_NO_TRACES_NOTICE =
  'Nenhum trace recebido ainda. Para o Karaf iniciado pelo Hub Manager, coloque opentelemetry-javaagent.jar ' +
  'em <karaf>/bin e reinicie o Karaf; outras aplicações devem exportar OTLP/HTTP para a porta do receptor.';

function withNoTracesNotice<T extends object>(data: T, isEmpty: boolean): T & { notice?: string } {
  return isEmpty ? { ...data, notice: APM_NO_TRACES_NOTICE } : data;
}

const apmLastMinutesSchema = z
  .number()
  .int()
  .positive()
  .max(24 * 60)
  .optional()
  .describe('Considerar apenas traces iniciados nos últimos N minutos');

server.registerTool(
  'apm_get_overview',
  {
    title: 'Métricas consolidadas de APM',
    description:
      'Retorna métricas consolidadas de observabilidade e APM (throughput RPS, taxa de erro, latências p50/p95/p99, % do tempo gasto em banco, top endpoints, queries lentas e status do receptor OTLP).',
    inputSchema: {
      serviceName: z.string().optional().describe('Filtrar métricas para um serviço específico'),
      lastMinutes: apmLastMinutesSchema
    }
  },
  async ({ serviceName, lastMinutes }) => {
    try {
      const overview = await apmClient.getOverview({
        serviceName,
        startTimeMs: lastMinutes ? Date.now() - lastMinutes * 60_000 : undefined
      });
      return ok(withNoTracesNotice(overview, overview.receiverStatus.bufferSize === 0));
    } catch (err: any) {
      return fail(err?.message || 'Falha ao obter overview de APM.');
    }
  }
);

server.registerTool(
  'apm_get_traces',
  {
    title: 'Buscar traces do APM',
    description:
      'Busca e filtra requisições/traces recentes coletados pelo APM (filtro por serviço, busca por rota, apenas erros, apenas com SQL, latência mínima e janela de tempo).',
    inputSchema: {
      serviceName: z.string().optional().describe('Nome do serviço (ex: karaf-winthor)'),
      search: z.string().optional().describe('Termo de busca na rota, nome do span ou traceId'),
      hasError: z.boolean().optional().describe('Filtrar apenas traces com falha/erro HTTP'),
      hasDatabaseQuery: z.boolean().optional().describe('Filtrar apenas traces que executaram SQL'),
      minDurationMs: z.number().optional().describe('Latência mínima em milissegundos para encontrar gargalos'),
      lastMinutes: apmLastMinutesSchema,
      limit: z.number().int().positive().max(500).optional().describe('Quantidade máxima de traces a retornar (padrão: 50)'),
      sortBy: z.enum(['time', 'duration']).optional().describe('Ordenar por mais recente (time, padrão) ou mais lento primeiro (duration)'),
      slowOnly: z.boolean().optional().describe('Filtrar apenas chamadas e queries lentas')
    }
  },
  async ({ lastMinutes, limit, ...filter }) => {
    try {
      const traces = await apmClient.getTraces({
        ...filter,
        startTimeMs: lastMinutes ? Date.now() - lastMinutes * 60_000 : undefined,
        limit: limit || 50
      });
      const bufferIsEmpty = traces.length === 0 && (await apmClient.getReceiverStatus()).bufferSize === 0;
      return ok(withNoTracesNotice({ count: traces.length, traces }, bufferIsEmpty));
    } catch (err: any) {
      return fail(err?.message || 'Falha ao listar traces.');
    }
  }
);

server.registerTool(
  'apm_get_trace_details',
  {
    title: 'Detalhar trace do APM',
    description:
      'Inspeciona um trace pelo ID: spans na ordem do waterfall (com profundidade e offset), atributos HTTP, queries SQL, exceções com stacktrace e a decomposição do tempo entre banco, chamadas externas e aplicação.',
    inputSchema: {
      traceId: z.string().describe('ID do trace a inspecionar')
    }
  },
  async ({ traceId }) => {
    try {
      const details = await apmClient.getTraceDetails(traceId);
      if (!details) {
        return fail(`Trace com ID "${traceId}" não encontrado no buffer do app (pode ter sido descartado pelo limite do buffer).`);
      }
      return ok(buildCompactTraceDetails(details));
    } catch (err: any) {
      return fail(err?.message || 'Falha ao obter detalhes do trace.');
    }
  }
);

server.registerTool(
  'apm_get_services',
  {
    title: 'Listar serviços monitorados pelo APM',
    description: 'Lista todos os serviços monitorados pelo APM com métricas de requisições, erros e latências agregadas.',
    inputSchema: {}
  },
  async () => {
    try {
      const services = await apmClient.getServices();
      return ok(withNoTracesNotice({ count: services.length, services }, services.length === 0));
    } catch (err: any) {
      return fail(err?.message || 'Falha ao listar serviços monitorados.');
    }
  }
);

server.registerTool(
  'apm_get_receiver_status',
  {
    title: 'Status do receptor OTLP do APM',
    description:
      'Informa se o receptor OpenTelemetry do app está ativo, em qual porta, quantos spans/traces recebeu, o uso do buffer e quantos spans foram descartados por limite.',
    inputSchema: {}
  },
  async () => {
    try {
      return ok(await apmClient.getReceiverStatus());
    } catch (err: any) {
      return fail(err?.message || 'Falha ao consultar o status do receptor APM.');
    }
  }
);

// --- QA Studio & Validador Regressivo ---
server.registerTool(
  'qa_list_templates',
  {
    title: 'Listar templates de testes regressivos (QA)',
    description:
      'Lista todos os cenários/templates de validação regressiva cadastrados (ex.: Venda PDV, Cancelamento, Kits e Cestas), com quantidade de passos e variáveis esperadas.',
    inputSchema: {}
  },
  async () => {
    try {
      const templates = await qaRegressionService.listTemplates();
      return ok({
        count: templates.length,
        templates: templates.map((t) => ({
          id: t.id,
          name: t.name,
          category: t.category,
          description: t.description,
          stepsCount: t.steps.length,
          defaultVariables: t.defaultVariables
        }))
      });
    } catch (err: any) {
      return fail(err?.message || 'Falha ao listar templates de regressivo.');
    }
  }
);

server.registerTool(
  'qa_get_template',
  {
    title: 'Obter template de teste regressivo por ID',
    description: 'Retorna a estrutura completa de um template de teste regressivo, incluindo todas as queries e asserções.',
    inputSchema: {
      templateId: z.string().describe('ID do template (ex: "wsh-venda-pdv-completa", "wsh-cancelamento-venda")')
    }
  },
  async (args) => {
    try {
      const tmpl = await qaRegressionService.getTemplate(args.templateId);
      if (!tmpl) return fail(`Template com ID "${args.templateId}" não encontrado.`);
      return ok(tmpl);
    } catch (err: any) {
      return fail(err?.message || 'Falha ao obter template.');
    }
  }
);

const QaAssertionExpectedTypeSchema = z
  .enum(['jsonPath', 'literal', 'notNull', 'null', 'zero', 'regex'])
  .describe('Tipo de asserção: jsonPath ($.foo), literal (valor fixo), notNull (<S>), null (<N>), zero (<0>), regex');

const QaAssertionInputSchema = z.object({
  id: z.string().optional().describe('ID opcional da asserção'),
  column: z.string().describe('Nome da coluna do resultado SQL a validar (ex: "CODFILIAL", "VLTOTAL")'),
  expectedType: QaAssertionExpectedTypeSchema,
  expectedValue: z.string().optional().describe('Valor esperado (obrigatório se literal, regex ou jsonPath)'),
  description: z.string().optional().describe('Descrição explicativa da regra validada'),
  rowIndex: z.number().int().optional().describe('Linha a validar (0 para a primeira, -1 para todas as linhas)')
});

const QaVariableExtractInputSchema = z.object({
  variableName: z.string().describe('Nome da variável a salvar para os próximos passos (ex: "numCupom")'),
  column: z.string().describe('Nome da coluna SQL de onde extrair o valor'),
  rowIndex: z.number().int().optional().describe('Linha da qual extrair o valor (padrão: 0)')
});

const QaStepInputSchema = z.object({
  id: z.string().optional().describe('ID opcional do passo'),
  title: z.string().describe('Título legível do passo (ex: "Validação de Registro de Saída PCNFSAID")'),
  tableName: z.string().optional().describe('Nome principal da tabela WinThor consultada (ex: "PCNFSAID")'),
  description: z.string().optional().describe('Descrição do propósito deste passo'),
  enabled: z.boolean().optional().default(true).describe('Se o passo está ativo para execução'),
  query: z.string().describe('Consulta SQL (suporta binds como :codFilial, :numCupom)'),
  assertions: z.array(QaAssertionInputSchema).describe('Lista de asserções a serem testadas contra as colunas retornadas'),
  extractVariables: z.array(QaVariableExtractInputSchema).optional().describe('Variáveis extraídas desta query para os próximos passos')
});

const QaTemplateInputSchema = z.object({
  id: z.string().optional().describe('ID único do template (slug em minúsculas, ex: "wsh-validacao-devolucao"). Se omitido, é gerado automaticamente.'),
  name: z.string().describe('Nome claro do template de validação (ex: "Validação de Devolução de Cupom Fiscal")'),
  description: z.string().optional().describe('Descrição do fluxo testado e regras de negócio'),
  category: z.string().optional().describe('Categoria do teste (ex: "Vendas", "Fiscal", "Estoque", "Geral")'),
  author: z.string().optional().describe('Autor ou time responsável (ex: "QA", "IA", nome do analista)'),
  version: z.string().optional().describe('Versão do template (ex: "1.0.0")'),
  defaultVariables: z.record(z.string(), z.any()).optional().describe('Valores padrão para binds de SQL (ex: { codFilial: "1", numCupom: "4387" })'),
  sampleJson: z.string().optional().describe('Payload JSON de exemplo para referência dos testes'),
  steps: z.array(QaStepInputSchema).describe('Lista de passos com queries SQL e asserções')
});

server.registerTool(
  'qa_save_template',
  {
    title: 'Criar ou atualizar template de teste regressivo (QA)',
    description:
      'Cria ou atualiza um template de teste regressivo no catálogo local do Hub Manager, persistindo queries SQL, variáveis e regras de asserção.',
    inputSchema: {
      id: z.string().optional().describe('ID único do template (slug em minúsculas, ex: "wsh-validacao-devolucao"). Se omitido, é gerado automaticamente.'),
      name: z.string().describe('Nome claro do template de validação (ex: "Validação de Devolução de Cupom Fiscal")'),
      description: z.string().optional().describe('Descrição do fluxo testado e regras de negócio'),
      category: z.string().optional().describe('Categoria do teste (ex: "Vendas", "Fiscal", "Estoque", "Geral")'),
      author: z.string().optional().describe('Autor ou time responsável (ex: "QA", "IA", nome do analista)'),
      version: z.string().optional().describe('Versão do template (ex: "1.0.0")'),
      defaultVariables: z.record(z.string(), z.any()).optional().describe('Valores padrão para binds de SQL (ex: { codFilial: "1", numCupom: "4387" })'),
      sampleJson: z.string().optional().describe('Payload JSON de exemplo para referência dos testes'),
      steps: z.array(QaStepInputSchema).describe('Lista de passos com queries SQL e asserções')
    }
  },
  async (args) => {
    try {
      const templateId = args.id || `template-${Date.now()}`;
      const now = new Date().toISOString();
      const saved = await qaRegressionService.saveTemplate({
        id: templateId,
        name: args.name,
        description: args.description,
        category: args.category || 'Geral',
        author: args.author || 'IA',
        version: args.version || '1.0.0',
        createdAt: now,
        updatedAt: now,
        defaultVariables: args.defaultVariables,
        sampleJson: args.sampleJson,
        steps: args.steps.map((step, idx) => ({
          id: step.id || `step-${idx + 1}-${Date.now()}`,
          title: step.title,
          tableName: step.tableName,
          description: step.description,
          enabled: step.enabled !== false,
          query: step.query,
          assertions: step.assertions.map((ass, aIdx) => ({
            id: ass.id || `ass-${aIdx + 1}-${Date.now()}`,
            column: ass.column,
            expectedType: ass.expectedType,
            expectedValue: ass.expectedValue,
            description: ass.description,
            rowIndex: ass.rowIndex
          })),
          extractVariables: step.extractVariables
        }))
      });
      return ok({
        success: true,
        message: `Template "${saved.name}" (${saved.id}) salvo com sucesso no catálogo.`,
        template: saved
      });
    } catch (err: any) {
      return fail(err?.message || 'Falha ao salvar template de teste regressivo.');
    }
  }
);

server.registerTool(
  'qa_delete_template',
  {
    title: 'Excluir template de teste regressivo (QA)',
    description: 'Remove um template de teste regressivo do catálogo local a partir do seu ID.',
    inputSchema: {
      templateId: z.string().describe('ID do template a ser removido (ex: "wsh-venda-pdv-completa")')
    }
  },
  async ({ templateId }) => {
    try {
      const deleted = await qaRegressionService.deleteTemplate(templateId);
      if (!deleted) {
        return fail(`Template com ID "${templateId}" não foi encontrado para exclusão.`);
      }
      return ok({
        success: true,
        message: `Template "${templateId}" excluído com sucesso.`
      });
    } catch (err: any) {
      return fail(err?.message || 'Falha ao excluir template.');
    }
  }
);

server.registerTool(
  'qa_run_regression_suite',
  {
    title: 'Executar bateria de testes regressivos (QA Suite)',
    description:
      'Executa a esteira de consultas SQL e asserções no banco Oracle contra valores de payload JSON ou literais, validando a integridade das tabelas do WinThor. Suporta templateId ou template inline, e leitura de payload via rawJson ou jsonFilePath.',
    inputSchema: {
      templateId: z.string().optional().describe('ID do template de regressivo cadastrado a executar (ex: "wsh-venda-pdv-completa")'),
      template: QaTemplateInputSchema.optional().describe('Definição de template inline para execução ad-hoc sem persistir no catálogo'),
      connectionId: z.string().optional().describe('ID da conexão de banco Oracle configurada no Hub Manager. Se omitido, usa a primeira ativa.'),
      rawJson: z.string().optional().describe('Payload JSON da API/PDV em texto para mapeamento de variáveis via JSONPath ($.foo)'),
      jsonFilePath: z.string().optional().describe('Caminho absoluto ou relativo do arquivo JSON local contendo o payload/dados de teste'),
      variables: z.record(z.string(), z.any()).optional().describe('Variáveis manuais para bind (ex: { codFilial: "1", numCupom: "4387" })'),
      issueKey: z.string().optional().describe('Chave da issue/tarefa no Jira (ex: "PROJ-123") para carimbar na evidência')
    }
  },
  async (args) => {
    try {
      if (!args.templateId && !args.template) {
        return fail('É necessário informar "templateId" (ID de template existente) ou "template" (definição inline).');
      }

      let payloadJson = args.rawJson;
      if (args.jsonFilePath) {
        if (!isSafeLocalPath(args.jsonFilePath)) {
          return fail(`Caminho de arquivo local não seguro ou inválido: "${args.jsonFilePath}".`);
        }
        if (!fs.existsSync(args.jsonFilePath)) {
          return fail(`Arquivo de dados/payload não encontrado no caminho: "${args.jsonFilePath}".`);
        }
        try {
          payloadJson = fs.readFileSync(args.jsonFilePath, 'utf-8');
        } catch (readErr: any) {
          return fail(`Falha ao ler arquivo de payload "${args.jsonFilePath}": ${readErr?.message || readErr}`);
        }
      }

      const result = await qaRegressionService.executeSuite({
        templateId: args.templateId,
        template: args.template as any,
        connectionId: args.connectionId,
        rawJson: payloadJson,
        variables: args.variables
      });

      const markdownEvidence = generateMarkdownEvidence(result, {
        issueKey: args.issueKey,
        includeSql: true
      });

      return ok({
        success: result.success,
        summary: {
          templateName: result.templateName,
          totalAssertions: result.totalAssertions,
          passed: result.passedAssertions,
          failed: result.failedAssertions,
          warnings: result.warningAssertions,
          durationMs: result.durationMs
        },
        markdownEvidence,
        stepResults: result.stepResults.map((s) => ({
          stepTitle: s.stepTitle,
          tableName: s.tableName,
          rowCount: s.rowCount,
          success: s.success,
          error: s.error,
          assertions: s.assertions
        }))
      });
    } catch (err: any) {
      return fail(err?.message || 'Falha ao executar suite de validação regressiva.');
    }
  }
);

server.registerTool(
  'qa_fetch_incoming_payload',
  {
    title: 'Obter payload JSON da integração (PCINTEGRACAOCORE)',
    description:
      'Localiza e recupera o payload JSON original gravado na tabela PCINTEGRACAOCORE (coluna DADOSTRANSFORMADOS) do banco Oracle. Permite buscar por CPF/CNPJ do consumidor (cgcEnt), número de cupom/venda, chave NFC-e/NF-e, ID externo ou listar transações recentes.',
    inputSchema: {
      mode: z.enum(['cupom', 'cgcEnt', 'chave', 'idExterno', 'recent']).describe('Modo de busca do payload'),
      cgcEnt: z.string().optional().describe('CPF ou CNPJ do consumidor gravado em consumidorFinal.cgcEnt (ex: "68886626088")'),
      numCupom: z.string().optional().describe('Número do cupom fiscal / venda (ex: "271454")'),
      codFilial: z.string().optional().describe('Código da filial da venda (ex: "1")'),
      chaveNfe: z.string().optional().describe('Chave de 44 dígitos da NFC-e ou NF-e'),
      idExterno: z.string().optional().describe('ID externo ou interno da transação (ex: "pdvsync-vendamensagem-...")'),
      connectionId: z.string().optional().describe('ID da conexão Oracle. Se omitido, utiliza a primeira conexão ativa.'),
      limit: z.number().optional().describe('Limite máximo de registros a retornar (padrão: 10)')
    }
  },
  async (args) => {
    try {
      const result = await qaPayloadService.searchPayloads(
        {
          mode: args.mode,
          cgcEnt: args.cgcEnt,
          numCupom: args.numCupom,
          codFilial: args.codFilial,
          chaveNfe: args.chaveNfe,
          idExterno: args.idExterno,
          limit: args.limit
        },
        args.connectionId
      );

      if (!result.success) {
        return fail(result.error || 'Falha ao buscar payloads na tabela PCINTEGRACAOCORE.');
      }

      return ok({
        totalFound: result.totalFound,
        items: result.items.map((item) => ({
          id: item.id,
          numCupom: item.numCupom,
          codFilial: item.codFilial,
          cgcEnt: item.cgcEnt,
          cliente: item.cliente,
          pdvOrigem: item.pdvOrigem,
          chaveNfe: item.chaveNfe,
          vlTotal: item.vlTotal,
          data: item.data,
          rawJsonExcerpt: item.rawJson.slice(0, 1000),
          rawJson: item.rawJson
        }))
      });
    } catch (err: any) {
      return fail(err?.message || 'Falha ao executar busca de payload.');
    }
  }
);

server.registerTool(
  'qa_fetch_api_payload',
  {
    title: 'Obter payload JSON via API REST externa',
    description:
      'Dispara uma requisição HTTP (GET ou POST) a um serviço de mensageria, API gateway ou endpoint externo e extrai o payload JSON de entrada para alimentar o validador regressivo. Suporta cabeçalhos customizados (tokens, Bearer) e JSONPath para navegar até o objeto desejado (ex: "data.pedido").',
    inputSchema: {
      url: z.string().describe('URL completa do endpoint HTTP/HTTPS (ex: "http://localhost:8080/api/v1/pedidos/12345")'),
      method: z.enum(['GET', 'POST']).optional().describe('Método HTTP da requisição (padrão: GET)'),
      headers: z.record(z.string(), z.string()).optional().describe('Cabeçalhos HTTP (ex: { "Authorization": "Bearer ...", "x-api-key": "..." })'),
      body: z.string().optional().describe('Corpo da requisição em formato string/JSON (apenas para método POST)'),
      jsonPath: z.string().optional().describe('Caminho no JSON para extrair um objeto interno (ex: "data.payload", "response.items[0]")'),
      timeoutMs: z.number().optional().describe('Tempo limite da requisição em milissegundos (padrão: 15000)')
    }
  },
  async (args) => {
    try {
      const result = await qaPayloadService.fetchPayloadFromApi({
        url: args.url,
        method: args.method,
        headers: args.headers,
        body: args.body,
        jsonPath: args.jsonPath,
        timeoutMs: args.timeoutMs
      });

      if (!result.success) {
        return fail(result.error || 'Falha ao buscar payload na API externa.');
      }

      return ok({
        statusCode: result.statusCode,
        durationMs: result.durationMs,
        data: result.data,
        extractedJson: result.extractedJson,
        rawJson: result.rawJson
      });
    } catch (err: any) {
      return fail(err?.message || 'Erro inesperado ao consultar API externa.');
    }
  }
);

// --- Ferramentas MCP: Runner de Testes Automatizados ---
server.registerTool(
  'test_runner_list',
  {
    title: 'Listar runners de testes automatizados',
    description: 'Lista todos os runners de testes automatizados configurados (Maven, Playwright, Cypress, Newman, Custom).',
    inputSchema: {}
  },
  async () => {
    try {
      const runners = testRunnerService.getRunners();
      return ok({ runners });
    } catch (err: any) {
      return fail(err?.message || 'Falha ao listar test runners.');
    }
  }
);

server.registerTool(
  'test_runner_execute',
  {
    title: 'Executar runner de testes automatizados',
    description: 'Dispara a execução de um test runner configurado (ou inline) coletando saída, métricas de aprovação/falha e duração.',
    inputSchema: {
      runnerId: z.string().optional().describe('ID do runner configurado a executar'),
      name: z.string().optional().describe('Nome do teste caso executado de forma pontual'),
      type: z.enum(['maven', 'playwright', 'cypress', 'newman', 'custom']).optional().describe('Tipo do runner'),
      workingDir: z.string().optional().describe('Diretório de trabalho do teste'),
      customCommand: z.string().optional().describe('Comando executável customizado quando o tipo for custom (ex: pytest, dotnet test)'),
      commandArgs: z.string().optional().describe('Argumentos ou flags adicionais (ex: "test", "verify", "--grep @smoke")')
    }
  },
  async (args) => {
    try {
      const target = args.runnerId || {
        id: `runner-mcp-${Date.now()}`,
        name: args.name || 'Execução MCP',
        type: args.type || 'maven',
        workingDir: args.workingDir,
        customCommand: args.customCommand,
        commandArgs: args.commandArgs
      };
      const result = await testRunnerService.executeRunner(target as any);
      return ok({
        status: result.status,
        exitCode: result.exitCode,
        totalTests: result.totalTests,
        passed: result.passedCount,
        failed: result.failedCount,
        skipped: result.skippedCount,
        durationMs: result.durationMs,
        summaryMessage: result.summaryMessage,
        outputExcerpt: result.output.slice(-2000)
      });
    } catch (err: any) {
      return fail(err?.message || 'Falha ao executar runner de testes.');
    }
  }
);

server.registerTool(
  'test_runner_history',
  {
    title: 'Histórico de execuções de testes automatizados',
    description: 'Retorna o histórico das últimas execuções de testes automatizados com métricas e status.',
    inputSchema: {
      limit: z.number().optional().describe('Quantidade máxima de execuções a retornar (padrão: 20)')
    }
  },
  async (args) => {
    try {
      const history = testRunnerService.getHistory();
      const limit = Math.min(Math.max(1, args.limit || 20), 100);
      return ok({ history: history.slice(0, limit) });
    } catch (err: any) {
      return fail(err?.message || 'Falha ao consultar histórico de testes.');
    }
  }
);

// --- Ferramentas MCP: TAUT (Cypress) (Cypress / QA Hub) ---
server.registerTool(
  'taut_get_status',
  {
    title: 'Obter status do projeto TAUT (Cypress)',
    description:
      'Retorna o status de integridade do projeto de testes Cypress TAUT (Cypress), incluindo existência do diretório, versão do Cypress, status do arquivo .env e credenciais configuradas.',
    inputSchema: {
      customPath: z.string().optional().describe('Caminho customizado do projeto TAUT (Cypress) (se omitido, usa a auto-detecção ou configuração salva).')
    }
  },
  async (args) => {
    try {
      const status = await tautAutomationService.getProjectStatus(args.customPath);
      return ok(status);
    } catch (err: any) {
      return fail(err?.message || 'Falha ao obter status do projeto TAUT (Cypress).');
    }
  }
);

server.registerTool(
  'taut_run_tests',
  {
    title: 'Executar testes Cypress no TAUT (Cypress)',
    description:
      'Dispara a execução de testes automatizados Cypress no projeto TAUT (Cypress), com suporte a filtros de tags (@cypress/grep), especificação de arquivos spec e modo de API (v39/legacy). Retorna sumário de aprovados/falhas e extrato de saída.',
    inputSchema: {
      tags: z.string().optional().describe('Tags para filtragem com grepTags (ex: "critico", "winthor-pedido-venda", "esteira", "regressao", "-develop")'),
      spec: z.string().optional().describe('Caminho ou padrão glob dos testes spec (ex: "cypress/e2e/api/Pedido/**/*")'),
      apiUrlMode: z.enum(['v39', 'legacy']).optional().describe('Modo de URL da API (padrão: "v39")'),
      projectPath: z.string().optional().describe('Caminho opcional do projeto TAUT (Cypress)')
    }
  },
  async (args) => {
    try {
      const result = await tautAutomationService.runTests({
        tags: args.tags,
        spec: args.spec,
        apiUrlMode: args.apiUrlMode,
        projectPath: args.projectPath
      });
      return ok({
        status: result.status,
        exitCode: result.exitCode,
        totalTests: result.totalTests,
        passed: result.passedCount,
        failed: result.failedCount,
        skipped: result.skippedCount,
        durationMs: result.durationMs,
        summaryMessage: result.summaryMessage,
        outputExcerpt: result.output.slice(-2500)
      });
    } catch (err: any) {
      return fail(err?.message || 'Falha ao executar testes Cypress do TAUT (Cypress).');
    }
  }
);

server.registerTool(
  'taut_get_coverage',
  {
    title: 'Consultar cobertura de testes Zephyr do TAUT (Cypress)',
    description:
      'Cruza os cenários mapeados nos arquivos CSV da pasta Insumo/ com os testes implementados em cypress/e2e/api, calculando o percentual de cobertura e listando cenários pendentes e automatizados.',
    inputSchema: {
      customPath: z.string().optional().describe('Caminho opcional do projeto TAUT (Cypress)')
    }
  },
  async (args) => {
    try {
      const coverage = await tautAutomationService.getCoverage(args.customPath);
      return ok({
        totalScenarios: coverage.totalScenarios,
        automatedCount: coverage.automatedCount,
        pendingCount: coverage.pendingCount,
        coveragePercentage: `${coverage.coveragePercentage}%`,
        generatedAt: coverage.generatedAt,
        pendingScenarios: coverage.items.filter((i) => i.status === 'pending').map((i) => i.key),
        sampleAutomated: coverage.items.filter((i) => i.status === 'automated').slice(0, 10)
      });
    } catch (err: any) {
      return fail(err?.message || 'Falha ao analisar cobertura de testes do TAUT.');
    }
  }
);

server.registerTool(
  'taut_list_specs',
  {
    title: 'Listar specs e arquivos de teste do TAUT (Cypress)',
    description:
      'Varre a pasta cypress/e2e/ do projeto TAUT e lista todos os arquivos .cy.ts, agrupados por módulo (Pedido, Venda, Tributação, etc.), com contagem de testes, tags associadas e chaves do Zephyr.',
    inputSchema: {
      customPath: z.string().optional().describe('Caminho opcional do projeto TAUT (Cypress)')
    }
  },
  async (args) => {
    try {
      const specs = await tautAutomationService.listSpecs(args.customPath);
      return ok({
        totalFiles: specs.length,
        specs
      });
    } catch (err: any) {
      return fail(err?.message || 'Falha ao listar specs do TAUT.');
    }
  }
);

server.registerTool(
  'taut_sync_env',
  {
    title: 'Sincronizar .env do TAUT (Cypress) com o Hub Manager',
    description:
      'Gera ou atualiza automaticamente o arquivo .env do TAUT (Cypress) utilizando os dados da conexão Oracle ativa no Hub Manager (ORACLE_USER, ORACLE_PASSWORD, ORACLE_CONNECT_STRING) e URLs do WTA.',
    inputSchema: {
      customPath: z.string().optional().describe('Caminho opcional do projeto TAUT (Cypress)'),
      connectionId: z.string().optional().describe('ID da conexão Oracle salva no Hub Manager. Se omitido, usa a primeira conexão Oracle ativa.')
    }
  },
  async (args) => {
    try {
      const result = await tautAutomationService.syncEnvFromDevManager(args.customPath, args.connectionId);
      return ok(result);
    } catch (err: any) {
      return fail(err?.message || 'Falha ao sincronizar .env do TAUT.');
    }
  }
);

server.registerTool(
  'taut_process_csv_intake',
  {
    title: 'Processar CSV do Zephyr para Intake de Automação (Orquestrador de IA)',
    description:
      'Lê um arquivo CSV de cenários exportado do Zephyr Scale na pasta Insumo/, valida as 11 regras arquiteturais do Orquestrador de Intake (Agents.md) e gera o bloco estruturado de intake e o plano de implementação pronto.',
    inputSchema: {
      csvFile: z.string().describe('Nome ou caminho do arquivo CSV (ex: "Insumo/pedido.csv" ou "pedido")'),
      projectPath: z.string().optional().describe('Caminho opcional do projeto TAUT (Cypress)')
    }
  },
  async (args) => {
    try {
      const intake = await tautAutomationService.processCsvIntake(args.csvFile, args.projectPath);
      return ok(intake);
    } catch (err: any) {
      return fail(err?.message || 'Falha ao processar CSV de intake do TAUT.');
    }
  }
);

// --- Inicialização ---
async function main() {
  await server.connect(new StdioServerTransport());
  console.error('[Hub Manager MCP] Servidor conectado via stdio.');
}

main().catch((err) => {
  console.error('[Hub Manager MCP] Falha ao iniciar servidor:', err);
  process.exit(1);
});
