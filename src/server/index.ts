import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import os from 'os';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { ConfigService } from '../main/services/ConfigService';
import { KarafService } from '../main/services/KarafService';
import { WindowsService } from '../main/services/WindowsService';
import { GitAzureService } from '../main/services/GitAzureService';
import { RoutinesService } from '../main/services/RoutinesService';
import { DocsIndexService, DocSyncService } from '../main/services/DocsIndexService';
import { DatabaseService } from '../main/services/DatabaseService';
import { BackupService } from '../main/services/BackupService';
import { BackupSchedulerService } from '../main/services/BackupSchedulerService';
import * as cron from 'node-cron';
import { DockerService } from '../main/services/DockerService';
import { wslService } from '../main/services/WslService';
import { NetworkService } from '../main/services/NetworkService';
import { DeployService } from '../main/services/DeployService';
import { LogWatcherService } from '../main/services/LogWatcherService';
import { KarafLogPersistenceService } from '../main/services/KarafLogPersistenceService';
import { ConfluenceSource } from '../main/services/docSources/ConfluenceSource';
import { JiraSource } from '../main/services/docSources/JiraSource';
import { LlmService } from '../main/services/LlmService';
import { Routine801Service } from '../main/services/Routine801Service';
import { ApmService, ApmIngestError, MAX_OTLP_BODY_BYTES, OTLP_TRACE_INGEST_PATHS } from '../main/services/ApmService';
import {
  EnvironmentLog,
  KarafDeployRequest,
  AppSettings,
  AutomationProfile,
  AutomationStep,
  DocsIndexProgress,
  DocSyncProgress,
  DeployProfile,
  ApmFilter,
  DEFAULT_APM_OTLP_PORT
} from '../shared/types';
import { isValidIdentifier, isSafeUrl, isSafeKarafCommand, isSafeLocalPath } from '../main/utils/security';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (typeof (globalThis as any).__dirname === 'undefined') {
  (globalThis as any).__dirname = __dirname;
}
if (typeof (globalThis as any).__filename === 'undefined') {
  (globalThis as any).__filename = __filename;
}

dotenv.config();

const repoRoot = path.resolve(__dirname, '../..');
const appVersion = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf-8')).version || '0.0.0';
  } catch {
    return '0.0.0';
  }
})();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Configuração segura de CORS (restrita ao localhost por padrão)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Origem não permitida pela política de segurança CORS.'));
      }
    }
  })
);

// As rotas de ingestão OTLP leem o corpo cru (Protobuf, payloads maiores que o limite padrão do JSON)
const jsonBodyParser = express.json();
app.use((req, res, next) => (OTLP_TRACE_INGEST_PATHS.includes(req.path) ? next() : jsonBodyParser(req, res, next)));

// Autenticação por API Key (opcional, mas fortemente recomendada quando o painel
// é exposto além de localhost — todas as rotas abaixo controlam serviços do SO,
// processos e execução de comandos locais).
const API_KEY = process.env.API_KEY?.trim();
const configuredHost = process.env.HOST || (process.env.DOCKER_CONTAINER ? '0.0.0.0' : '127.0.0.1');
const exposedBeyondLocalhost = configuredHost !== '127.0.0.1' && configuredHost !== 'localhost';
if (!API_KEY && exposedBeyondLocalhost) {
  console.error(
    '[Segurança] API_KEY não definida e HOST não está restrito a localhost. ' +
      'Este painel controla execução de comandos, serviços do SO e bancos de dados — ' +
      'expô-lo sem autenticação permitiria a qualquer host na rede executar comandos arbitrários. ' +
      'Defina API_KEY no .env antes de expor além de localhost.'
  );
  process.exit(1);
}

app.use((req, res, next) => {
  if (!API_KEY || !req.path.startsWith('/api/')) return next();
  const provided = req.header('x-api-key');
  if (provided === API_KEY) return next();
  res.status(401).json({ error: 'API key ausente ou inválida. Envie o header x-api-key.' });
});

// Inicializa os serviços
const configService = new ConfigService();
const karafService = new KarafService(configService);
const databaseService = new DatabaseService();
const backupService = new BackupService();
const backupSchedulerService = new BackupSchedulerService(configService, backupService);
backupSchedulerService.onResult = (connectionName, result) => {
  broadcastWs('backup:schedule-result', { connectionName, result });
};
backupSchedulerService.rescheduleAll();
const networkService = new NetworkService();
const windowsService = new WindowsService(configService, karafService, databaseService, networkService);
const gitAzureService = new GitAzureService(configService, karafService);
const routinesService = new RoutinesService(configService);
const docsIndexService = new DocsIndexService(configService, gitAzureService);
const docSyncService = new DocSyncService(configService, docsIndexService);
docsIndexService.onWatchReindexComplete = (status) => {
  broadcastWs('docs:reindex-complete', status);
};
if (configService.getSettings().autoReindexOnChange) {
  docsIndexService.startWatching();
}
const dockerService = new DockerService();
const deployService = new DeployService(configService, karafService, dockerService, windowsService, networkService);
const karafLogPersistenceService = new KarafLogPersistenceService();
const logWatcherService = new LogWatcherService();
const llmService = new LlmService(configService, docsIndexService);
const routine801Service = new Routine801Service(configService, karafService);
const apmService = new ApmService();
apmService.onNewTrace = (summary) => {
  broadcastWs('apm:new-trace', summary);
};
// Mesmo receptor OTLP dedicado do app desktop, para que as instruções da tela de APM (porta 4318)
// valham também no modo web. Em Docker a porta precisa ser publicada; alternativamente, os
// exportadores podem apontar para a própria porta do servidor (rota /v1/traces).
apmService
  .startReceiver(Number(process.env.APM_OTLP_PORT) || DEFAULT_APM_OTLP_PORT, process.env.APM_OTLP_HOST || configuredHost)
  .catch((err) => {
    console.warn('[ApmService] Falha ao iniciar receptor OTLP:', err);
  });

// Gerenciamento de conexões WebSocket com proteção contra CSWSH (Cross-Site WebSocket Hijacking)
const wsClients = new Set<WebSocket>();

