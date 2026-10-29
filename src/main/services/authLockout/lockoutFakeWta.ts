import fs from 'fs';
import http from 'http';
import type { AddressInfo } from 'net';

/** WTA falso para os testes do AuthLockoutTestService: login, logoff e API de logs com defeitos ligáveis. */
export interface FakeWtaOptions {
  /** 'origin' bloqueia todo mundo quando qualquer conta bloqueia (defeito). */
  lockScope?: 'user' | 'origin';
  /** 'none' conta até um login certo; 'sliding' só as falhas dos últimos 60s; 'fixed' janela de 60s a partir da 1ª falha. */
  windowMode?: 'none' | 'sliding' | 'fixed';
  lockMinutes?: number;
  logoffClears?: boolean;
  logsPassword?: boolean;
  openLogs?: boolean;
}

export const FAKE_WTA_USERS: Record<string, string> = { TESTE_A: 'senhaA', TESTE_B: 'senhaB', ADMIN: 'admin123' };
const WINDOW_MS = 60_000;

export function startFakeWta(logFile: string, options: FakeWtaOptions = {}): Promise<{ server: http.Server; url: string }> {
  const failures = new Map<string, number[]>();
  const windowStart = new Map<string, number>();
  const lockedUntil = new Map<string, number>();
  const tokens = new Set<string>();
  const lockMs = (options.lockMinutes ?? 4) * 60_000;
  const log = (line: string) => fs.appendFileSync(logFile, `${new Date().toISOString()} ${line}\n`);
  const isLocked = (user: string) =>
    options.lockScope === 'origin' ? [...lockedUntil.values()].some((t) => t > Date.now()) : (lockedUntil.get(user) ?? 0) > Date.now();

  const countFailure = (user: string): number => {
    const now = Date.now();
    let list = failures.get(user) ?? [];
    if (options.windowMode === 'sliding') list = list.filter((t) => now - t < WINDOW_MS);
    if (options.windowMode === 'fixed' && now - (windowStart.get(user) ?? 0) >= WINDOW_MS) {
      list = [];
      windowStart.set(user, now);
    }
    list.push(now);
    failures.set(user, list);
    return list.length;
  };

  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const send = (status: number, body: unknown) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(body));
      };
      const url = new URL(req.url ?? '/', 'http://x');
      if (req.method === 'POST' && url.pathname === '/winthor/autenticacao/v1/login') {
        let data: { login?: string; senha?: string };
        try {
          data = JSON.parse(raw);
        } catch {
          return send(400, { message: 'Requisição inválida' });
        }
        const user = String(data.login ?? '');
        if (isLocked(user)) {
          log(`WARN Login recusado: usuario ${user} bloqueado`);
          return send(401, { message: 'Usuário bloqueado por excesso de tentativas' });
        }
        if (FAKE_WTA_USERS[user] && FAKE_WTA_USERS[user] === data.senha) {
          failures.set(user, []);
          const token = `eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoi${user}${tokens.size}.assinatura${tokens.size}xyz`;
          tokens.add(token);
          return send(200, { accessToken: token });
        }
        if (countFailure(user) >= 5) lockedUntil.set(user, Date.now() + lockMs);
        log(`WARN Falha de autenticacao: usuario ${user}${options.logsPassword ? ` senha=${data.senha}` : ''}`);
        return send(401, { message: 'Usuário ou senha inválidos' });
      }
      if (url.pathname === '/winthor/autenticacao/v1/logoff') {
        if (options.logoffClears) lockedUntil.clear();
        res.writeHead(204).end();
        return;
      }
      if (req.method === 'GET' && url.pathname === '/winthor/ferramenta/servidor/v1/logs') {
        const bearer = String(req.headers.authorization ?? '').replace(/^Bearer /, '');
        if (!options.openLogs && !tokens.has(bearer)) return send(401, { message: 'Não autorizado' });
        return send(200, fs.readFileSync(logFile, 'utf-8').split('\n').filter(Boolean));
      }
      send(404, { message: 'Recurso não encontrado' });
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}` }));
  });
}
