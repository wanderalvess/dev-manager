import type { Express, Request, Response } from 'express';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { state, saveSettingsToDisk } from './state';
import { executeInMemorySql } from './sqlEngine';
import { registerTerminalRoutes } from './terminalRoutes';
import type { DocSearchResult, GitCommitInfo, GitFileStatus, GitProjectInfo } from '../src/shared/types';

const execFileAsync = promisify(execFile);

let prevCpuInfo = os.cpus();

function computeCpuPercent(): number {
  const cpus = os.cpus();
  let idleDiff = 0;
  let totalDiff = 0;
  for (let i = 0; i < cpus.length; i++) {
    const a = prevCpuInfo[i]?.times;
    const b = cpus[i]?.times;
    if (!a || !b) continue;
    const prevTotal = a.user + a.nice + a.sys + a.idle + a.irq;
    const currTotal = b.user + b.nice + b.sys + b.idle + b.irq;
    idleDiff += b.idle - a.idle;
    totalDiff += currTotal - prevTotal;
  }
  prevCpuInfo = cpus;
  if (totalDiff <= 0) return 12;
  return Math.max(1, Math.min(100, Math.round((1 - idleDiff / totalDiff) * 100)));
}

function checkPortOpen(port: number, timeoutMs = 250): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, timeoutMs);
    socket.on('connect', () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

function collectMarkdownFiles(rootDir: string): string[] {
  const results: string[] = [];
  const skip = new Set(['node_modules', '.git', 'dist', 'dist-electron', 'release']);
  function walk(dir: string, depth: number) {
    if (depth > 4) return;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (skip.has(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, depth + 1);
      else if (e.isFile() && /\.(md|txt)$/i.test(e.name)) results.push(full);
    }
  }
  walk(rootDir, 0);
  return results;
}

export function registerApiRoutes(app: Express, broadcast: (channel: string, payload: any) => void): void {
  registerTerminalRoutes(app, broadcast);
  const pkgPath = path.resolve(process.cwd(), 'package.json');
  let appVersion = '1.68.1';
  try {
    appVersion = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version || appVersion;
  } catch {
    // keep default
  }

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'hub-manager', version: appVersion });
  });

  app.get('/api/system/info', (_req: Request, res: Response) => {
    res.json({
      appName: 'Hub Manager',
      appVersion,
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      mode: 'web',
      configPath: '/tmp/hub-manager-config.json',
      uptimeSeconds: Math.floor(process.uptime())
    });
  });

  app.get('/api/system/changelog', (_req: Request, res: Response) => {
    try {
      const content = fs.readFileSync(path.resolve(process.cwd(), 'CHANGELOG.md'), 'utf8');
      res.json({ content });
    } catch {
      res.json({ content: `# v${appVersion}\n\n- Hub Manager Cockpit rodando em modo Web.` });
    }
  });

  app.get('/api/system/mcp-docs', (_req: Request, res: Response) => {
    try {
      const content = fs.readFileSync(path.resolve(process.cwd(), 'docs/MCP_TOOLS.md'), 'utf8');
      res.json({ content });
    } catch {
      res.json({ content: '# MCP Tools\n\nCatálogo MCP disponível.' });
    }
  });

  app.get('/api/system/metrics', (_req: Request, res: Response) => {
    const totalMemMb = Math.round(os.totalmem() / (1024 * 1024));
    const freeMemMb = Math.round(os.freemem() / (1024 * 1024));
    const usedMemMb = totalMemMb - freeMemMb;
    const memUsagePercent = Math.round((usedMemMb / Math.max(1, totalMemMb)) * 100);
    res.json({
      cpuUsagePercent: computeCpuPercent(),
      totalMemMb,
      usedMemMb,
      memUsagePercent,
      totalMemoryMb: totalMemMb,
      usedMemoryMb: usedMemMb,
      memoryUsagePercent: memUsagePercent,
      uptimeSeconds: Math.floor(os.uptime()),
      loadAvg: os.loadavg()
    });
  });

  app.get('/api/network/ips', (_req: Request, res: Response) => {
    const ifaces = os.networkInterfaces();
    const list: Array<{ name: string; address: string; family: string }> = [];
    let primaryLocalIp = '127.0.0.1';
    for (const [name, entries] of Object.entries(ifaces)) {
      for (const entry of entries || []) {
        if (entry.family === 'IPv4' && !entry.internal) {
          list.push({ name, address: entry.address, family: 'IPv4' });
          if (primaryLocalIp === '127.0.0.1') primaryLocalIp = entry.address;
        }
      }
    }
    res.json({ primaryLocalIp, wslIp: null, interfaces: list });
  });

  // Settings
  app.get('/api/settings', (_req: Request, res: Response) => {
    res.json(state.settings);
  });

  app.put('/api/settings', (req: Request, res: Response) => {
    state.settings = { ...state.settings, ...req.body };
    saveSettingsToDisk(state.settings);
    res.json(state.settings);
  });

  // Environment: Services, Processes, Ports, Pipeline
  app.get('/api/env/services', (_req: Request, res: Response) => {
    res.json(state.services);
  });

  app.post('/api/env/services/:name/:action', (req: Request, res: Response) => {
    const { name, action } = req.params;
    const svc = state.services.find((s) => s.name === name);
    if (!svc) return res.status(404).json({ ok: false, error: 'Serviço não encontrado' });
    svc.status = action === 'start' ? 'Running' : 'Stopped';
    svc.pid = action === 'start' ? Math.floor(3000 + Math.random() * 6000) : undefined;
    broadcast('env:log', {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Serviço ${svc.displayName} ${action === 'start' ? 'iniciado' : 'parado'}.`,
      source: 'env'
    });
    res.json({ ok: true, service: svc });
  });

  app.get('/api/env/processes', (_req: Request, res: Response) => {
    res.json(state.processes);
  });

  app.post('/api/env/processes/kill', (req: Request, res: Response) => {
    const names: string[] = Array.isArray(req.body?.names) ? req.body.names : [];
    const results: Record<string, boolean> = {};
    for (const p of state.processes) {
      if (names.includes(p.name)) {
        p.running = false;
        p.pid = undefined;
        results[p.name] = true;
      }
    }
    res.json(results);
  });

  app.get('/api/env/ports', async (_req: Request, res: Response) => {
    const port3000Open = await checkPortOpen(3000);
    const updated = state.ports.map((p) => (p.port === 3000 ? { ...p, inUse: port3000Open } : p));
    res.json(updated);
  });

  app.post('/api/env/run-profile', async (req: Request, res: Response) => {
    const profile = req.body?.profile || state.settings.automationProfiles[0];
    const logs = [];
    for (let i = 0; i < profile.steps.length; i++) {
      const step = profile.steps[i];
      if (!step.enabled) continue;
      const entry = {
        timestamp: new Date().toISOString(),
        level: 'success' as const,
        message: `[${i + 1}/${profile.steps.length}] Executado: ${step.name}`,
        source: 'pipeline'
      };
      logs.push(entry);
      broadcast('env:log', entry);
      broadcast('env:profile-progress', { stepIndex: i, totalSteps: profile.steps.length, step });
    }
    state.karafRunning = true;
    res.json({ success: true, logs, durationMs: 420 });
  });

  // Karaf Console & OSGi
  app.get('/api/karaf/status', (_req: Request, res: Response) => {
    res.json({ running: state.karafRunning, logs: state.karafLogs });
  });

  app.post('/api/karaf/start', (_req: Request, res: Response) => {
    state.karafRunning = true;
    const line = `[INFO] ${new Date().toLocaleTimeString()} Apache Karaf embedded iniciado em :8101 (debug :5005)`;
    state.karafLogs.push(line);
    broadcast('karaf:stdout', line + '\n');
    res.json({ success: true });
  });

  app.post('/api/karaf/stop', (_req: Request, res: Response) => {
    state.karafRunning = false;
    const line = `[WARN] ${new Date().toLocaleTimeString()} Apache Karaf embedded encerrado.`;
    state.karafLogs.push(line);
    broadcast('karaf:stdout', line + '\n');
    res.json({ success: true });
  });

  app.post('/api/karaf/command', (req: Request, res: Response) => {
    const raw = String(req.body?.command || '').trim();
    if (!raw) return res.json({ success: true, output: '' });
    let output = '';
    const lower = raw.toLowerCase();
    if (lower === 'la' || lower.startsWith('bundle:list')) {
      const header = 'ID  │ State    │ Lvl │ Version        │ Name\n────┼──────────┼─────┼────────────────┼─────────────────────────────────';
      const rows = state.bundles.map(
        (b) => `${b.id.padEnd(3)} │ ${b.state.padEnd(8)} │ ${String(b.level).padEnd(3)} │ ${b.version.padEnd(14)} │ ${b.name}`
      );
      output = `${header}\n${rows.join('\n')}`;
    } else if (lower.startsWith('feature:list')) {
      output = state.features.map((f) => `${f.name.padEnd(20)} │ ${f.version.padEnd(10)} │ ${f.status}`).join('\n');
    } else if (lower.startsWith('log:display') || lower.startsWith('log:tail')) {
      output = state.logLines.map((l) => `${l.timestamp} | ${l.level.padEnd(5)} | ${l.logger} - ${l.message}`).join('\n');
    } else if (lower === 'system:version') {
      output = 'Apache Karaf 4.4.3 (JVM OpenJDK 17.0.10)';
    } else if (lower.startsWith('bundle:restart') || lower.startsWith('bundle:start') || lower.startsWith('bundle:stop')) {
      const parts = raw.split(/\s+/);
      const id = parts[1];
      const bundle = state.bundles.find((b) => b.id === id || b.symbolicName === id);
      if (bundle) {
        bundle.state = lower.startsWith('bundle:stop') ? 'Resolved' : 'Active';
        output = `Bundle ${bundle.id} (${bundle.name}) -> ${bundle.state}`;
      } else {
        output = `Bundle "${id || ''}" não encontrado.`;
      }
    } else if (lower === 'help') {
      output = 'Comandos disponíveis: bundle:list, la, bundle:start <id>, bundle:stop <id>, bundle:restart <id>, feature:list, log:display, system:version';
    } else {
      output = `karaf@root()> ${raw}\nComando executado com sucesso (exit 0).`;
    }
    const chunk = `karaf@root()> ${raw}\n${output}\n`;
    state.karafLogs.push(...chunk.trimEnd().split('\n'));
    if (req.body?.stream !== false) {
      broadcast('karaf:stdout', chunk);
    }
    res.json({ success: true, output });
  });

  app.get('/api/karaf/bundles', (_req: Request, res: Response) => {
    res.json(state.bundles);
  });

  app.post('/api/karaf/bundles/:id/:action', (req: Request, res: Response) => {
    const { id, action } = req.params;
    const bundle = state.bundles.find((b) => b.id === id);
    if (!bundle) return res.status(404).json({ success: false, output: 'Bundle não encontrado' });
    if (action === 'stop') bundle.state = 'Resolved';
    else if (action === 'start' || action === 'restart' || action === 'resolve' || action === 'refresh') bundle.state = 'Active';
    else if (action === 'uninstall') state.bundles = state.bundles.filter((b) => b.id !== id);
    res.json({ success: true, output: `Ação ${action} aplicada ao bundle ${bundle.name} (${bundle.id}).` });
  });

  app.get('/api/karaf/features', (_req: Request, res: Response) => {
    res.json(state.features);
  });

  // Database Studio
  app.get('/api/db/connections', (_req: Request, res: Response) => {
    res.json(state.settings.databaseConnections);
  });

  app.post('/api/db/test', (req: Request, res: Response) => {
    const conn = req.body;
    res.json({
      success: true,
      message: `Conectado ao sandbox ${conn?.vendor || 'oracle'} (${conn?.host || 'localhost'}:${conn?.port || 1521})`,
      version: conn?.vendor === 'postgres' ? 'PostgreSQL 16.2' : conn?.vendor === 'mysql' ? 'MySQL 8.0.36' : 'Oracle Database 19c XE'
    });
  });

  app.get('/api/db/tables', (_req: Request, res: Response) => {
    const tables = Object.entries(state.sqlTables).map(([name, rows]) => ({
      name,
      type: 'TABLE',
      schema: 'WINTHOR',
      rowCount: rows.length
    }));
    res.json({ tables });
  });

  app.get('/api/db/columns/:tableName', (req: Request, res: Response) => {
    const tbl = req.params.tableName.toUpperCase();
    const rows = state.sqlTables[tbl] || [];
    const sample = rows[0] || {};
    const columns = Object.keys(sample).map((name, idx) => ({
      name,
      dataType: typeof sample[name] === 'number' ? 'NUMBER(12,2)' : 'VARCHAR2(120)',
      nullable: idx !== 0,
      isPrimaryKey: idx === 0
    }));
    res.json({ tableName: tbl, columns });
  });

  app.post('/api/db/execute', (req: Request, res: Response) => {
    const { sql, maxRows, binds, connectionName } = req.body || {};
    const result = executeInMemorySql(String(sql || ''), maxRows || 500, binds);
    state.sqlHistory.unshift({
      id: `q-${Date.now()}`,
      connectionName: connectionName || 'WinThor Dev (Oracle XE)',
      sql: String(sql || '').trim(),
      executionTimeMs: result.executionTimeMs,
      rowCount: result.rowCount,
      timestamp: new Date().toISOString(),
      success: result.success
    });
    state.sqlHistory = state.sqlHistory.slice(0, 50);
    res.json(result);
  });

  app.get('/api/db/history', (_req: Request, res: Response) => {
    res.json(state.sqlHistory);
  });

  app.get('/api/db/backups', (_req: Request, res: Response) => {
    res.json({ files: state.backups, history: state.backupHistory, configs: state.settings.backupConfigs, webhooks: state.settings.backupWebhooks });
  });

  app.post('/api/db/backups/run', (req: Request, res: Response) => {
    const connId = req.body?.connectionId || 'conn-oracle-dev';
    const conn = state.settings.databaseConnections.find((c: { id: string }) => c.id === connId) || state.settings.databaseConnections[0];
    const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15);
    const fileName = `${conn.database.toLowerCase()}_${stamp}.dmp`;
    const filePath = `/workspace/backups/${fileName}`;
    const sizeBytes = 142_000_000 + Math.floor(Math.random() * 50_000_000);
    const sha256 = crypto.createHash('sha256').update(fileName + Date.now()).digest('hex');
    const output = `[expdp] Conectando em ${conn.user}@${conn.host}:${conn.port}/${conn.database}\n[expdp] Exportando tabelas PCPEDC, PCPRODUT, PCFILIAL...\n[expdp] Arquivo gerado: ${filePath} (${(sizeBytes / 1048576).toFixed(1)} MB)\n[sha256] ${sha256}`;
    state.backups.unshift({ fileName, filePath, sizeBytes, createdAt: new Date().toISOString(), sha256 });
    state.backupHistory.unshift({
      id: `bh-${Date.now()}`,
      connectionId: conn.id,
      connectionName: conn.name,
      status: 'success',
      startedAt: new Date().toISOString(),
      durationMs: 2450,
      fileName,
      sizeBytes,
      output
    });
    res.json({ success: true, filePath, fileName, sizeBytes, sha256, durationMs: 2450, output });
  });

  // Containers
  app.get('/api/containers/status', (_req: Request, res: Response) => {
    res.json({ available: true, engine: 'simulated', version: 'Docker 27.1.1 (Cockpit Sandbox)', wslDistro: 'Ubuntu-22.04' });
  });

  app.get('/api/containers/list', (_req: Request, res: Response) => {
    res.json(state.containers);
  });

  app.get('/api/containers/stats', (_req: Request, res: Response) => {
    const stats = state.containers.map((c) => ({
      id: c.id,
      name: c.name,
      cpuPercent: c.state === 'running' ? Number((2 + Math.random() * 14).toFixed(1)) : 0,
      memUsageMb: c.state === 'running' ? (c.name.includes('oracle') ? 1480 : 620) : 0,
      memLimitMb: 4096,
      memPercent: c.state === 'running' ? (c.name.includes('oracle') ? 36 : 15) : 0,
      netIo: c.state === 'running' ? '14.2MB / 8.7MB' : '0B / 0B'
    }));
    res.json(stats);
  });

  app.post('/api/containers/:id/:action', (req: Request, res: Response) => {
    const { id, action } = req.params;
    const c = state.containers.find((item) => item.id === id);
    if (!c) return res.status(404).json({ ok: false });
    if (action === 'start' || action === 'restart' || action === 'unpause') {
      c.state = 'running';
      c.status = 'Up just now';
    } else if (action === 'stop') {
      c.state = 'exited';
      c.status = 'Exited (0) just now';
    } else if (action === 'pause') {
      c.state = 'paused';
      c.status = 'Paused';
    } else if (action === 'remove') {
      state.containers = state.containers.filter((item) => item.id !== id);
    }
    res.json({ ok: true, container: c });
  });

  // Git & DevOps (reads real workspace git if available)
  app.get('/api/git/projects', async (_req: Request, res: Response) => {
    const cwd = process.cwd();
    const hasGit = fs.existsSync(path.join(cwd, '.git'));
    let branch = 'main';
    let uncommittedCount = 0;
    if (hasGit) {
      try {
        const b = await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd });
        branch = b.stdout.trim() || 'main';
        const s = await execFileAsync('git', ['status', '--porcelain'], { cwd });
        uncommittedCount = s.stdout.split('\n').filter(Boolean).length;
      } catch {
        // fallback
      }
    }
    const projects: GitProjectInfo[] = [
      {
        name: 'hub-manager (workspace atual)',
        path: cwd,
        branch,
        remoteUrl: 'https://github.com/wanderalvess/dev-manager',
        dirty: uncommittedCount > 0,
        uncommittedCount,
        unpushedCount: 0,
        isKarafBundle: false
      },
      {
        name: 'wta-core-services',
        path: '/workspace/projects/wta-core-services',
        branch: 'feature/WTA-4821-otimizacao-fiscal',
        remoteUrl: 'https://dev.azure.com/pcinformatica/WinThor/_git/wta-core-services',
        dirty: true,
        uncommittedCount: 3,
        unpushedCount: 1,
        isKarafBundle: true,
        mavenArtifactId: 'wta-core',
        mavenVersion: '2.48.0-SNAPSHOT'
      },
      {
        name: 'wsh-pdvsync-connector',
        path: '/workspace/projects/wsh-pdvsync-connector',
        branch: 'develop',
        remoteUrl: 'https://dev.azure.com/pcinformatica/WinThor/_git/wsh-pdvsync-connector',
        dirty: false,
        uncommittedCount: 0,
        unpushedCount: 0,
        isKarafBundle: true,
        mavenArtifactId: 'wsh-pdvsync',
        mavenVersion: '1.8.2'
      }
    ];
    res.json(projects);
  });

  app.get('/api/git/details', async (req: Request, res: Response) => {
    const projectPath = String(req.query.path || process.cwd());
    if (projectPath === process.cwd() && fs.existsSync(path.join(projectPath, '.git'))) {
      try {
        const logRes = await execFileAsync('git', ['log', '-n', '12', '--pretty=format:%H|%h|%an|%ad|%s', '--date=short'], { cwd: projectPath });
        const commits: GitCommitInfo[] = logRes.stdout
          .split('\n')
          .filter(Boolean)
          .map((line) => {
            const [hash, shortHash, author, date, ...rest] = line.split('|');
            return { hash, shortHash, author, date, message: rest.join('|') };
          });
        const statusRes = await execFileAsync('git', ['status', '--porcelain'], { cwd: projectPath });
        const files: GitFileStatus[] = statusRes.stdout
          .split('\n')
          .filter(Boolean)
          .map((line) => ({
            status: line.slice(0, 2).trim() || 'M',
            staged: line[0] !== ' ' && line[0] !== '?',
            path: line.slice(3).trim()
          }));
        return res.json({ commits, files });
      } catch {
        // fallback below
      }
    }
    res.json({
      commits: [
        { hash: 'a91f3c2d8810', shortHash: 'a91f3c2', author: 'Wanderson Alves', date: '2026-11-12', message: 'feat(fiscal): ajusta contingência offline NFC-e no WTA' },
        { hash: 'b82d4a1e7720', shortHash: 'b82d4a1', author: 'Equipe WTA', date: '2026-11-10', message: 'fix(karaf): corrige import-package org.osgi.framework' },
        { hash: 'c73e5b9f6630', shortHash: 'c73e5b9', author: 'Equipe QA', date: '2026-11-08', message: 'test(regressivo): adiciona cenário de pré-venda TV7/TV8' }
      ],
      files: [
        { status: 'M', staged: false, path: 'src/main/java/br/com/pcinformatica/wta/fiscal/NfceService.java' },
        { status: 'M', staged: true, path: 'pom.xml' },
        { status: '??', staged: false, path: 'src/test/java/br/com/pcinformatica/wta/fiscal/NfceServiceTest.java' }
      ]
    });
  });

  // Docs Search over real workspace markdown files
  app.get('/api/docs/status', (_req: Request, res: Response) => {
    const files = collectMarkdownFiles(process.cwd());
    res.json({ indexed: true, totalFiles: files.length, totalChunks: files.length * 6, lastIndexedAt: new Date().toISOString(), indexing: false });
  });

  app.get('/api/docs/search', (req: Request, res: Response) => {
    const q = String(req.query.q || '').trim().toLowerCase();
    const files = collectMarkdownFiles(process.cwd());
    const results: DocSearchResult[] = [];
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const rel = path.relative(process.cwd(), file);
        const lines = content.split('\n');
        const heading = lines.find((l) => l.startsWith('#'))?.replace(/^#+\s*/, '') || path.basename(file);
        if (!q) {
          results.push({ id: rel, title: heading, path: rel, source: 'Workspace Docs', score: 1, snippet: lines.slice(0, 4).join('\n') });
          continue;
        }
        const idx = content.toLowerCase().indexOf(q);
        if (idx !== -1 || rel.toLowerCase().includes(q)) {
          const lineIdx = idx !== -1 ? content.slice(0, idx).split('\n').length - 1 : 0;
          const snippet = lines.slice(Math.max(0, lineIdx - 1), lineIdx + 4).join('\n');
          results.push({ id: rel, title: heading, path: rel, source: 'Workspace Docs', score: idx !== -1 ? 0.94 : 0.72, snippet, lineStart: lineIdx + 1 });
        }
      } catch {
        // skip unreadable
      }
    }
    res.json(results.slice(0, 20));
  });

  app.get('/api/docs/read', (req: Request, res: Response) => {
    const rel = String(req.query.path || '');
    const full = path.resolve(process.cwd(), rel);
    if (!full.startsWith(process.cwd())) return res.status(403).json({ error: 'Acesso negado' });
    try {
      res.json({ content: fs.readFileSync(full, 'utf8') });
    } catch {
      res.status(404).json({ error: 'Arquivo não encontrado' });
    }
  });

  // Real HTTP Probe Proxy for API Studio
  app.post('/api/http/probe', async (req: Request, res: Response) => {
    const { method = 'GET', url, headers = {}, body, timeoutMs = 15000 } = req.body || {};
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ ok: false, status: 0, statusText: 'Bad Request', latencyMs: 0, sizeBytes: 0, headers: {}, body: '', error: 'URL obrigatória' });
    }
    const start = Date.now();
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      const init: RequestInit = { method: method.toUpperCase(), headers, signal: ctrl.signal };
      if (!['GET', 'HEAD'].includes(method.toUpperCase()) && body !== undefined && body !== '') {
        init.body = typeof body === 'string' ? body : JSON.stringify(body);
      }
      const response = await fetch(url, init);
      clearTimeout(timer);
      const text = await response.text();
      const respHeaders: Record<string, string> = {};
      response.headers.forEach((v, k) => { respHeaders[k] = v; });
      res.json({
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        latencyMs: Date.now() - start,
        sizeBytes: Buffer.byteLength(text, 'utf8'),
        headers: respHeaders,
        body: text
      });
    } catch (err: any) {
      res.json({
        ok: false,
        status: 0,
        statusText: 'Network Error',
        latencyMs: Date.now() - start,
        sizeBytes: 0,
        headers: {},
        body: '',
        error: err?.message || 'Falha ao executar requisição'
      });
    }
  });

  // Logs & APM & Integration & Routines & Quality
  app.get('/api/logs/lines', (_req: Request, res: Response) => {
    res.json({ sources: state.settings.logSources, lines: state.logLines });
  });

  app.get('/api/apm/overview', (_req: Request, res: Response) => {
    const total = state.traces.length;
    const errors = state.traces.filter((t) => t.errorCount > 0).length;
    const durations = state.traces.map((t) => t.durationMs).sort((a, b) => a - b);
    const avg = total ? Math.round(durations.reduce((a, b) => a + b, 0) / total) : 0;
    const p95 = durations[Math.max(0, Math.floor(durations.length * 0.95) - 1)] || 0;
    res.json({
      overview: {
        totalTraces: total,
        errorRatePercent: total ? Math.round((errors / total) * 100) : 0,
        p95DurationMs: p95,
        avgDurationMs: avg,
        activeServices: new Set(state.traces.map((t) => t.rootService)).size
      },
      traces: state.traces
    });
  });

  app.get('/api/routines', (_req: Request, res: Response) => {
    res.json(state.routines);
  });

  app.post('/api/routines/:id/favorite', (req: Request, res: Response) => {
    const r = state.routines.find((item) => item.id === req.params.id);
    if (r) r.isFavorite = !r.isFavorite;
    res.json(state.routines);
  });
}
