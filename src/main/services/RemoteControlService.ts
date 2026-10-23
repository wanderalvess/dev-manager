import http from 'http';
import crypto from 'crypto';
import os from 'os';
import QRCode from 'qrcode';
import {
  EMPTY_REMOTE_STATUS,
  REMOTE_ACTIONS,
  isAllowedHostHeader,
  isPrivateAddress,
  parseRemoteAction,
  type RemoteActionRequest,
  type RemoteControlStatus
} from '../../shared/remoteControl';
import { REMOTE_PAGE_FILES } from './remoteControl/page';

export interface RemoteActionResult {
  ok: boolean;
  message: string;
}

/** O que o celular enxerga e pode fazer; a implementação real fica em `remoteControl/remoteBackend.ts`. */
export interface RemoteBackend {
  getEnvironment(): Promise<unknown>;
  getContainers(): Promise<unknown>;
  getLists(): unknown;
  readLog(maxChars: number): string;
  run(request: RemoteActionRequest): Promise<RemoteActionResult>;
}

export interface RemoteTask {
  name: string;
  startedAt: number;
  endedAt?: number;
  ok?: boolean;
  message?: string;
}

const DEFAULT_PORT = 47822;
const MAX_BODY_BYTES = 4096;
const MAX_LOG_CHARS = 60_000;

/** `Origin: null` ou malformado vira `null` (e portanto recusado), em vez de estourar como erro 500. */
function originHost(origin: string): string | null {
  try {
    return new URL(origin).host;
  } catch {
    return null;
  }
}

export function isConstantTimeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/**
 * Servidor HTTP na rede local para o celular controlar o app pelo navegador (sem instalar nada).
 * Só existe no processo do Electron: depende da janela e do firewall do PC, então não passa pelo
 * server web nem pelo MCP. A chave vai no caminho (`/<chave>/...`) e muda a cada vez que liga.
 */
export class RemoteControlService {
  private server: http.Server | null = null;
  private key = '';
  private port = 0;
  private task: RemoteTask | null = null;
  private status: RemoteControlStatus = { ...EMPTY_REMOTE_STATUS, supported: true };

  /** `bindHost` só muda nos testes (127.0.0.1 evita o aviso do firewall do Windows). */
  constructor(
    private readonly backend: RemoteBackend,
    private readonly bindHost = '0.0.0.0'
  ) {}

  public getStatus(): RemoteControlStatus {
    return this.status;
  }

  public getKey(): string {
    return this.key;
  }

  public async start(preferredPort = DEFAULT_PORT): Promise<RemoteControlStatus> {
    if (this.server) return this.status;
    this.key = crypto.randomBytes(18).toString('base64url');
    const server = http.createServer((req, res) => void this.handle(req, res));
    try {
      this.port = await this.listen(server, preferredPort);
    } catch {
      this.port = await this.listen(server, 0);
    }
    this.server = server;
    this.status = await this.buildStatus();
    return this.status;
  }

