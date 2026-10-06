import crypto from 'crypto';
import type { ErrorRequestHandler, Express, NextFunction, Request, RequestHandler, Response } from 'express';

/** Comparação em tempo constante: `===` vaza, pelo tempo de resposta, quantos caracteres da chave estavam certos. */
export function isValidApiKey(provided: string | undefined | null, expected: string): boolean {
  if (typeof provided !== 'string' || !expected) return false;
  const hash = (value: string) => crypto.createHash('sha256').update(value).digest();
  return crypto.timingSafeEqual(hash(provided), hash(expected));
}

interface FailureWindow {
  count: number;
  resetAt: number;
}

/**
 * Limita tentativas de API key erradas por origem: passou do limite, a origem fica bloqueada até a janela fechar.
 * O mapa é podado ao crescer para não virar vazamento de memória sob varredura de IPs.
 */
export class ApiKeyFailureLimiter {
  private failures = new Map<string, FailureWindow>();

  constructor(
    private readonly maxFailures = 10,
    private readonly windowMs = 60_000,
    private readonly now: () => number = Date.now
  ) {}

  /** Segundos até poder tentar de novo, ou 0 se a origem não está bloqueada. */
  retryAfterSeconds(source: string): number {
    const entry = this.failures.get(source);
    if (!entry) return 0;
    if (entry.resetAt <= this.now()) {
      this.failures.delete(source);
      return 0;
    }
    return entry.count >= this.maxFailures ? Math.ceil((entry.resetAt - this.now()) / 1000) : 0;
  }

  registerFailure(source: string): void {
    const current = this.now();
    const entry = this.failures.get(source);
    if (!entry || entry.resetAt <= current) {
      if (this.failures.size >= 10_000) this.prune(current);
      this.failures.set(source, { count: 1, resetAt: current + this.windowMs });
      return;
    }
    entry.count += 1;
  }

  registerSuccess(source: string): void {
    this.failures.delete(source);
  }

  private prune(current: number): void {
    for (const [key, entry] of this.failures) {
      if (entry.resetAt <= current) this.failures.delete(key);
    }
    if (this.failures.size >= 10_000) this.failures.clear();
  }
}

/** Middleware de API key para as rotas `/api/*`: comparação em tempo constante e bloqueio por excesso de erros. */
export function createApiKeyMiddleware(apiKey: string | undefined, limiter = new ApiKeyFailureLimiter()): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!apiKey || !req.path.startsWith('/api/')) return next();
    const source = req.ip || req.socket.remoteAddress || 'desconhecido';
    const wait = limiter.retryAfterSeconds(source);
    if (wait > 0) {
      res.setHeader('Retry-After', String(wait));
      res.status(429).json({ error: 'Muitas tentativas com API key inválida. Aguarde antes de tentar de novo.' });
      return;
    }
    if (isValidApiKey(req.header('x-api-key'), apiKey)) {
      limiter.registerSuccess(source);
      return next();
    }
    limiter.registerFailure(source);
    res.status(401).json({ error: 'API key ausente ou inválida. Envie o header x-api-key.' });
  };
}

/**
 * Sem API key só há proteção por estar preso ao localhost, e uma página maliciosa pode apontar um nome de DNS
 * qualquer para 127.0.0.1 (DNS rebinding). Exigir `Host` local fecha esse caminho.
 */
export function createLocalHostGuard(apiKey: string | undefined): RequestHandler {
  const localHosts = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
  return (req: Request, res: Response, next: NextFunction) => {
    if (apiKey || !req.path.startsWith('/api/')) return next();
    const hostname = (req.header('host') || '').replace(/:\d+$/, '').toLowerCase();
    if (localHosts.has(hostname)) return next();
    res.status(403).json({ error: 'Host não permitido: sem API key, a API só responde para localhost.' });
  };
}

/**
 * Express 4 não captura rejeição de handler async: sem try/catch próprio, a requisição fica pendurada e, no Node 15+,
 * o processo cai por unhandledRejection. Embrulha os handlers das rotas para encaminhar o erro ao `next`.
 */
export function wrapAsyncRoutes(app: Express): void {
  const wrap = (handler: unknown): unknown => {
    if (typeof handler !== 'function') return handler;
    const fn = handler as (...args: unknown[]) => unknown;
    // Middleware de erro (4 parâmetros) precisa manter a assinatura
    if (fn.length === 4) return handler;
    return function wrapped(this: unknown, ...args: unknown[]) {
      const next = args[2] as NextFunction;
      try {
        const result = fn.apply(this, args);
        if (result && typeof (result as Promise<unknown>).catch === 'function') {
          (result as Promise<unknown>).catch(next);
        }
      } catch (err) {
        next(err);
      }
    };
  };

  for (const method of ['get', 'post', 'put', 'delete', 'patch'] as const) {
    const original = app[method].bind(app) as (...args: unknown[]) => unknown;
    (app as unknown as Record<string, unknown>)[method] = (...args: unknown[]) => {
      // app.get('chave') com um só argumento lê configuração do Express, não registra rota
      if (method === 'get' && args.length === 1) return original(...args);
      return original(...args.map((arg) => (Array.isArray(arg) ? arg.map(wrap) : wrap(arg))));
    };
  }
}

/** Resposta JSON única para erro que escapou do handler; mensagem interna só no log, nunca para o cliente. */
export const jsonErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  const status = typeof err?.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;
  console.error(`[HTTP] Erro não tratado em ${req.method} ${req.path}:`, err);
  res.status(status).json({ error: status === 500 ? 'Erro interno do servidor.' : String(err?.message || 'Requisição inválida.') });
};
