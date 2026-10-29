import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { FAKE_CREDENTIALS, startFakePdvSync, type FakePdvSync } from './fakePdvSyncServer';
import { lookupBatch, PdvSyncClient } from './pdvSyncClient';
import type { PdvSyncCredentials, PdvSyncTarget } from '../../../shared/pdvSyncConfig';

let fake: FakePdvSync;

beforeAll(async () => {
  fake = await startFakePdvSync();
});
afterAll(async () => {
  await fake.close();
});
beforeEach(() => {
  fake.requests.length = 0;
});

const credentials = (overrides: Partial<PdvSyncCredentials> = {}): PdvSyncCredentials => ({
  racUrl: fake.racUrl,
  username: FAKE_CREDENTIALS.username,
  password: FAKE_CREDENTIALS.password,
  clientId: FAKE_CREDENTIALS.clientId,
  clientSecret: FAKE_CREDENTIALS.clientSecret,
  ...overrides
});
const target = (overrides: Partial<PdvSyncTarget> = {}): PdvSyncTarget => ({
  tenantId: 'T1',
  batchStatusUrl: fake.batchStatusUrl,
  storeStatusUrl: fake.storeStatusUrl,
  ...overrides
});
const makeClient = (c: Partial<PdvSyncCredentials> = {}, t: Partial<PdvSyncTarget> = {}) => new PdvSyncClient(credentials(c), target(t));

describe('PdvSyncClient.login', () => {
  it('faz o POST de formulário do RAC com os seis campos do contrato e devolve o access_token', async () => {
    const result = await makeClient().login();

    expect(result).toEqual({ ok: true, value: FAKE_CREDENTIALS.token });
    const request = fake.requests[0];
    expect(request.method).toBe('POST');
    expect(request.headers['content-type']).toBe('application/x-www-form-urlencoded');
    expect(Object.fromEntries(new URLSearchParams(request.body))).toEqual({
      grant_type: 'password',
      username: FAKE_CREDENTIALS.username,
      password: FAKE_CREDENTIALS.password,
      scope: 'authorization_api',
      client_id: FAKE_CREDENTIALS.clientId,
      client_secret: FAKE_CREDENTIALS.clientSecret
    });
  });

  it('login recusado: explica o motivo do servidor e nunca devolve a senha nem o client_secret', async () => {
    const result = await makeClient({ password: 'senha-errada-xyz', clientSecret: 'segredo-errado-abc' }).login();

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.httpStatus).toBe(401);
    expect(result.error).toContain('recusou o login (HTTP 401)');
    expect(result.error).toContain('Usuário ou senha inválidos');
    expect(result.error).not.toContain('senha-errada-xyz');
    expect(result.error).not.toContain('segredo-errado-abc');
  });

  it('resposta 200 sem access_token é erro', async () => {
    const result = await makeClient({ racUrl: `${fake.baseUrl}/rac/sem-token` }).login();

    expect(result).toEqual({ ok: false, error: 'A resposta do login do PDVSync não trouxe o access_token.', httpStatus: 200 });
  });

  it('servidor fora do ar vira mensagem legível', async () => {
    const result = await makeClient({ racUrl: 'http://127.0.0.1:1/rac/token' }).login();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/^Não foi possível falar com o PDVSync:/);
  });

  it('recusa endereço de metadados de nuvem sem fazer requisição', async () => {
    const http = vi.fn();
    const client = new PdvSyncClient(credentials({ racUrl: 'http://169.254.169.254/latest/token' }), target(), http as never);

    expect(await client.login()).toEqual({ ok: false, error: 'Endereço do PDVSync inválido ou não permitido.' });
    expect(http).not.toHaveBeenCalled();
  });
});

