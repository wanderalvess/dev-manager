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
import { isValidIdentifier, isSafeLocalPath, isSafeKarafCommand } from '../main/utils/security';
import type { AppSettings } from '../shared/types';

// --- Composição dos serviços (mesma ordem usada em src/server/index.ts e src/main/index.ts) ---
const configService = new ConfigService();
const karafService = new KarafService(configService);
const windowsService = new WindowsService(configService, karafService);
const gitAzureService = new GitAzureService(configService, karafService);
const routinesService = new RoutinesService(configService);
const docsIndexService = new DocsIndexService(configService, gitAzureService);
const dockerService = new DockerService();

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
  'browser'
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
  targetName: z.string().optional()
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

const server = new McpServer({ name: 'dev-manager', version: '1.0.0' });

// --- 1. Sistema ---
server.registerTool(
  'system_get_info',
  { title: 'Info do sistema', description: 'Informações de SO, runtime Node e status de administrador.' },
  async () => {
    const isAdmin = await windowsService.checkAdminPrivileges();
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    const configPath = path.join(appData, 'dev-manager', 'config.json');
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

// --- 3.5. Docker ---
server.registerTool(
  'docker_status',
  { title: 'Status do Docker', description: 'Verifica se o Docker está instalado e se o daemon está em execução.' },
  async () => ok(await dockerService.checkDockerStatus())
);

server.registerTool(
  'docker_list_containers',
  { title: 'Listar containers', description: 'Lista todos os containers Docker locais (em execução e parados).' },
  async () => ok(await dockerService.listContainers())
);

server.registerTool(
  'docker_start_container',
  {
    title: 'Iniciar container',
    description: 'Inicia um container Docker existente pelo ID ou nome.',
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
    description: 'Para um container Docker em execução pelo ID ou nome.',
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
    description: 'Reinicia um container Docker pelo ID ou nome.',
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
    description: 'Retorna as últimas linhas de log de um container Docker.',
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
    description: 'Remove forçadamente um container Docker pelo ID ou nome (irreversível).',
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
    description: 'Monta a URL de criação de PR no Azure DevOps para o repositório e branch de destino.',
    inputSchema: { projectPath: z.string(), targetBranch: z.string().optional() }
  },
  async ({ projectPath, targetBranch }) => {
    if (!isSafeLocalPath(projectPath)) return fail('Caminho de projeto inválido.');
    return ok({ url: await gitAzureService.buildAzurePrUrl(projectPath, targetBranch) });
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
      'Escaneia os projetos configurados em busca de README/docs (.md, .mdx, .txt), gera embeddings locais e atualiza o índice de busca. Na primeira vez baixa o modelo de IA da internet. Bloqueia até concluir.'
  },
  async () => ok(await docsIndexService.reindex())
);

server.registerTool(
  'rag_search_docs',
  {
    title: 'Buscar na documentação',
    description: 'Busca semântica (RAG) nos trechos de documentação já indexados dos projetos.',
    inputSchema: {
      query: z.string().min(1),
      projectName: z.string().optional(),
      topK: z.number().int().min(1).max(50).optional()
    }
  },
  async ({ query, projectName, topK }) => {
    const status = docsIndexService.getStatus();
    if (status.totalChunks === 0) {
      return fail('Índice de documentação vazio. Rode rag_reindex_docs primeiro.');
    }
    return ok(await docsIndexService.search(query, { projectName, topK }));
  }
);

server.registerTool(
  'rag_index_status',
  { title: 'Status do índice de documentação', description: 'Retorna metadados do índice de busca (nº de trechos, arquivos, projetos, última indexação).' },
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

// --- Inicialização ---
async function main() {
  await server.connect(new StdioServerTransport());
  console.error('[Dev Manager MCP] Servidor conectado via stdio.');
}

main().catch((err) => {
  console.error('[Dev Manager MCP] Falha ao iniciar servidor:', err);
  process.exit(1);
});
