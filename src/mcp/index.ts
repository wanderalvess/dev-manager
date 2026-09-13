import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import os from 'os';
import path from 'path';
import { ConfigService } from '../main/services/ConfigService';
import { KarafService } from '../main/services/KarafService';
import { WindowsService } from '../main/services/WindowsService';
import { GitAzureService } from '../main/services/GitAzureService';
import { RoutinesService } from '../main/services/RoutinesService';
import { DocsIndexService } from '../main/services/DocsIndexService';
import { DockerService } from '../main/services/DockerService';
import { DatabaseService } from '../main/services/DatabaseService';
import { NetworkService } from '../main/services/NetworkService';
import { DeployService } from '../main/services/DeployService';
import { KarafLogPersistenceService } from '../main/services/KarafLogPersistenceService';
import { isValidIdentifier, isSafeLocalPath, isSafeKarafCommand, isSafeUrl } from '../main/utils/security';
import type { AppSettings, DatabaseConnectionConfig, DeployProfile } from '../shared/types';

// --- Composição dos serviços (mesma ordem usada em src/server/index.ts e src/main/index.ts) ---
const configService = new ConfigService();
const karafService = new KarafService(configService);
const databaseService = new DatabaseService();
const networkService = new NetworkService();
const windowsService = new WindowsService(configService, karafService, databaseService, networkService);
const gitAzureService = new GitAzureService(configService, karafService);
const routinesService = new RoutinesService(configService);
const docsIndexService = new DocsIndexService(configService, gitAzureService);
const dockerService = new DockerService();
const deployService = new DeployService(configService, karafService, dockerService, windowsService);
const karafLogPersistenceService = new KarafLogPersistenceService();

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

const SETTINGS_PATH_KEYS = ['appPath', 'karafPath', 'intellijPath', 'projectsPath'] as const;

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
  ssl: z.boolean().optional(),
  isDefault: z.boolean().optional()
});

const DeployStepTypeSchema = z.enum([
  'maven-build',
  'karaf-command',
  'docker-build',
  'docker-push',
  'docker-restart',
  'command'
]);

const DeployStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: DeployStepTypeSchema,
  enabled: z.boolean(),
  projectPath: z.string().optional(),
  skipTests: z.boolean().optional(),
  command: z.string().optional(),
  cwd: z.string().optional(),
  dockerContextPath: z.string().optional(),
  dockerFile: z.string().optional(),
  dockerImageTag: z.string().optional(),
  dockerContainer: z.string().optional()
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

const server = new McpServer({ name: 'dev-manager', version: '1.0.0' });

// --- 1. Sistema ---
server.registerTool(
  'system_get_info',
  { title: 'Info do sistema', description: 'Informações de SO, runtime Node e status de administrador.' },
  async () => {
    const isAdmin = await windowsService.checkAdminPrivileges();
    const configPath = configService.getConfigFilePath();
    return ok({
      appName: 'Dev Manager (MCP)',
      appVersion: '1.0.0',
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
    const result = await karafService.deploy(request, push('chunk'));
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
    const result = await karafService.buildAndDeployMaven(request, projectPath, skipTests !== false, push('chunk'));
    return ok({ result, events });
  }
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
    ok(await karafService.updateBundleVersion({ bundleId, newVersionOrLocation }, credentials))
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
  { title: 'Listar repositórios', description: 'Lista os repositórios Git encontrados na pasta de projetos configurada.' },
  async () => ok(await gitAzureService.listProjects())
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
    inputSchema: { projectPath: z.string(), branchName: z.string(), createNew: z.boolean().optional() }
  },
  async ({ projectPath, branchName, createNew }) => {
    if (!isSafeLocalPath(projectPath)) return fail('Caminho de projeto inválido.');
    return ok(await gitAzureService.checkoutBranch(projectPath, branchName, createNew ?? false));
  }
);

// --- 5. Rotinas ---
server.registerTool(
  'routines_list',
  { title: 'Listar rotinas', description: 'Lista as rotinas (.EXE/.PC) descobertas no catálogo.' },
  async () => ok(routinesService.listRoutines())
);

server.registerTool(
  'routines_launch',
  {
    title: 'Executar rotina',
    description: 'Executa uma rotina do catálogo pelo caminho completo do arquivo.',
    inputSchema: { fullPath: z.string() }
  },
  async ({ fullPath }) => {
    if (!isSafeLocalPath(fullPath)) return fail('Caminho inválido.');
    return ok({ success: routinesService.launchRoutine(fullPath) });
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

// --- 7. Configurações ---
server.registerTool(
  'settings_get',
  { title: 'Ler configurações', description: 'Retorna as configurações atuais do Dev Manager.' },
  async () => ok(configService.getSettings())
);

server.registerTool(
  'settings_save',
  {
    title: 'Salvar configurações',
    description: 'Persiste um conjunto parcial de configurações do Dev Manager.',
    inputSchema: { settings: z.record(z.string(), z.unknown()) }
  },
  async ({ settings }) => {
    for (const key of SETTINGS_PATH_KEYS) {
      const value = settings[key];
      if (typeof value === 'string' && value && !isSafeLocalPath(value)) {
        return fail(`Caminho inválido ou remoto não permitido para o campo ${key}.`);
      }
    }
    return ok(configService.saveSettings(settings as Partial<AppSettings>));
  }
);

// --- 8. Banco de Dados ---
server.registerTool(
  'db_list_connections',
  {
    title: 'Listar conexões de banco',
    description: 'Lista as conexões de banco de dados configuradas no Dev Manager (com senhas ocultadas).'
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
    const tables = await databaseService.listTables(targetConfig);
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
    const columns = await databaseService.getTableColumns(targetConfig, tableName);
    return ok({ tableName, columns, count: columns.length });
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

// --- Inicialização ---
async function main() {
  await server.connect(new StdioServerTransport());
  console.error('[Dev Manager MCP] Servidor conectado via stdio.');
}

main().catch((err) => {
  console.error('[Dev Manager MCP] Falha ao iniciar servidor:', err);
  process.exit(1);
});
