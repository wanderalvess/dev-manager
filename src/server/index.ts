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
import { DocsIndexService } from '../main/services/DocsIndexService';
import { EnvironmentLog, KarafDeployRequest, AppSettings, AutomationProfile, AutomationStep, DocsIndexProgress } from '../shared/types';
import { isValidIdentifier, isSafeUrl, isSafeKarafCommand, isSafeLocalPath } from '../main/utils/security';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

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

app.use(express.json());

// Autenticação por API Key (opcional, mas fortemente recomendada quando o painel
// é exposto além de localhost — todas as rotas abaixo controlam serviços do SO,
// processos e execução de comandos locais).
const API_KEY = process.env.API_KEY?.trim();
const configuredHost = process.env.HOST || (process.env.DOCKER_CONTAINER ? '0.0.0.0' : '127.0.0.1');
const exposedBeyondLocalhost = configuredHost !== '127.0.0.1' && configuredHost !== 'localhost';
if (!API_KEY && exposedBeyondLocalhost) {
  console.warn(
    '[Segurança] API_KEY não definida e HOST não está restrito a localhost. ' +
      'Qualquer pessoa na rede pode controlar este painel sem autenticação. Defina API_KEY no .env.'
  );
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
const windowsService = new WindowsService(configService, karafService);
const gitAzureService = new GitAzureService(configService, karafService);
const routinesService = new RoutinesService(configService);
const docsIndexService = new DocsIndexService(configService, gitAzureService);

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
    appVersion: '1.0.0',
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
    configPath: (configService as any).configPath || '',
    isAdmin
  });
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
    broadcastWs('karaf:stdout', chunk);
  });
  res.json({ success: started });
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
  res.json(result);
});

app.post('/api/karaf/run-maven-build', async (req, res) => {
  const { projectPath, skipTests } = req.body as { projectPath: string; skipTests?: boolean };
  if (!isSafeLocalPath(projectPath)) {
    return res.status(400).json({ code: 1, stdout: '', stderr: 'Caminho de projeto inválido.' });
  }
  const result = await karafService.runMavenBuild(projectPath, skipTests !== false, (chunk) => {
    broadcastWs('karaf:log-chunk', chunk);
  });
  res.json(result);
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
  res.json({ url: await gitAzureService.buildAzurePrUrl(projectPath, targetBranch) });
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

app.post('/api/routines/launch', (req, res) => {
  const { fullPath } = req.body;
  if (!fullPath || typeof fullPath !== 'string' || !isSafeLocalPath(fullPath)) {
    return res.status(400).json({ success: false, error: 'Caminho inválido.' });
  }
  res.json({ success: routinesService.launchRoutine(fullPath) });
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
  const projectName = req.query.projectName as string | undefined;
  const topK = req.query.topK ? Number(req.query.topK) : undefined;
  if (!query.trim()) {
    return res.status(400).json({ error: 'Parâmetro query é obrigatório.' });
  }
  res.json(await docsIndexService.search(query, { projectName, topK }));
});

app.get('/api/docs/status', (_req, res) => {
  res.json(docsIndexService.getStatus());
});

// 7. Configurações
app.get('/api/settings', (_req, res) => {
  res.json(configService.getSettings());
});

app.post('/api/settings', (req, res) => {
  const candidate = req.body || {};
  const pathKeys: (keyof AppSettings)[] = ['appPath', 'karafPath', 'intellijPath', 'projectsPath'];
  for (const key of pathKeys) {
    if (candidate[key] && typeof candidate[key] === 'string') {
      if (!isSafeLocalPath(candidate[key])) {
        return res.status(400).json({ error: `Caminho inválido ou remoto não permitido para o campo ${key}.` });
      }
    }
  }
  res.json(configService.saveSettings(candidate));
});

// 7. Utilitários Shell
app.post('/api/shell/open', (req, res) => {
  const { url } = req.body;
  if (!isSafeUrl(url)) {
    return res.status(400).json({ error: 'URL insegura ou não permitida.' });
  }
  res.json({ success: true, url });
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