wss.on('connection', (ws, req) => {
  const origin = req.headers.origin;
  // Bloquear conexões cuja origem não pertença à lista de origens autorizadas
  if (origin && !allowedOrigins.includes(origin)) {
    console.warn(`[Segurança] Conexão WebSocket bloqueada de origem não autorizada (CSWSH): ${origin}`);
    ws.close(1008, 'Origin not allowed');
    return;
  }

  // Exigir a mesma API key das rotas REST no handshake do WS. Sem isso, um cliente
  // que não seja navegador (e portanto não envia header Origin) conseguiria se
  // conectar direto e enviar karaf:input — execução de comando — contornando por
  // completo a autenticação por API key.
  if (API_KEY) {
    const requestUrl = new URL(req.url || '', 'http://localhost');
    const providedKey = requestUrl.searchParams.get('apiKey');
    if (providedKey !== API_KEY) {
      console.warn('[Segurança] Conexão WebSocket rejeitada: API key ausente ou inválida.');
      ws.close(1008, 'API key ausente ou inválida');
      return;
    }
  }

  wsClients.add(ws);

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message.toString());
      if (parsed.type === 'karaf:input' && typeof parsed.data === 'string') {
        karafService.sendEmbeddedInput(parsed.data);
      }
    } catch {
      // Mensagem não formatada em JSON
    }
  });

  ws.on('close', () => {
    wsClients.delete(ws);
  });
});

function broadcastWs(type: string, data: any) {
  const payload = JSON.stringify({ type, data });
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

// --- ROTAS DA API REST ---

// 1. Sistema & Verificação de Caminhos
app.get('/api/system/info', async (_req, res) => {
  const isAdmin = await windowsService.checkAdminPrivileges();

  res.json({
    appName: 'Dev Manager (Web/Docker)',
    appVersion,
    electronVersion: 'N/A (Docker Web Mode)',
    nodeVersion: process.version,
    chromeVersion: 'N/A',
    v8Version: process.versions.v8 || 'N/A',
    osPlatform: process.env.DOCKER_CONTAINER ? 'Docker (Linux)' : os.platform(),
    osRelease: os.release(),
    osArch: os.arch(),
    osHostname: os.hostname(),
    totalMemoryMb: Math.round(os.totalmem() / 1024 / 1024),
    freeMemoryMb: Math.round(os.freemem() / 1024 / 1024),
    configPath: configService.getConfigFilePath(),
    isAdmin
  });
});

app.get('/api/system/changelog', (_req, res) => {
  try {
    const changelogPath = path.join(repoRoot, 'CHANGELOG.md');
    if (!fs.existsSync(changelogPath)) return res.json({ content: null });
    res.json({ content: fs.readFileSync(changelogPath, 'utf-8') });
  } catch {
    res.json({ content: null });
  }
});

app.get('/api/system/mcp-docs', (_req, res) => {
  try {
    const docsPath = path.join(repoRoot, 'docs', 'MCP_TOOLS.md');
    if (!fs.existsSync(docsPath)) return res.json({ content: '# Documentação não encontrada\nNão foi possível localizar o arquivo MCP_TOOLS.md.' });
    res.json({ content: fs.readFileSync(docsPath, 'utf-8') });
  } catch (err: any) {
    res.json({ content: `# Erro ao ler documentação\n${err.message}` });
  }
});

app.get('/api/system/check-path', (req, res) => {
  const targetPath = (req.query.path as string) || '';
  if (!isSafeLocalPath(targetPath)) {
    return res.status(400).json({ path: targetPath, exists: false, isDirectory: false, isFile: false, message: 'Caminho inválido ou remoto não permitido' });
  }
  res.json(configService.checkPath(targetPath));
});

app.get('/api/system/auto-detect', (_req, res) => {
  res.json(configService.autoDetectPaths());
});

// 2. Gestor de Ambiente
app.get('/api/env/admin', async (_req, res) => {
  res.json({ isAdmin: await windowsService.checkAdminPrivileges() });
});

app.get('/api/env/services', async (_req, res) => {
  res.json(await windowsService.getAllServicesStatus());
});

app.get('/api/env/processes', async (_req, res) => {
  res.json(await windowsService.getProcessesStatus());
});

app.get('/api/env/ports', async (_req, res) => {
  res.json(await windowsService.checkPorts());
});

app.post('/api/env/services/start', async (req, res) => {
  const { name } = req.body;
  if (!isValidIdentifier(name)) {
    return res.status(400).json({ error: 'Nome de serviço inválido.' });
  }
  res.json({ success: await windowsService.startService(name) });
});

app.post('/api/env/services/stop', async (req, res) => {
  const { name } = req.body;
  if (!isValidIdentifier(name)) {
    return res.status(400).json({ error: 'Nome de serviço inválido.' });
  }
  res.json({ success: await windowsService.stopService(name) });
});

app.post('/api/env/services/batch-start', async (req, res) => {
  const { names } = req.body;
  const validNames = (names || []).filter(isValidIdentifier);
  res.json(await windowsService.batchStartServices(validNames));
});

app.post('/api/env/services/batch-stop', async (req, res) => {
  const { names } = req.body;
  const validNames = (names || []).filter(isValidIdentifier);
  res.json(await windowsService.batchStopServices(validNames));
});

app.post('/api/env/processes/batch-kill', async (req, res) => {
  const { names } = req.body;
  const validNames = (names || []).filter(isValidIdentifier);
  res.json(await windowsService.batchKillProcesses(validNames));
});

app.post('/api/env/launch-ide', async (_req, res) => {
  res.json({ success: await windowsService.launchIntelliJ() });
});

app.post('/api/env/launch-server-debug', (_req, res) => {
  res.json({ success: windowsService.launchServerDebug() });
});

app.post('/api/env/reset', async (req, res) => {
  const options = req.body?.options || req.body?.mode || req.body || 'embedded';
  const result = await windowsService.resetEnvironment(
    options,
    (log: EnvironmentLog) => {
      broadcastWs('env:log-event', log);
    },
    (chunk: string) => {
      karafLogPersistenceService.append(chunk);
      broadcastWs('karaf:stdout', chunk);
    }
  );
  res.json(result);
});

// 2b. Orquestrador de Perfis de Automação
app.post('/api/profile/run', async (req, res) => {
  const profile: AutomationProfile = req.body?.profile;
  const result = await windowsService.executeProfile(
    profile,
    (log) => broadcastWs('env:log-event', log),
    (stepIndex, totalSteps, step) => broadcastWs('profile:step-progress', { stepIndex, totalSteps, step })
  );
  res.json(result);
});

app.post('/api/profile/stop', async (req, res) => {
  const profile: AutomationProfile = req.body?.profile;
  const result = await windowsService.stopProfile(profile, (log) => broadcastWs('env:log-event', log));
  res.json(result);
});

app.post('/api/profile/run-step', async (req, res) => {
  const step: AutomationStep = req.body?.step;
  const profileName: string | undefined = req.body?.profileName;
  const success = await windowsService.runProfileStep(step, profileName, (log) => broadcastWs('env:log-event', log));
  res.json({ success });
});

app.post('/api/profile/stop-step', async (req, res) => {
  const step: AutomationStep = req.body?.step;
  const success = await windowsService.stopProfileStep(step, (log) => broadcastWs('env:log-event', log));
  res.json({ success });
});

app.post('/api/profile/restart-step', async (req, res) => {
  const step: AutomationStep = req.body?.step;
  const profileName: string | undefined = req.body?.profileName;
  const success = await windowsService.restartProfileStep(step, profileName, (log) => broadcastWs('env:log-event', log));
  res.json({ success });
});

app.post('/api/profile/kill-port', async (req, res) => {
  const port = Number(req.body?.port);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    return res.status(400).json({ error: 'Porta inválida.' });
  }
  res.json({ success: await windowsService.killPortProcess(port) });
});

