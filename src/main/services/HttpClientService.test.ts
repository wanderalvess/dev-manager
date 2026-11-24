import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpClientService } from './HttpClientService';
import { httpRequest } from '../utils/httpRequest';

vi.mock('../utils/httpRequest', () => ({ httpRequest: vi.fn() }));

describe('HttpClientService.loginWinThor', () => {
  const service = new HttpClientService({ getEnvironments: () => [], updateEnvironmentToken: vi.fn() } as never);

  beforeEach(() => vi.mocked(httpRequest).mockReset());

  const answer = (status: number, body: unknown) =>
    vi.mocked(httpRequest).mockResolvedValueOnce({
      ok: status < 400,
      status,
      statusText: '',
      text: async () => JSON.stringify(body),
      buffer: async () => Buffer.from('')
    } as never);

  it('envia a senha em MD5 maiúsculo, como o WTA exige', async () => {
    answer(200, { accessToken: 'TOK' });
    const res = await service.loginWinThor({ login: 'PCADMIN', senha: 'abc', loginUrl: 'http://localhost:8039/winthor/autenticacao/v1/login' });
    expect(res.success).toBe(true);
    const body = JSON.parse(String((vi.mocked(httpRequest).mock.calls[0][1] as { body: string }).body));
    expect(body).toEqual({ login: 'PCADMIN', senha: '900150983CD24FB0D6963F7D28E17F72' });
  });

  it('um hash de 32 caracteres colado vai como está, em maiúsculas', async () => {
    answer(200, { accessToken: 'TOK' });
    await service.loginWinThor({ login: 'PCADMIN', senha: '900150983cd24fb0d6963f7d28e17f72', loginUrl: 'http://localhost:8039/winthor/autenticacao/v1/login' });
    const body = JSON.parse(String((vi.mocked(httpRequest).mock.calls[0][1] as { body: string }).body));
    expect(body.senha).toBe('900150983CD24FB0D6963F7D28E17F72');
  });
});

describe('HttpClientService.executeRequest: erros legíveis', () => {
  const service = new HttpClientService({ getEnvironments: () => [], updateEnvironmentToken: vi.fn() } as never);
  const req = (url: string) => ({
    request: { id: 'r', name: 'r', method: 'GET' as const, url, params: [], headers: [], body: { mode: 'none' as const }, auth: { type: 'none' as const } }
  });

  beforeEach(() => vi.mocked(httpRequest).mockReset());

  it('traduz o AggregateError de message vazio (localhost em IPv4 e IPv6)', async () => {
    const err = Object.assign(new Error(''), { errors: [Object.assign(new Error(''), { code: 'ECONNREFUSED' })] });
    vi.mocked(httpRequest).mockRejectedValueOnce(err);
    const res = await service.executeRequest(req('http://localhost:8889/api'));
    expect(res.error).toContain('Conexão recusada em localhost:8889');
  });

  it('avisa da variável sem valor em vez de tentar uma URL inválida', async () => {
    const res = await service.executeRequest(req('http://{{host}}:{{port}}/a'));
    expect(res.error).toContain('{{host}}');
    expect(res.error).toContain('{{port}}');
    expect(httpRequest).not.toHaveBeenCalled();
  });
});