describe('PdvSyncClient.getBatch', () => {
  it('lê o status do lote nos formatos número, texto e decimal', async () => {
    const client = makeClient();
    const token = FAKE_CREDENTIALS.token;

    expect(await client.getBatch(token, '100')).toEqual({
      ok: true,
      value: { found: true, batchNumber: '100', statusCode: 5, status: { name: 'BaixadoComSucesso', kind: 'downloaded' } }
    });
    const decimal = await client.getBatch(token, '101');
    expect(decimal.ok && decimal.value.statusCode).toBe(4);
    const failed = await client.getBatch(token, '102');
    expect(failed.ok && failed.value.status.kind).toBe('error');
    const preparing = await client.getBatch(token, '103');
    expect(preparing.ok && preparing.value.statusCode).toBe(0);
  });

  it('manda o Bearer e monta o caminho com inquilino e lote, codificando o que precisa', async () => {
    await makeClient({}, { tenantId: 'filial 1' }).getBatch(FAKE_CREDENTIALS.token, '100');

    const request = fake.requests[0];
    expect(request.headers.authorization).toBe(`Bearer ${FAKE_CREDENTIALS.token}`);
    expect(request.path).toBe('/controleprocesso/api/retaguarda/v3/LoteExternoRetornos/filial 1/100');
  });

  it('lote que o PDVSync não conhece (404 ou lista vazia) não é erro: found false', async () => {
    const client = makeClient();
    for (const lote of ['999', 'vazio']) {
      const result = await client.getBatch(FAKE_CREDENTIALS.token, lote);
      expect(result).toMatchObject({ ok: true, value: { found: false, batchNumber: lote, status: { kind: 'unknown' } } });
    }
  });

  it('erro do servidor e token inválido viram falha com o motivo', async () => {
    const client = makeClient();
    const server = await client.getBatch(FAKE_CREDENTIALS.token, 'quebra');
    expect(server).toMatchObject({ ok: false, httpStatus: 500 });
    if (!server.ok) expect(server.error).toBe('A consulta de lote respondeu HTTP 500: falha interna do serviço.');

    const unauthorized = await client.getBatch('token-vencido', '100');
    expect(unauthorized).toMatchObject({ ok: false, httpStatus: 401 });
    if (!unauthorized.ok) expect(unauthorized.error).toContain('não autorizou');
  });
});

describe('PdvSyncClient.getStores', () => {
  it('lê o status de cada loja, com os erros identificados', async () => {
    const result = await makeClient().getStores(FAKE_CREDENTIALS.token, '100');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(2);
    expect(result.value[0]).toMatchObject({ branchId: '1', statusCode: 5, status: { kind: 'downloaded' }, errors: [] });
    expect(result.value[1]).toMatchObject({ branchId: '2', statusCode: 6, status: { kind: 'error' } });
    expect(result.value[1].errors).toEqual([{ id: 'PROD-7', message: 'NCM inválido para o produto' }]);
    expect(fake.requests[0].query).toEqual({ inquilino: 'T1', loteOrigem: '100' });
  });

  it('filtra por filial só quando ela é informada', async () => {
    const result = await makeClient().getStores(FAKE_CREDENTIALS.token, '100', '2');

    expect(fake.requests[0].query.idRetaguardaLoja).toBe('2');
    expect(result.ok && result.value.map((s) => s.branchId)).toEqual(['2']);
  });

  it('lote sem lojas, sem endereço configurado ou falha do servidor', async () => {
    const client = makeClient();
    expect(await client.getStores(FAKE_CREDENTIALS.token, '101')).toEqual({ ok: true, value: [] });

    fake.requests.length = 0;
    expect(await makeClient({}, { storeStatusUrl: undefined }).getStores(FAKE_CREDENTIALS.token, '100')).toEqual({ ok: true, value: [] });
    expect(fake.requests).toHaveLength(0);

    const failed = await client.getStores(FAKE_CREDENTIALS.token, 'quebra');
    expect(failed).toMatchObject({ ok: false, httpStatus: 500 });
  });
});

describe('lookupBatch', () => {
  it('faz login, consulta o lote e o status por loja, nessa ordem', async () => {
    const lookup = await lookupBatch(makeClient(), '100');

    expect(lookup.error).toBeUndefined();
    expect(lookup.batch).toMatchObject({ found: true, statusCode: 5 });
    expect(lookup.stores).toHaveLength(2);
    expect(fake.requests.map((r) => `${r.method} ${r.path.split('/').pop()}`)).toEqual(['POST token', 'GET 100', 'GET LojaLoteStatusretorno']);
  });

  it('login recusado interrompe tudo: nenhuma consulta é feita', async () => {
    const lookup = await lookupBatch(makeClient({ password: 'errada' }), '100');

    expect(lookup.error).toContain('recusou o login');
    expect(lookup.batch).toBeUndefined();
    expect(fake.requests).toHaveLength(1);
  });

  it('lote desconhecido não consulta as lojas', async () => {
    const lookup = await lookupBatch(makeClient(), '999');

    expect(lookup.batch?.found).toBe(false);
    expect(lookup.stores).toBeUndefined();
    expect(fake.requests).toHaveLength(2);
  });

  it('erro na consulta do lote vira erro do rastreio, sem status por loja', async () => {
    const lookup = await lookupBatch(makeClient(), 'quebra');

    expect(lookup.error).toContain('HTTP 500');
    expect(lookup.batch).toBeUndefined();
  });

  it('falha só no status por loja não perde o status do lote', async () => {
    const partial = await lookupBatch(makeClient({}, { storeStatusUrl: 'http://127.0.0.1:1/loja' }), '100');
    expect(partial.batch).toMatchObject({ found: true });
    expect(partial.stores).toBeUndefined();
    expect(partial.storesError).toMatch(/^Não foi possível falar com o PDVSync/);
  });
});