// 3. Karaf Deployer & Console Embutido
app.get('/api/karaf/embedded/status', (_req, res) => {
  res.json({ isRunning: karafService.isEmbeddedRunning() });
});

app.post('/api/karaf/embedded/start', (_req, res) => {
  const started = karafService.startEmbeddedKarafDebug((chunk) => {
    karafLogPersistenceService.append(chunk);
    broadcastWs('karaf:stdout', chunk);
  });
  res.json({ success: started });
});

app.get('/api/karaf/embedded/persisted-logs', (req, res) => {
  const maxChars = req.query.maxChars ? Number(req.query.maxChars) : undefined;
  res.json({ output: karafLogPersistenceService.read(maxChars) });
});

app.post('/api/karaf/embedded/persisted-logs/clear', (_req, res) => {
  karafLogPersistenceService.clear();
  res.json({ success: true });
});

app.post('/api/karaf/embedded/stop', async (_req, res) => {
  res.json({ success: await karafService.stopEmbeddedKaraf() });
});

app.post('/api/karaf/embedded/input', (req, res) => {
  const { input } = req.body;
  res.json({ success: karafService.sendEmbeddedInput(input || '') });
});

app.post('/api/karaf/deploy', async (req, res) => {
  const request: KarafDeployRequest = req.body;
  const result = await karafService.deploy(request, (chunk) => {
    broadcastWs('karaf:log-chunk', chunk);
  });
  broadcastWs('karaf:deploy-result', result);
  res.json(result);
});

app.post('/api/karaf/exec', async (req, res) => {
  const { command } = req.body;
  if (!isSafeKarafCommand(command)) {
    return res.status(400).json({ error: 'Comando contém caracteres não permitidos ou formato inválido.' });
  }
  const result = await karafService.executeKarafCommand(command, (chunk) => {
    broadcastWs('karaf:log-chunk', chunk);
  });
  res.json(result);
});

app.post('/api/karaf/build-and-deploy', async (req, res) => {
  const { request, projectPath, skipTests } = req.body as {
    request: KarafDeployRequest;
    projectPath: string;
    skipTests?: boolean;
  };
  if (!isSafeLocalPath(projectPath)) {
    return res.status(400).json({ success: false, error: 'Caminho de projeto inválido.' });
  }
  const result = await karafService.buildAndDeployMaven(request, projectPath, skipTests !== false, (chunk) => {
    broadcastWs('karaf:log-chunk', chunk);
  });
  broadcastWs('karaf:deploy-result', result);
  res.json(result);
});

app.get('/api/karaf/deploy-history', (_req, res) => {
  res.json(karafService.getDeployHistory());
});

app.post('/api/karaf/run-maven-build', async (req, res) => {
  const { projectPath, skipTests } = req.body as { projectPath: string; skipTests?: boolean };
  if (!isSafeLocalPath(projectPath)) {
    return res.status(400).json({ code: 1, stdout: '', stderr: 'Caminho de projeto inválido.' });
  }
  const result = await karafService.runMavenBuild(projectPath, skipTests !== false, (chunk) => {
    broadcastWs('karaf:log-chunk', chunk);
  });
  if (result.code !== 0) {
    broadcastWs('karaf:build-result', result);
  }
  res.json(result);
});

app.post('/api/deploy/run-profile', async (req, res) => {
  const profile: DeployProfile = req.body;
  const result = await deployService.executeProfile(
    profile,
    (chunk) => {
      broadcastWs('deploy:log-chunk', chunk);
    },
    (progress) => {
      broadcastWs('deploy:step-progress', progress);
    }
  );
  res.json(result);
});

app.post('/api/deploy/run-step', async (req, res) => {
  const { step, profileName } = req.body;
  const result = await deployService.executeSingleStep(step, (chunk) => {
    broadcastWs('deploy:log-chunk', chunk);
  }, profileName);
  res.json(result);
});

app.post('/api/deploy/abort', async (_req, res) => {
  deployService.abortCurrentExecution();
  res.json({ success: true });
});

app.get('/api/deploy/history', async (_req, res) => {
  res.json(deployService.getHistory());
});

app.delete('/api/deploy/history', async (_req, res) => {
  deployService.clearHistory();
  res.json({ success: true });
});

app.get('/api/karaf/parse-pom', (req, res) => {
  const projectPath = (req.query.path as string) || '';
  if (!isSafeLocalPath(projectPath)) {
    return res.status(400).json(null);
  }
  res.json(karafService.parseProjectPomOrBat(projectPath));
});

// 4. Git & Azure DevOps
app.get('/api/git/projects', async (_req, res) => {
  res.json(await gitAzureService.listProjects());
});

app.get('/api/git/project', async (req, res) => {
  const projectPath = (req.query.path as string) || '';
  if (!isSafeLocalPath(projectPath)) {
    return res.status(400).json(null);
  }
  res.json(await gitAzureService.getProjectInfo(projectPath));
});

app.get('/api/git/pr-url', async (req, res) => {
  const projectPath = (req.query.path as string) || '';
  if (!isSafeLocalPath(projectPath)) {
    return res.status(400).json({ url: null });
  }
  const targetBranch = req.query.targetBranch as string | undefined;
  res.json({ url: await gitAzureService.buildPrUrl(projectPath, targetBranch) });
});

app.post('/api/git/command', async (req, res) => {
  const { projectPath, command } = req.body;
  if (!isSafeLocalPath(projectPath)) {
    return res.status(400).json({ success: false, output: 'Caminho de projeto inválido.' });
  }
  res.json(await gitAzureService.executeGitCommand(projectPath, command));
});

