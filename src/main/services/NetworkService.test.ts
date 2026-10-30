import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import http from 'http';
import type { AddressInfo } from 'net';
import os from 'os';
import { NetworkService, PROBE_BODY_PREVIEW_BYTES } from './NetworkService';

describe('NetworkService', () => {
  it('detecta IPs locais a partir das interfaces do sistema', async () => {
    // Mock de interfaces de rede do os
    vi.spyOn(os, 'networkInterfaces').mockReturnValue({
      'Wi-Fi': [
        {
          address: '192.168.1.150',
          netmask: '255.255.255.0',
          family: 'IPv4',
          mac: '00:11:22:33:44:55',
          internal: false,
          cidr: '192.168.1.150/24'
        }
      ],
      'Loopback Pseudo-Interface 1': [
        {
          address: '127.0.0.1',
          netmask: '255.0.0.0',
          family: 'IPv4',
          mac: '00:00:00:00:00:00',
          internal: true,
          cidr: '127.0.0.1/8'
        }
      ]
    });

    const service = new NetworkService();
    // Forçar detectWslIp a retornar mock
    vi.spyOn(service, 'detectWslIp').mockResolvedValue('172.28.14.82');

    const result = await service.getNetworkIps();

    expect(result.primaryLocalIp).toBe('192.168.1.150');
    expect(result.localIps).toHaveLength(1);
    expect(result.localIps[0].interface).toBe('Wi-Fi');
    expect(result.localIps[0].type).toBe('Wi-Fi');
    expect(result.wslIp).toBe('172.28.14.82');
  });

  it('ignora IPs APIPA 169.254.x.x', async () => {
    vi.spyOn(os, 'networkInterfaces').mockReturnValue({
      Ethernet: [
        {
          address: '169.254.10.20',
          netmask: '255.255.0.0',
          family: 'IPv4',
          mac: '00:11:22:33:44:55',
          internal: false,
          cidr: '169.254.10.20/16'
        },
        {
          address: '10.0.0.45',
          netmask: '255.255.255.0',
          family: 'IPv4',
          mac: '00:11:22:33:44:55',
          internal: false,
          cidr: '10.0.0.45/24'
        }
      ]
    });

    const service = new NetworkService();
    vi.spyOn(service, 'detectWslIp').mockResolvedValue(null);

    const result = await service.getNetworkIps();

    expect(result.primaryLocalIp).toBe('10.0.0.45');
    expect(result.localIps).toHaveLength(1);
    expect(result.localIps[0].ip).toBe('10.0.0.45');
    expect(result.wslIp).toBeNull();
  });
});

describe('NetworkService.probeHttpEndpoint', () => {
  let server: http.Server;
  let baseUrl = '';
  let lastAuth: string | undefined;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      lastAuth = req.headers.authorization;
      if (req.url === '/json') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'UP' }));
      } else if (req.url === '/big') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('x'.repeat(PROBE_BODY_PREVIEW_BYTES + 5000));
      } else if (req.url === '/redirect') {
        res.writeHead(302, { Location: 'http://169.254.169.254/latest/meta-data' });
        res.end();
      } else {
        res.writeHead(503, { 'Content-Type': 'text/plain' });
        res.end('fora do ar');
      }
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('devolve status, tipo, cabeçalhos e o corpo da resposta', async () => {
    const result = await new NetworkService().probeHttpEndpoint({
      url: `${baseUrl}/json`,
      headers: { Authorization: 'Bearer abc' }
    });
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.contentType).toContain('application/json');
    expect(JSON.parse(result.bodyPreview)).toEqual({ status: 'UP' });
    expect(result.truncated).toBe(false);
    expect(lastAuth).toBe('Bearer abc');
  });

  it('marca erro HTTP sem lançar exceção', async () => {
    const result = await new NetworkService().probeHttpEndpoint({ url: `${baseUrl}/down` });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(503);
    expect(result.bodyPreview).toBe('fora do ar');
  });

  it('corta o corpo no limite do preview', async () => {
    const result = await new NetworkService().probeHttpEndpoint({ url: `${baseUrl}/big` });
    expect(result.truncated).toBe(true);
    expect(result.sizeBytes).toBe(PROBE_BODY_PREVIEW_BYTES);
  });

  it('não segue redirect e mostra o destino', async () => {
    const result = await new NetworkService().probeHttpEndpoint({ url: `${baseUrl}/redirect` });
    expect(result.status).toBe(302);
    expect(result.ok).toBe(false);
    expect(result.redirectLocation).toBe('http://169.254.169.254/latest/meta-data');
  });

  it('HEAD não lê corpo', async () => {
    const result = await new NetworkService().probeHttpEndpoint({ url: `${baseUrl}/json`, method: 'HEAD' });
    expect(result.status).toBe(200);
    expect(result.bodyPreview).toBe('');
  });

  it('recusa URL insegura, cabeçalho inválido e explica conexão recusada', async () => {
    const service = new NetworkService();
    expect((await service.probeHttpEndpoint({ url: 'file:///c:/windows' })).error).toMatch(/inválida/);
    expect((await service.probeHttpEndpoint({ url: 'http://169.254.169.254/' })).error).toMatch(/inválida/);
    expect((await service.probeHttpEndpoint({ url: `${baseUrl}/json`, headers: { 'X Bad': '1' } })).error).toMatch(
      /cabeçalho inválido/
    );
    const spare = http.createServer();
    await new Promise<void>((resolve) => spare.listen(0, '127.0.0.1', () => resolve()));
    const freePort = (spare.address() as AddressInfo).port;
    await new Promise<void>((resolve) => spare.close(() => resolve()));
    const closed = await service.probeHttpEndpoint({ url: `http://127.0.0.1:${freePort}/` });
    expect(closed.ok).toBe(false);
    expect(closed.error).toMatch(/recusada/);
    expect((await service.probeHttpEndpoint({ url: 'http://127.0.0.1:6000/' })).error).toMatch(/bloqueia a porta/);
  });
});
