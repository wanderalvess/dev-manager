import express from 'express';
import type { AddressInfo } from 'net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UsageMetricsService } from '../main/services/UsageMetricsService';
import { createUsageTrackingMiddleware } from './usageTracking';

let server: ReturnType<ReturnType<typeof express>['listen']>;
let base: string;
const record = vi.fn();

beforeEach(async () => {
  record.mockClear();
  const app = express();
  app.use(express.json());
  // Simula o guard de autenticação: barra antes de qualquer rota.
  app.use((req, res, next) => (req.headers['x-bloqueado'] ? res.status(401).json({ error: 'não autorizado' }) : next()));
  app.use(createUsageTrackingMiddleware({ record } as unknown as UsageMetricsService));

  app.post('/api/db/backup', (_req, res) => res.json({ success: true }));
  app.post('/api/db/restore', (_req, res) => res.status(500).json({ error: 'falhou' }));
  app.get('/api/network/ips', (_req, res) => res.json([]));
  app.get('/api/docs/search', (_req, res) => res.json([]));

  const router = express.Router();
  router.post('/execute', (_req, res) => res.json({ status: 200 }));
  app.use('/api/http-client', router);

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
});

const call = (method: string, path: string, headers: Record<string, string> = {}) =>
  fetch(`${base}${path}`, { method, headers: { 'content-type': 'application/json', ...headers }, body: method === 'GET' ? undefined : '{}' });

// `finish` dispara depois do envio da resposta; dá um tick para o listener rodar.
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

describe('createUsageTrackingMiddleware', () => {
  it('conta rota da lista com origem rest e sucesso', async () => {
    await call('POST', '/api/db/backup');
    await settle();
    expect(record).toHaveBeenCalledTimes(1);
    expect(record.mock.calls[0][0]).toMatchObject({ module: 'database', action: 'backup-run', origin: 'rest', ok: true });
    expect(record.mock.calls[0][0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it('resposta 4xx/5xx conta como falha', async () => {
    await call('POST', '/api/db/restore');
    await settle();
    expect(record.mock.calls[0][0]).toMatchObject({ module: 'database', action: 'restore', ok: false });
  });

  it('rota dentro de um router usa baseUrl + caminho', async () => {
    await call('POST', '/api/http-client/execute');
    await settle();
    expect(record.mock.calls[0][0]).toMatchObject({ module: 'api-studio', action: 'send-request', origin: 'rest' });
  });

  it('rota de leitura fora da lista não é contada', async () => {
    await call('GET', '/api/network/ips');
    await settle();
    expect(record).not.toHaveBeenCalled();
  });

  it('o método importa: a rota está na lista só como GET', async () => {
    await call('GET', '/api/docs/search');
    await settle();
    expect(record).toHaveBeenCalledTimes(1);
    expect(record.mock.calls[0][0]).toMatchObject({ module: 'docs', action: 'search' });
  });

  it('requisição barrada pela autenticação não conta', async () => {
    const res = await call('POST', '/api/db/backup', { 'x-bloqueado': '1' });
    await settle();
    expect(res.status).toBe(401);
    expect(record).not.toHaveBeenCalled();
  });

  it('rota inexistente não conta nem quebra', async () => {
    const res = await call('POST', '/api/nao-existe');
    await settle();
    expect(res.status).toBe(404);
    expect(record).not.toHaveBeenCalled();
  });
});