// 5. Catálogo de Rotinas
app.get('/api/routines', (_req, res) => {
  res.json(routinesService.listRoutines());
});

app.post('/api/routines/launch', async (req, res) => {
  const { fullPath } = req.body;
  if (!fullPath || typeof fullPath !== 'string' || !isSafeLocalPath(fullPath)) {
    return res.status(400).json({ success: false, error: 'Caminho inválido.' });
  }
  const success = await routinesService.launchRoutine(fullPath);
  res.json({ success });
});

app.post('/api/routines/launch-mapped', (req, res) => {
  const { id } = req.body;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'ID inválido.' });
  }
  res.json({ success: routinesService.launchMappedProgram(id) });
});

app.post('/api/routines/favorite', (req, res) => {
  const { id } = req.body;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID inválido.' });
  }
  res.json(configService.toggleFavoriteRoutine(id));
});

// 6. Documentação (RAG local)
app.post('/api/docs/reindex', async (_req, res) => {
  const result = await docsIndexService.reindex((progress: DocsIndexProgress) => {
    broadcastWs('docs:index-progress', progress);
  });
  res.json(result);
});

app.get('/api/docs/search', async (req, res) => {
  const query = (req.query.query as string) || '';
  const sourceLabel = req.query.sourceLabel as string | undefined;
  const topK = req.query.topK ? Number(req.query.topK) : undefined;
  if (!query.trim()) {
    return res.status(400).json({ error: 'Parâmetro query é obrigatório.' });
  }
  res.json(await docsIndexService.search(query, { sourceLabel, topK }));
});

app.get('/api/docs/status', (_req, res) => {
  res.json(docsIndexService.getStatus());
});

app.post('/api/docs/test-confluence-connection', async (req, res) => {
  try {
    const entries = await new ConfluenceSource(req.body).listEntries();
    res.json({ success: true, message: `Conectado com sucesso: ${entries.length} página(s) encontrada(s).` });
  } catch (err: any) {
    // 200 mesmo em falha: o corpo já carrega success:false + mensagem específica do Confluence.
    // Um status de erro HTTP faria o apiFetch do renderer descartar esse corpo (só vê "res.ok"
    // falso) e mostrar um genérico "HTTP 500" em vez da mensagem real — mesmo problema que
    // /api/db/test tem hoje, não repetir aqui.
    res.json({ success: false, message: err?.message || 'Falha ao conectar no Confluence.' });
  }
});

app.post('/api/docs/test-jira-connection', async (req, res) => {
  try {
    const entries = await new JiraSource(req.body).listEntries();
    res.json({ success: true, message: `Conectado com sucesso: ${entries.length} issue(s) encontrada(s).` });
  } catch (err: any) {
    res.json({ success: false, message: err?.message || 'Falha ao conectar no Jira.' });
  }
});

// --- IA & Provedores LLM (BYOK - Bring Your Own Key) ---
const handleTestLlmRoute = async (req: express.Request, res: express.Response) => {
  try {
    const result = await llmService.testConnection(req.body);
    res.json(result);
  } catch (err: any) {
    res.json({ success: false, message: err?.message || 'Falha ao testar conexão com LLM.' });
  }
};

// Mesmas restrições de shape aplicadas pela tool MCP equivalente (llm_chat / docs_ask_ai),
// para que a rota HTTP não aceite payloads/roles que a superfície MCP rejeitaria.
const llmChatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string()
    })
  ),
  providerId: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(32768).optional()
});

const llmAskDocsRequestSchema = z.object({
  query: z.string().min(1),
  topK: z.number().int().min(1).max(20).optional(),
  sourceLabel: z.string().optional()
});

const handleChatLlmRoute = async (req: express.Request, res: express.Response) => {
  try {
    const parsed = llmChatRequestSchema.safeParse(req.body?.request || req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Payload inválido para chat com LLM.', details: parsed.error.issues });
    }
    const result = await llmService.chat(parsed.data);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Falha na resposta do LLM.' });
  }
};

const handleAskDocsRoute = async (req: express.Request, res: express.Response) => {
  try {
    const parsed = llmAskDocsRequestSchema.safeParse(req.body?.request || req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Payload inválido para consulta com LLM.', details: parsed.error.issues });
    }
    const result = await llmService.askWithDocs(parsed.data);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Falha ao processar consulta com LLM.' });
  }
};

app.post('/api/llm/test-connection', handleTestLlmRoute);
app.post('/api/llm/chat', handleChatLlmRoute);
app.post('/api/llm/ask-with-docs', handleAskDocsRoute);

// Aliases de compatibilidade
app.post('/api/docs/test-llm', handleTestLlmRoute);
app.post('/api/docs/chat-llm', handleChatLlmRoute);
app.post('/api/docs/ask-llm', handleAskDocsRoute);

app.post('/api/docs/sync', async (req, res) => {
  const targetId = req.body?.targetId as string | undefined;
  const results = await docSyncService.syncToTarget(targetId, (progress: DocSyncProgress) => {
    broadcastWs('docs:sync-progress', progress);
  });
  res.json(results);
});

app.get('/api/docs/content', (req, res) => {
  const targetPath = (req.query.path as string) || '';
  const settings = configService.getSettings();
  const allowedBaseDirs = [settings.projectsPath, ...(settings.docFolders || []).map((f) => f.path)].filter(Boolean);
  const isAllowed = allowedBaseDirs.some((base) => isSafeLocalPath(targetPath) && targetPath.startsWith(base));
  if (!isAllowed || !fs.existsSync(targetPath)) {
    return res.status(404).json({ content: null, error: 'Arquivo não encontrado ou acesso negado' });
  }
  try {
    const stats = fs.statSync(targetPath);
    if (stats.size > 2 * 1024 * 1024) {
      return res.json({ content: '(Arquivo muito grande para pré-visualização direta)' });
    }
    const content = fs.readFileSync(targetPath, 'utf-8');
    res.json({ content });
  } catch (err: any) {
    res.status(500).json({ content: null, error: err.message });
  }
});

// 7. Configurações
app.get('/api/settings', (_req, res) => {
  res.json(configService.sanitizeSecrets(configService.getSettings()));
});

