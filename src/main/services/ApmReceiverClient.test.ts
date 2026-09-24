import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import net from 'net';
import os from 'os';
import path from 'path';
import { ApmService } from './ApmService';
import { ApmReceiverClient, ApmReceiverUnavailableError } from './ApmReceiverClient';
import { TraceSpan } from '../../shared/types';

const makeSpan = (partial: Partial<TraceSpan>): TraceSpan => ({
  traceId: 't1',
  spanId: 's1',
  name: 'GET /api',
  kind: 'SERVER',
  serviceName: 'karaf',
  startTimeUnixMs: Date.now() - 1000,
  endTimeUnixMs: Date.now() - 900,
  durationMs: 100,
  statusCode: 'UNSET',
  attributes: {},
  ...partial
});

describe('ApmReceiverClient', () => {
  let tmpDir: string;
  let handleFile: string;
  let owner: ApmService;
  let client: ApmReceiverClient;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apm-client-'));
    handleFile = path.join(tmpDir, '.apm-receiver.json');
    owner = new ApmService(500, { queryHandleFile: handleFile });
    await owner.startReceiver(0);
    client = new ApmReceiverClient(handleFile, 2000);

    owner.ingestSpans([
      makeSpan({ traceId: 'ok-trace', spanId: 'root', serviceName: 'karaf' }),
      makeSpan({ traceId: 'err-trace', spanId: 'root', serviceName: 'gateway', statusCode: 'ERROR', httpStatusCode: 500 })
    ]);
  });

  afterEach(async () => {
    await owner.stopReceiver();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('lê o buffer do processo dono do receptor', async () => {
    expect((await client.getOverview()).totalTraces).toBe(2);
    expect((await client.getServices()).map((s) => s.serviceName).sort()).toEqual(['gateway', 'karaf']);
    expect((await client.getReceiverStatus()).bufferSize).toBe(2);
  });

  it('repassa os filtros de traces e de overview', async () => {
    expect((await client.getTraces({ hasError: true })).map((t) => t.traceId)).toEqual(['err-trace']);
    expect((await client.getOverview({ serviceName: 'karaf' })).totalTraces).toBe(1);
  });

  it('devolve detalhes do trace ou null quando ele não existe', async () => {
    const details = await client.getTraceDetails('ok-trace');
    expect(details?.summary.traceId).toBe('ok-trace');
    expect(details?.breakdown.totalMs).toBe(100);
    expect(await client.getTraceDetails('nao/existe')).toBeNull();
  });

  it('avisa que não há receptor ativo quando o app não está aberto', async () => {
    await owner.stopReceiver();
    const err = await client.getOverview().catch((e) => e);
    expect(err).toBeInstanceOf(ApmReceiverUnavailableError);
    expect(err.message).toContain('Nenhum receptor APM do Dev Manager está ativo');
  });

  it('explica quando o dono do arquivo de acesso deixou de responder (app encerrado à força)', async () => {
    const probe = net.createServer();
    await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', () => resolve()));
    const deadPort = (probe.address() as net.AddressInfo).port;
    await new Promise<void>((resolve) => probe.close(() => resolve()));
    fs.writeFileSync(handleFile, JSON.stringify({ port: deadPort, token: 'a'.repeat(64) }));

    const err = await client.getServices().catch((e) => e);
    expect(err).toBeInstanceOf(ApmReceiverUnavailableError);
    expect(err.message).toContain(`porta ${deadPort}`);
    expect(err.message).toContain('não respondeu');
  });

  it('recusa arquivo de acesso corrompido com mensagem clara', async () => {
    fs.writeFileSync(handleFile, '{ isto não é json');
    const err = await client.getOverview().catch((e) => e);
    expect(err).toBeInstanceOf(ApmReceiverUnavailableError);
    expect(err.message).toContain('ilegível');
  });

  it('informa token recusado quando o receptor foi reaberto por outro processo', async () => {
    const handle = JSON.parse(fs.readFileSync(handleFile, 'utf-8'));
    fs.writeFileSync(handleFile, JSON.stringify({ ...handle, token: 'b'.repeat(64) }));

    const err = await client.getOverview().catch((e) => e);
    expect(err).toBeInstanceOf(ApmReceiverUnavailableError);
    expect(err.message).toContain('recusou o token');
  });
});
