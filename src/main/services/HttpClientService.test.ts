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