app.post('/api/settings', (req, res) => {
  const candidate = req.body || {};

  // A preservação de senhas/tokens existentes (quando o cliente ecoa de volta o valor
  // sanitizado/vazio recebido de GET /api/settings) é responsabilidade do próprio
  // ConfigService.saveSettings — assim os três transportes (IPC/REST/MCP) se comportam
  // igual e um novo campo de segredo não precisa ser listado em 3 arquivos.

  const pathKeys: (keyof AppSettings)[] = ['appPath', 'karafPath', 'intellijPath', 'projectsPath'];
  for (const key of pathKeys) {
    if (candidate[key] && typeof candidate[key] === 'string') {
      if (!isSafeLocalPath(candidate[key])) {
        return res.status(400).json({ error: `Caminho inválido ou remoto não permitido para o campo ${key}.` });
      }
    }
  }
  if (Array.isArray(candidate.docFolders)) {
    for (const folder of candidate.docFolders) {
      if (!folder || typeof folder.path !== 'string' || !isSafeLocalPath(folder.path)) {
        return res.status(400).json({ error: 'Caminho inválido ou remoto não permitido em docFolders.' });
      }
    }
  }
  const saved = configService.saveSettings(candidate);
  if ('autoReindexOnChange' in candidate) {
    if (candidate.autoReindexOnChange) {
      docsIndexService.startWatching();
    } else {
      docsIndexService.stopWatching();
    }
  }
  res.json(configService.sanitizeSecrets(saved));
});

// 7. Utilitários Shell
app.post('/api/shell/open', (req, res) => {
  const { url } = req.body;
  if (!isSafeUrl(url)) {
    return res.status(400).json({ error: 'URL insegura ou não permitida.' });
  }
  res.json({ success: true, url });
});

// 8. Banco de Dados (Oracle, MySQL, Postgres)
app.post('/api/db/test', async (req, res) => {
  try {
    const result = await databaseService.testConnection(req.body);
    res.json(result);
  } catch (err: any) {
    res.json({ success: false, message: err.message || 'Erro ao testar conexão' });
  }
});

app.post('/api/db/query', async (req, res) => {
  try {
    const { config, sql, maxRows, binds } = req.body;
    const result = await databaseService.executeQuery(config, sql, maxRows, binds);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Erro ao executar consulta' });
  }
});

app.post('/api/db/tables', async (req, res) => {
  try {
    const result = await databaseService.listTables(req.body);
    res.json(result);
  } catch {
    res.status(500).json([]);
  }
});

app.post('/api/db/columns', async (req, res) => {
  try {
    const { config, tableName } = req.body;
    const result = await databaseService.getTableColumns(config, tableName);
    res.json(result);
  } catch {
    res.status(500).json([]);
  }
});