  public async stop(): Promise<RemoteControlStatus> {
    const server = this.server;
    this.server = null;
    this.key = '';
    this.status = { ...EMPTY_REMOTE_STATUS, supported: true };
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections();
      });
    }
    return this.status;
  }

  /** Gera outra chave: QR antigo (print, foto) deixa de funcionar. */
  public async regenerateKey(): Promise<RemoteControlStatus> {
    if (!this.server) return this.status;
    this.key = crypto.randomBytes(18).toString('base64url');
    this.status = await this.buildStatus();
    return this.status;
  }

  private listen(server: http.Server, port: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const onError = (err: Error) => reject(err);
      server.once('error', onError);
      server.listen(port, this.bindHost, () => {
        server.off('error', onError);
        resolve((server.address() as { port: number }).port);
      });
    });
  }

  private async buildStatus(): Promise<RemoteControlStatus> {
    const urls = this.listAddresses().map((ip) => `http://${ip}:${this.port}/${this.key}/`);
    const qrDataUrl = urls[0] ? await QRCode.toDataURL(urls[0], { margin: 1, width: 280 }) : undefined;
    return { supported: true, running: true, port: this.port, urls, qrDataUrl };
  }

  private listAddresses(): string[] {
    if (this.bindHost !== '0.0.0.0') return [this.bindHost];
    const found: string[] = [];
    for (const infos of Object.values(os.networkInterfaces())) {
      for (const info of infos ?? []) {
        if (info.family === 'IPv4' && !info.internal && isPrivateAddress(info.address)) found.push(info.address);
      }
    }
    // 192.168/10 (Wi-Fi de casa/escritório) antes de 100.x (Tailscale) e do restante.
    const rank = (ip: string) => (ip.startsWith('192.168.') ? 0 : ip.startsWith('10.') ? 1 : 2);
    return found.sort((a, b) => rank(a) - rank(b));
  }

  private send(res: http.ServerResponse, code: number, body: string | Buffer, type = 'application/json; charset=utf-8'): void {
    res.writeHead(code, {
      'Content-Type': type,
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; frame-ancestors 'none'"
    });
    res.end(body);
  }

  private sendJson(res: http.ServerResponse, code: number, data: unknown): void {
    this.send(res, code, JSON.stringify(data));
  }

  private async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      if (!isPrivateAddress(req.socket.remoteAddress) || !isAllowedHostHeader(req.headers.host)) {
        return this.send(res, 403, 'Acesso negado.', 'text/plain; charset=utf-8');
      }
      const url = new URL(req.url ?? '/', 'http://local');
      const [first, ...rest] = url.pathname.split('/').filter(Boolean);
      if (!this.key || !first || !isConstantTimeEqual(first, this.key)) {
        return this.send(res, 404, 'Não encontrado.', 'text/plain; charset=utf-8');
      }
      const route = rest.join('/');
      if (req.method === 'GET') return await this.handleGet(route, url, res);
      if (req.method === 'POST' && route === 'api/acao') return await this.handleAction(req, res);
      this.send(res, 405, 'Método não permitido.', 'text/plain; charset=utf-8');
    } catch (err) {
      console.warn('[RemoteControlService] Falha ao atender pedido:', err);
      if (!res.headersSent) this.sendJson(res, 500, { error: 'Falha interna.' });
    }
  }

  private async handleGet(route: string, url: URL, res: http.ServerResponse): Promise<void> {
    const file = REMOTE_PAGE_FILES[route === '' ? 'index.html' : route];
    if (file) return this.send(res, 200, file.content, file.type);
    if (route === 'api/ambiente') return this.sendJson(res, 200, { env: await this.backend.getEnvironment(), task: this.task });
    if (route === 'api/containers') return this.sendJson(res, 200, await this.backend.getContainers());
    if (route === 'api/listas') return this.sendJson(res, 200, this.backend.getLists());
    if (route === 'api/log') {
      const asked = Number(url.searchParams.get('chars'));
      const chars = Number.isFinite(asked) && asked > 0 ? Math.min(Math.floor(asked), MAX_LOG_CHARS) : 8000;
      return this.sendJson(res, 200, { output: this.backend.readLog(chars) });
    }
    this.send(res, 404, 'Não encontrado.', 'text/plain; charset=utf-8');
  }

  private readBody(req: http.IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let size = 0;
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) {
          reject(new Error('Corpo grande demais.'));
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });
      req.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch {
          reject(new Error('JSON inválido.'));
        }
      });
      req.on('error', reject);
    });
  }

  private async handleAction(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    // Contra CSRF: um site aberto no celular não consegue disparar ação (e nem conhece a chave).
    const origin = req.headers.origin;
    if (origin && originHost(origin) !== req.headers.host) return this.sendJson(res, 403, { error: 'Origem não permitida.' });
    if (!String(req.headers['content-type'] ?? '').startsWith('application/json')) {
      return this.sendJson(res, 415, { error: 'Use application/json.' });
    }
    let body: unknown;
    try {
      body = await this.readBody(req);
    } catch (err) {
      return this.sendJson(res, 400, { error: (err as Error).message });
    }
    const parsed = parseRemoteAction(body);
    if (!parsed.ok) return this.sendJson(res, 400, { error: parsed.error });
    const { request } = parsed;
    const def = REMOTE_ACTIONS[request.action];
    if (this.task && !this.task.endedAt) return this.sendJson(res, 409, { error: `Já em andamento: ${this.task.name}.` });

    if (!def.background) {
      const result = await this.backend.run(request);
      return this.sendJson(res, result.ok ? 200 : 422, result);
    }
    const task: RemoteTask = { name: request.action, startedAt: Date.now() };
    this.task = task;
    void this.backend
      .run(request)
      .then((r) => Object.assign(task, { ok: r.ok, message: r.message }))
      .catch((err: Error) => Object.assign(task, { ok: false, message: err.message }))
      .finally(() => {
        task.endedAt = Date.now();
      });
    this.sendJson(res, 202, { ok: true, message: 'Em andamento.' });
  }
}
