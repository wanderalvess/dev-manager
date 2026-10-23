import { afterEach, describe, expect, it, vi } from 'vitest';
import http from 'http';
import { RemoteControlService, type RemoteBackend } from './RemoteControlService';

function makeBackend(overrides: Partial<RemoteBackend> = {}): RemoteBackend {
  return {
    getEnvironment: vi.fn(async () => ({ karafRunning: false, services: [], ports: [] })),
    getContainers: vi.fn(async () => ({ items: [] })),
    getLists: vi.fn(() => ({ deploys: [], backups: [] })),
    readLog: vi.fn(() => 'log do karaf'),
    run: vi.fn(async () => ({ ok: true, message: 'feito' })),
    ...overrides
  };
}

function request(port: number, path: string, opts: { method?: string; body?: unknown; headers?: http.OutgoingHttpHeaders } = {}) {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const data = opts.body === undefined ? undefined : JSON.stringify(opts.body);
    const req = http.request(
      { host: '127.0.0.1', port, path, method: opts.method ?? 'GET', headers: { ...(data ? { 'Content-Type': 'application/json' } : {}), ...opts.headers } },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
      }
    );
    req.on('error', reject);
    req.end(data);
  });
}

describe('RemoteControlService', () => {
  let service: RemoteControlService | null = null;

  afterEach(async () => {
    await service?.stop();
    service = null;
  });

  async function boot(backend = makeBackend()) {
    service = new RemoteControlService(backend, '127.0.0.1');
    const status = await service.start(0);
    return { backend, port: status.port as number, key: service.getKey() };
  }

  it('serve a página com a chave certa e responde 404 com chave errada', async () => {
    const { port, key } = await boot();
    const page = await request(port, `/${key}/`);
    expect(page.status).toBe(200);
    expect(page.body).toContain('Hub Manager');
    expect((await request(port, '/chave-errada/')).status).toBe(404);
    expect((await request(port, '/')).status).toBe(404);
  });

  it('recusa Host com nome de domínio (DNS rebinding)', async () => {
    const { port, key } = await boot();
    const res = await request(port, `/${key}/api/log`, { headers: { Host: 'evil.example.com' } });
    expect(res.status).toBe(403);
  });

  it('lê o log limitando o tamanho pedido', async () => {
    const { backend, port, key } = await boot();
    const res = await request(port, `/${key}/api/log?chars=999999999`);
    expect(JSON.parse(res.body)).toEqual({ output: 'log do karaf' });
    expect(backend.readLog).toHaveBeenCalledWith(60_000);
  });

  it('só executa ação da lista e exige confirmação nas destrutivas', async () => {
    const { backend, port, key } = await boot();
    expect((await request(port, `/${key}/api/acao`, { method: 'POST', body: { acao: 'formatar' } })).status).toBe(400);
    expect((await request(port, `/${key}/api/acao`, { method: 'POST', body: { acao: 'karaf.parar' } })).status).toBe(400);
    expect(backend.run).not.toHaveBeenCalled();
    const ok = await request(port, `/${key}/api/acao`, { method: 'POST', body: { acao: 'karaf.parar', confirmado: true } });
    expect(ok.status).toBe(200);
    expect(backend.run).toHaveBeenCalledWith({ action: 'karaf.parar', target: undefined, confirmed: true });
  });

  it('recusa POST de outra origem e sem JSON', async () => {
    const { port, key } = await boot();
    const origin = await request(port, `/${key}/api/acao`, { method: 'POST', body: { acao: 'ide.abrir' }, headers: { Origin: 'http://evil.example.com' } });
    expect(origin.status).toBe(403);
    const text = await request(port, `/${key}/api/acao`, { method: 'POST', headers: { 'Content-Type': 'text/plain' } });
    expect(text.status).toBe(415);
  });

  it('ação demorada responde 202 e uma segunda é recusada até acabar', async () => {
    let finish: () => void = () => undefined;
    const run = vi.fn(() => new Promise<{ ok: boolean; message: string }>((resolve) => (finish = () => resolve({ ok: true, message: 'pronto' }))));
    const { port, key } = await boot(makeBackend({ run }));
    const body = { acao: 'deploy.executar', alvo: 'p1', confirmado: true };
    expect((await request(port, `/${key}/api/acao`, { method: 'POST', body })).status).toBe(202);
    expect((await request(port, `/${key}/api/acao`, { method: 'POST', body })).status).toBe(409);
    finish();
    await vi.waitFor(async () => {
      const state = JSON.parse((await request(port, `/${key}/api/ambiente`)).body);
      expect(state.task).toMatchObject({ ok: true, message: 'pronto' });
      expect(state.task.endedAt).toBeTypeOf('number');
    });
  });

  it('trocar a chave invalida a antiga e desligar fecha a porta', async () => {
    const { port, key } = await boot();
    await service!.regenerateKey();
    expect((await request(port, `/${key}/`)).status).toBe(404);
    expect((await request(port, `/${service!.getKey()}/`)).status).toBe(200);
    await service!.stop();
    await expect(request(port, `/${key}/`)).rejects.toThrow();
  });
});