app.post('/api/db/backup', async (req, res) => {
  try {
    const { config, destinationFolder, oracleDirectory, compress, useCustomCommand, customCommand } = req.body;
    const result = await backupSchedulerService.runManualBackup(config, destinationFolder, {
      oracleDirectory,
      compress,
      useCustomCommand,
      customCommand
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Erro ao executar backup' });
  }
});

app.post('/api/db/backups', async (req, res) => {
  try {
    const { destinationFolder } = req.body;
    const result = await backupService.listBackups(destinationFolder);
    res.json(result);
  } catch {
    res.status(500).json([]);
  }
});

app.post('/api/db/backup-config', async (req, res) => {
  try {
    const config = req.body;
    if (config.cronExpression && !cron.validate(config.cronExpression)) {
      return res.json({ success: false, message: 'Expressão cron inválida.' });
    }

    const settings = configService.getSettings();
    const existing = settings.backupConfigs || [];
    const previous = existing.find((b) => b.connectionId === config.connectionId);
    const merged = { ...previous, ...config };
    const updated = [merged, ...existing.filter((b) => b.connectionId !== config.connectionId)];
    configService.saveSettings({ backupConfigs: updated });
    backupSchedulerService.rescheduleAll();

    res.json({ success: true, message: 'Agendamento salvo com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Erro ao salvar agendamento' });
  }
});

app.post('/api/db/restore', async (req, res) => {
  try {
    const { config, filePath } = req.body;
    const result = await backupSchedulerService.runManualRestore(config, filePath);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Erro ao restaurar backup' });
  }
});

app.post('/api/db/backup-history', async (req, res) => {
  try {
    const { connectionId } = req.body || {};
    res.json(backupSchedulerService.getHistory(connectionId));
  } catch {
    res.status(500).json([]);
  }
});

app.post('/api/db/restore-drill', async (req, res) => {
  try {
    const { scratchConnection, filePath } = req.body;
    const result = await backupSchedulerService.runRestoreDrill(scratchConnection, filePath);
    res.json(result);
  } catch (err: any) {
    // 200 com success:false: status de erro faria o apiFetch do renderer descartar o corpo
    // e mostrar um "HTTP 500" genérico em vez da mensagem real.
    res.json({ success: false, message: err.message || 'Erro ao testar restauração' });
  }
});

app.post('/api/backup/test-webhook', async (req, res) => {
  try {
    const webhook = req.body;
    const result = await backupSchedulerService.testWebhook(webhook);
    res.json(result);
  } catch (err: any) {
    res.json({ success: false, message: err.message || 'Falha ao testar webhook' });
  }
});

// 9. Gerenciador de Containers (Docker / Podman / WSL)
app.get(['/api/wsl/environments', '/api/config/environments'], (_req, res) => {
  const cfg = wslService.loadContainerManagerConfig();
  res.json(cfg);
});

app.put(['/api/wsl/environments', '/api/config/environments'], (req, res) => {
  const env = req.body;
  if (!env || !env.name) {
    return res.status(400).json({ success: false, error: 'Dados de ambiente inválidos.' });
  }
  const success = wslService.saveContainerManagerEnvironment(env);
  res.json({ success });
});

app.delete(['/api/wsl/environments/:id', '/api/config/environments/:id'], (req, res) => {
  const success = wslService.deleteContainerManagerEnvironment(req.params.id);
  res.json({ success });
});

app.get('/api/wsl/distros', async (_req, res) => {
  const status = await dockerService.checkDockerStatus();
  res.json(status.availableDistros || []);
});

app.post('/api/wsl/start-docker-daemon', async (req, res) => {
  const { distro } = req.body || {};
  const result = await wslService.startDockerDaemon(distro);
  res.json(result);
});

app.post('/api/wsl/distros/:name/terminate', async (req, res) => {
  const success = await wslService.terminateDistro(req.params.name);
  res.json({ success });
});

app.post('/api/wsl/distros/:name/terminal', async (req, res) => {
  const success = await wslService.openWslTerminal(req.params.name);
  res.json({ success });
});

app.get('/api/wsl/distros/:name/ip', async (req, res) => {
  const ip = await wslService.getDistroIp(req.params.name);
  res.json({ ip });
});

app.get('/api/wsl/dumps', async (req, res) => {
  try {
    const distro = req.query.distro as string | undefined;
    const dumps = await wslService.listDmpFiles(distro);
    res.json(dumps);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/wsl/open-dumps', async (req, res) => {
  try {
    const { distro } = req.body || {};
    const result = await wslService.openDumpsFolder(distro);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, path: '', error: err.message });
  }
});

app.post('/api/wsl/md5', (req, res) => {
  try {
    const { text } = req.body || {};
    const result = wslService.generateMd5(text || '');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/wsl/wsh-prerequisites', async (req, res) => {
  try {
    const distro = req.query.distro as string | undefined;
    const result = await wslService.checkWshPrerequisites(distro);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/wsl/open-opt', async (req, res) => {
  try {
    const { distro } = req.body || {};
    const result = await wslService.openWslOptFolder(distro);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, path: '', error: err.message });
  }
});

// --- Snapshots WSL & INFR-Docker Setup ---
app.get('/api/wsl/snapshots', async (req, res) => {
  try {
    const dir = req.query.dir as string | undefined;
    const snapshots = await wslService.listSnapshots(dir);
    res.json(snapshots);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/wsl/snapshots-dir', (_req, res) => {
  res.json({ dir: wslService.getSnapshotsDir() });
});

app.put('/api/wsl/snapshots-dir', (req, res) => {
  const { dir } = req.body || {};
  if (!dir) return res.status(400).json({ error: 'dir obrigatório' });
  const success = wslService.setSnapshotsDir(dir);
  res.json({ success, dir });
});

app.post('/api/wsl/import', async (req, res) => {
  try {
    const { distroName, installDir, tarPath } = req.body || {};
    if (!distroName || !installDir || !tarPath) {
      return res.status(400).json({ success: false, error: 'distroName, installDir e tarPath são obrigatórios' });
    }
    const result = await wslService.importSnapshot(distroName, installDir, tarPath);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/wsl/export', async (req, res) => {
  try {
    const { distroName, outputPath } = req.body || {};
    if (!distroName || !outputPath) {
      return res.status(400).json({ success: false, error: 'distroName e outputPath são obrigatórios' });
    }
    const result = await wslService.exportSnapshot(distroName, outputPath);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/wsl/distros/:name', async (req, res) => {
  try {
    const { name } = req.params;
    if (!name) return res.status(400).json({ success: false, error: 'name é obrigatório' });
    const result = await wslService.unregisterDistro(name);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/infr/scripts', async (req, res) => {
  try {
    const customPath = req.query.path as string | undefined;
    const scripts = await wslService.checkInfrDockerScripts(customPath);
    res.json(scripts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/infr/run-script', async (req, res) => {
  try {
    const { scriptType, options } = req.body || {};
    if (!scriptType) return res.status(400).json({ success: false, output: 'scriptType é obrigatório' });
    const result = await wslService.runInfrSetupScript(scriptType, options || {});
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, output: err.message });
  }
});

app.post(['/api/wsl/target-distro', '/api/docker/target-distro'], async (req, res) => {
  const { distro } = req.body || {};
  dockerService.setTargetWslDistro(distro || null);
  const status = await dockerService.checkDockerStatus();
  res.json(status);
});

app.post('/api/docker/start-sequence', async (req, res) => {
  const { containers } = req.body || {};
  if (!Array.isArray(containers)) {
    return res.status(400).json({ success: false, error: 'containers deve ser um array' });
  }
  const result = await dockerService.startContainerSequence(containers, (step) => {
    broadcastWs('docker:sequence-progress', step);
  });
  res.json(result);
});

app.get(['/api/docker/status', '/api/containers/status'], async (_req, res) => {
  const status = await dockerService.checkDockerStatus();
  res.json(status);
});

app.get(['/api/docker/containers', '/api/containers', '/api/containers/list'], async (_req, res) => {
  const containers = await dockerService.listContainers();
  res.json(containers);
});

app.get(['/api/docker/stats', '/api/containers/stats'], async (_req, res) => {
  const stats = await dockerService.getContainerStats();
  res.json(stats);
});

app.post(['/api/docker/containers/:id/start', '/api/containers/:id/start'], async (req, res) => {
  try {
    const success = await dockerService.startContainer(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post(['/api/docker/containers/:id/stop', '/api/containers/:id/stop'], async (req, res) => {
  try {
    const success = await dockerService.stopContainer(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post(['/api/docker/containers/:id/restart', '/api/containers/:id/restart'], async (req, res) => {
  try {
    const success = await dockerService.restartContainer(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get(['/api/docker/containers/:id/logs', '/api/containers/:id/logs'], async (req, res) => {
  try {
    const lines = req.query.lines ? Number(req.query.lines) : 200;
    const logs = await dockerService.getContainerLogs(req.params.id, lines);
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ logs: `Erro: ${err.message}` });
  }
});

app.post(['/api/docker/containers/:id/terminal', '/api/containers/:id/terminal'], async (req, res) => {
  try {
    const shellName = req.body?.shell || 'bash';
    const success = await dockerService.openContainerTerminal(req.params.id, shellName);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get(['/api/docker/containers/:id/inspect', '/api/containers/:id/inspect'], async (req, res) => {
  try {
    const details = await dockerService.inspectContainer(req.params.id);
    if (!details) {
      return res.status(404).json({ error: 'Container não encontrado' });
    }
    res.json(details);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(['/api/docker/containers/:id/pause', '/api/containers/:id/pause'], async (req, res) => {
  try {
    const success = await dockerService.pauseContainer(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post(['/api/docker/containers/:id/unpause', '/api/containers/:id/unpause'], async (req, res) => {
  try {
    const success = await dockerService.unpauseContainer(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post(['/api/docker/containers/prune', '/api/containers/prune'], async (_req, res) => {
  try {
    const result = await dockerService.pruneContainers();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, output: err.message });
  }
});

app.delete(['/api/docker/containers/:id', '/api/containers/:id'], async (req, res) => {
  try {
    const success = await dockerService.removeContainer(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Ferramentas de Manutenção Oracle (INFR-Docker)
app.post(['/api/docker/oracle-health', '/api/containers/oracle-health'], async (req, res) => {
  try {
    const { containerName, schema, fix, user, password } = req.body || {};
    const result = await dockerService.execOracleHealth(containerName, schema, fix, user, password);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, output: '', error: err.message });
  }
});

app.post(['/api/docker/oracle-sqlplus', '/api/containers/oracle-sqlplus'], async (req, res) => {
  try {
    const { containerName, user, password } = req.body || {};
    const success = await dockerService.openOracleSqlPlus(containerName, user, password);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post(['/api/docker/oracle-datapump', '/api/containers/oracle-datapump'], async (req, res) => {
  try {
    const result = await dockerService.execOracleDataPump(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, output: '', error: err.message });
  }
});

app.post(['/api/docker/wta-karaf-client', '/api/containers/wta-karaf-client'], async (req, res) => {
  try {
    const { containerName } = req.body || {};
    if (!containerName) {
      return res.status(400).json({ success: false, error: 'containerName é obrigatório' });
    }
    const success = await dockerService.openWtaKarafClient(containerName);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post(['/api/docker/compose-up', '/api/containers/compose-up'], async (req, res) => {
  try {
    const { composeFilePath, profile, detach, build } = req.body || {};
    const result = await dockerService.composeUp(composeFilePath, { profile, detach, build }, (chunk) => {
      broadcastWs('docker:compose-log-chunk', chunk);
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ code: 1, stdout: '', stderr: err.message || 'Erro ao subir compose' });
  }
});

app.post(['/api/docker/compose-down', '/api/containers/compose-down'], async (req, res) => {
  try {
    const { composeFilePath, profile, volumes } = req.body || {};
    const result = await dockerService.composeDown(composeFilePath, { profile, volumes }, (chunk) => {
      broadcastWs('docker:compose-log-chunk', chunk);
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ code: 1, stdout: '', stderr: err.message || 'Erro ao derrubar compose' });
  }
});

app.post(['/api/docker/compose-restart', '/api/containers/compose-restart'], async (req, res) => {
  try {
    const { composeFilePath, profile } = req.body || {};
    const result = await dockerService.composeRestart(composeFilePath, { profile }, (chunk) => {
      broadcastWs('docker:compose-log-chunk', chunk);
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ code: 1, stdout: '', stderr: err.message || 'Erro ao reiniciar compose' });
  }
});

app.post(['/api/docker/compose-logs', '/api/containers/compose-logs'], async (req, res) => {
  try {
    const { composeFilePath, profile, lines } = req.body || {};
    const logs = await dockerService.getComposeLogs(composeFilePath, { profile, lines });
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ logs: `Erro: ${err.message}` });
  }
});

app.post(['/api/docker/compose-status', '/api/containers/compose-status'], async (req, res) => {
  try {
    const { composeFilePath, profile } = req.body || {};
    res.json(await dockerService.composeStatus(composeFilePath, profile));
  } catch {
    res.status(500).json([]);
  }
});

// 10. Informações de Rede e IPs (Local e WSL)
app.get('/api/network/ips', async (_req, res) => {
  const ips = await networkService.getNetworkIps();
  res.json(ips);
});

app.post('/api/network/health', async (req, res) => {
  const { url, timeoutMs } = req.body;
  const result = await networkService.checkHttpHealth(url, timeoutMs);
  res.json(result);
});

// 11. Métricas do Sistema
app.get('/api/system/metrics', async (_req, res) => {
  const metrics = await networkService.getSystemMetrics();
  res.json(metrics);
});

// 12. Bundles Karaf
app.post('/api/karaf/bundles', async (req, res) => {
  const bundles = await karafService.listBundlesParsed(req.body);
  res.json(bundles);
});

app.post('/api/karaf/bundles/manage', async (req, res) => {
  const { action, bundleId, credentials } = req.body;
  const result = await karafService.manageBundle(action, bundleId, credentials);
  res.json(result);
});

app.post('/api/karaf/bundles/manage-batch', async (req, res) => {
  const { action, bundleIds, credentials } = req.body;
  const result = await karafService.manageBundlesBatch(action, bundleIds, credentials);
  res.json(result);
});

app.post('/api/karaf/log', async (req, res) => {
  const { lines, credentials } = req.body || {};
  const result = await karafService.getKarafLog(lines, credentials);
  res.json(result);
});

app.post('/api/karaf/bundles/details', async (req, res) => {
  const { bundleId, credentials } = req.body;
  const result = await karafService.getBundleDetails(bundleId, credentials);
  res.json(result);
});

app.post('/api/karaf/bundles/check-deps', async (req, res) => {
  const { bundleId, credentials } = req.body;
  const result = await karafService.checkBundleDependencies(bundleId, credentials);
  res.json(result);
});

app.post('/api/karaf/bundles/check-install-deps', async (req, res) => {
  const { target, credentials } = req.body;
  const result = await karafService.checkInstallDependencies(target, credentials);
  res.json(result);
});

app.post('/api/karaf/bundles/install', async (req, res) => {
  const result = await karafService.installBundle(req.body);
  res.json(result);
});

app.post('/api/karaf/bundles/uninstall', async (req, res) => {
  const { bundleId, credentials } = req.body;
  const result = await karafService.uninstallBundle(bundleId, credentials);
  res.json(result);
});

app.post('/api/karaf/bundles/reinstall', async (req, res) => {
  const result = await karafService.reinstallBundle(req.body);
  res.json(result);
});

app.post('/api/karaf/bundles/update-version', async (req, res) => {
  const result = await karafService.updateBundleVersion(req.body);
  res.json(result);
});

// Rotina 801: Catálogo Oficial e Instalação de Serviços Web
app.get('/api/routine801/instalacao', async (req, res) => {
  try {
    const url = req.query.url ? String(req.query.url) : undefined;
    const data = await routine801Service.fetchInstallations(url);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Falha ao buscar instalações' });
  }
});

app.get('/api/routine801/atualizacao', async (req, res) => {
  try {
    const url = req.query.url ? String(req.query.url) : undefined;
    const data = await routine801Service.fetchUpdates(url);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Falha ao buscar atualizações' });
  }
});

app.get('/api/routine801/health', async (req, res) => {
  const url = req.query.url ? String(req.query.url) : undefined;
  const result = await routine801Service.checkServerHealth(url);
  res.json(result);
});

app.post('/api/routine801/install', async (req, res) => {
  try {
    const result = await routine801Service.installFeatures(req.body, (chunk) => {
      broadcastWs('karaf:log-chunk', chunk);
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Falha ao instalar pacotes da Rotina 801' });
  }
});

// 13. Operações Git Avançadas
app.post('/api/git/checkout', async (req, res) => {
  const { projectPath, branchName, createNew } = req.body;
  const result = await gitAzureService.checkoutBranch(projectPath, branchName, createNew);
  res.json(result);
});

app.post('/api/git/commit-push', async (req, res) => {
  const { projectPath, message } = req.body;
  const result = await gitAzureService.commitAndPush(projectPath, message);
  res.json(result);
});

app.get('/api/git/commits', async (req, res) => {
  const projectPath = String(req.query.path || '');
  const limit = Number(req.query.limit) || 10;
  const commits = await gitAzureService.getCommitHistory(projectPath, limit);
  res.json(commits);
});

app.get('/api/git/status-details', async (req, res) => {
  const projectPath = String(req.query.path || '');
  if (!isSafeLocalPath(projectPath)) {
    return res.status(400).json([]);
  }
  const statuses = await gitAzureService.getStatusDetails(projectPath);
  res.json(statuses);
});

app.get('/api/git/diff', async (req, res) => {
  const projectPath = String(req.query.path || '');
  const targetFile = req.query.file ? String(req.query.file) : undefined;
  if (!isSafeLocalPath(projectPath)) {
    return res.status(400).json({ success: false, diff: '', files: [], error: 'Caminho inválido' });
  }
  const result = await gitAzureService.getDiff(projectPath, targetFile);
  res.json(result);
});

// 14. Exportação / Importação de Configurações
app.get('/api/settings/export', async (req, res) => {
  const sanitize = req.query.sanitize !== 'false';
  const json = configService.exportSettings(sanitize);
  res.json({ json });
});

app.post('/api/settings/import', async (req, res) => {
  const { json } = req.body;
  const result = configService.importSettings(json);
  res.json(result);
});

// 15. Explain Plan do Banco de Dados
app.post('/api/db/explain', async (req, res) => {
  const { config, sql } = req.body;
  const result = await databaseService.explainPlan(config, sql);
  res.json(result);
});

// 16. Monitoramento de Logs em Tempo Real (Tail -f)
app.post('/api/logs/start-watch', async (req, res) => {
  const { sourceId, filePath, initialLines, encoding } = req.body;
  try {
    const result = await logWatcherService.startWatch(
      sourceId,
      filePath,
      (event) => {
        broadcastWs('logs:chunk', event);
      },
      initialLines,
      encoding
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao iniciar observação de log' });
  }
});

app.post('/api/logs/stop-watch', (req, res) => {
  const { sourceId } = req.body;
  const success = logWatcherService.stopWatch(sourceId);
  res.json({ success });
});

app.post('/api/logs/check-file', (req, res) => {
  const { filePath, sourceId } = req.body;
  const status = logWatcherService.checkFile(filePath, sourceId);
  res.json(status);
});

app.post('/api/logs/clear-file', async (req, res) => {
  const { filePath } = req.body;
  const success = await logWatcherService.clearLogFile(filePath);
  res.json({ success });
});

// ==========================================
// Rotas de APM & Ingestão OpenTelemetry (OTLP/HTTP)
// ==========================================

// Ingestão OTLP (JSON ou Protobuf, gzip/deflate) e simplificada — mesma decodificação do
// receptor embutido. O corpo chega cru porque o parser JSON global pula estas rotas.
app.post(
  OTLP_TRACE_INGEST_PATHS,
  // express.raw já descomprime gzip/deflate e aplica o limite ao corpo descomprimido
  express.raw({ type: () => true, limit: MAX_OTLP_BODY_BYTES }),
  async (req, res) => {
    try {
      const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      const result = await apmService.ingestOtlpBody(body, req.headers['content-type']);
      if (result.format === 'protobuf') {
        res.status(200).type('application/x-protobuf').send(Buffer.alloc(0));
      } else {
        res.json({ status: 'success', ingestedSpans: result.ingestedSpans, updatedTraces: result.updatedTraces });
      }
    } catch (err: any) {
      const statusCode = err instanceof ApmIngestError ? err.statusCode : 400;
      res.status(statusCode).json({ error: 'Erro ao processar traces OTLP', message: err?.message });
    }
  }
);

const apmFilterSchema = z.object({
  serviceName: z.string().optional(),
  search: z.string().optional(),
  hasError: z.boolean().optional(),
  hasDatabaseQuery: z.boolean().optional(),
  minDurationMs: z.number().optional(),
  maxDurationMs: z.number().optional(),
  limit: z.number().int().positive().optional(),
  startTimeMs: z.number().optional(),
  endTimeMs: z.number().optional()
});

// Consultas e Operações REST
app.get('/api/apm/overview', (req, res) => {
  const serviceName = typeof req.query.serviceName === 'string' ? req.query.serviceName : undefined;
  res.json(apmService.getOverview({ serviceName }));
});

app.post('/api/apm/traces', (req, res) => {
  const parsed = apmFilterSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Filtro de traces inválido.', details: parsed.error.issues });
  }
  const filter: ApmFilter = parsed.data;
  res.json(apmService.getTraces(filter));
});

app.get('/api/apm/traces/:id', (req, res) => {
  const details = apmService.getTraceDetails(req.params.id);
  if (!details) {
    return res.status(404).json({ error: 'Trace não encontrado' });
  }
  res.json(details);
});

app.get('/api/apm/services', (_req, res) => {
  res.json(apmService.getServices());
});

app.get('/api/apm/receiver-status', (_req, res) => {
  res.json(apmService.getReceiverStatus());
});

app.delete('/api/apm/traces', (_req, res) => {
  apmService.clear();
  res.json({ success: true });
});

app.post('/api/apm/demo', (_req, res) => {
  const result = apmService.generateDemoData();
  res.json(result);
});

// Servir Frontend SPA estático se compilado
const clientDist = path.resolve(__dirname, '../../dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || (process.env.DOCKER_CONTAINER ? '0.0.0.0' : '127.0.0.1');

server.listen(PORT, HOST, () => {
  console.log(`\r\n=================================================`);
  console.log(`🚀 Dev Manager Web Server Online!`);
  console.log(`🌐 Acesso Web: http://${HOST}:${PORT}`);
  console.log(`📡 WebSocket:  ws://${HOST}:${PORT}/ws`);
  console.log(`📁 Modo:       ${process.env.DOCKER_CONTAINER ? 'Docker Container' : 'Local Node.js'}`);
  console.log(`=================================================\r\n`);
});
