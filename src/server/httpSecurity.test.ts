import http from 'http';
import type { AddressInfo } from 'net';
import express from 'express';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ApiKeyFailureLimiter,
  createApiKeyMiddleware,
  createLocalHostGuard,
  isValidApiKey,
  jsonErrorHandler,
  wrapAsyncRoutes
} from './httpSecurity';

describe('isValidApiKey', () => {
  it('aceita só a chave exata', () => {
    expect(isValidApiKey('segredo', 'segredo')).toBe(true);
    expect(isValidApiKey('segredo ', 'segredo')).toBe(false);
    expect(isValidApiKey('SEGREDO', 'segredo')).toBe(false);
    expect(isValidApiKey('', 'segredo')).toBe(false);
    expect(isValidApiKey(undefined, 'segredo')).toBe(false);
    expect(isValidApiKey('segredo', '')).toBe(false);
  });
});

describe('ApiKeyFailureLimiter', () => {
  it('bloqueia depois de N erros e libera quando a janela fecha', () => {
    let t = 1000;
    const limiter = new ApiKeyFailureLimiter(3, 60_000, () => t);
    expect(limiter.retryAfterSeconds('a')).toBe(0);
    limiter.registerFailure('a');
    limiter.registerFailure('a');
    expect(limiter.retryAfterSeconds('a')).toBe(0);
    limiter.registerFailure('a');
    expect(limiter.retryAfterSeconds('a')).toBe(60);
    expect(limiter.retryAfterSeconds('outro')).toBe(0);

    t += 61_000;
    expect(limiter.retryAfterSeconds('a')).toBe(0);
  });

  it('um acerto zera a contagem da origem', () => {
    const limiter = new ApiKeyFailureLimiter(2, 60_000, () => 0);
    limiter.registerFailure('a');
    limiter.registerSuccess('a');
    limiter.registerFailure('a');
    expect(limiter.retryAfterSeconds('a')).toBe(0);
  });
});

describe('middlewares HTTP', () => {
  let current: http.Server | null = null;

  afterEach(async () => {
    await new Promise<void>((resolve) => (current ? current.close(() => resolve()) : resolve()));
    current = null;
  });

  async function start(configure: (app: express.Express) => void): Promise<string> {
    const app = express();
    configure(app);
    current = http.createServer(app);
    await new Promise<void>((resolve) => current!.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${(current!.address() as AddressInfo).port}`;
  }

  it('API key: 401 sem a chave, 200 com ela, 429 depois de muitos erros', async () => {
    const base = await start((app) => {
      app.use(createApiKeyMiddleware('chave-certa', new ApiKeyFailureLimiter(3, 60_000)));
      app.get('/api/ping', (_req, res) => res.json({ ok: true }));
      app.get('/publico', (_req, res) => res.json({ ok: true }));
    });

    expect((await fetch(`${base}/publico`)).status).toBe(200);
    expect((await fetch(`${base}/api/ping`, { headers: { 'x-api-key': 'chave-certa' } })).status).toBe(200);
    for (let i = 0; i < 3; i++) {
      expect((await fetch(`${base}/api/ping`, { headers: { 'x-api-key': 'errada' } })).status).toBe(401);
    }
    const blocked = await fetch(`${base}/api/ping`, { headers: { 'x-api-key': 'chave-certa' } });
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
  });

  it('sem API key, só atende /api/ quando o Host é local (DNS rebinding)', async () => {
    const base = await start((app) => {
      app.use(createLocalHostGuard(undefined));
      app.get('/api/ping', (_req, res) => res.json({ ok: true }));
    });

    expect((await fetch(`${base}/api/ping`)).status).toBe(200);

    // fetch não deixa trocar o Host; usa http.request direto
    const status = await new Promise<number>((resolve, reject) => {
      const req = http.request(`${base}/api/ping`, { headers: { Host: 'evil.example.com' } }, (res) => {
        res.resume();
        resolve(res.statusCode || 0);
      });
      req.on('error', reject);
      req.end();
    });
    expect(status).toBe(403);
  });

  it('com API key o guard de Host não interfere', async () => {
    const base = await start((app) => {
      app.use(createLocalHostGuard('qualquer'));
      app.get('/api/ping', (_req, res) => res.json({ ok: true }));
    });
    expect((await fetch(`${base}/api/ping`)).status).toBe(200);
  });

  it('handler async que lança vira 500 JSON em vez de pendurar a requisição', async () => {
    const base = await start((app) => {
      wrapAsyncRoutes(app);
      app.get('/api/boom', async () => {
        throw new Error('detalhe interno secreto');
      });
      app.post('/api/sync-boom', () => {
        throw new Error('outro detalhe');
      });
      app.get('/api/ok', async (_req, res) => {
        res.json({ ok: true });
      });
      app.use(jsonErrorHandler);
    });

    const boom = await fetch(`${base}/api/boom`);
    expect(boom.status).toBe(500);
    const body = await boom.json();
    expect(body.error).toBe('Erro interno do servidor.');
    expect(JSON.stringify(body)).not.toContain('secreto');

    expect((await fetch(`${base}/api/sync-boom`, { method: 'POST' })).status).toBe(500);
    expect((await fetch(`${base}/api/ok`)).status).toBe(200);
  });

  it('wrapAsyncRoutes preserva app.get(chave) de configuração do Express', () => {
    const app = express();
    wrapAsyncRoutes(app);
    app.set('foo', 'bar');
    expect(app.get('foo')).toBe('bar');
  });
});
