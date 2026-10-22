import { describe, it, expect } from 'vitest';
import { generateCurlCommand, parseCurlCommand } from './curlUtils';
import { HttpRequestItem } from '../../../shared/types';

describe('curlUtils', () => {
  it('deve gerar comando cURL básico com GET', () => {
    const req: HttpRequestItem = {
      id: '1',
      name: 'Listar Produtos',
      method: 'GET',
      url: 'http://localhost:8181/winthor/produtos',
      params: [],
      headers: [],
      body: { mode: 'none' },
      auth: { type: 'none' }
    };

    const curl = generateCurlCommand(req);
    expect(curl).toContain('curl -X GET "http://localhost:8181/winthor/produtos"');
  });

  it('deve interpolar variáveis e incluir Bearer Token e JSON body', () => {
    const req: HttpRequestItem = {
      id: '2',
      name: 'Login WinThor',
      method: 'POST',
      url: 'http://{{host}}:{{port}}/winthor/autenticacao/v1/login',
      params: [],
      headers: [],
      body: {
        mode: 'raw-json',
        raw: '{"login":"{{LOGIN}}","senha":"{{SENHA}}"}'
      },
      auth: { type: 'bearer', token: '{{TOKEN}}' }
    };

    const vars = {
      host: '10.0.0.1',
      port: '8080',
      LOGIN: 'PCADMIN',
      SENHA: '123',
      TOKEN: 'jwt_abc'
    };

    const curl = generateCurlCommand(req, vars);
    expect(curl).toContain('curl -X POST "http://10.0.0.1:8080/winthor/autenticacao/v1/login"');
    expect(curl).toContain('-H "Authorization: Bearer jwt_abc"');
    expect(curl).toContain('-H "Content-Type: application/json"');
    expect(curl).toContain('--data-raw "{\\"login\\":\\"PCADMIN\\",\\"senha\\":\\"123\\"}"');
  });

  it('deve fazer parse de comando cURL com sucesso', () => {
    const rawCurl = `curl -X POST "http://localhost:8181/winthor/pedidos" \\
      -H "Authorization: Bearer my_jwt_token" \\
      -H "Content-Type: application/json" \\
      --data-raw '{"codCliente":100}'`;

    const parsed = parseCurlCommand(rawCurl);
    expect(parsed).not.toBeNull();
    expect(parsed?.method).toBe('POST');
    expect(parsed?.url).toBe('http://localhost:8181/winthor/pedidos');
    expect(parsed?.auth?.type).toBe('bearer');
    expect(parsed?.auth?.token).toBe('my_jwt_token');
    expect(parsed?.body?.mode).toBe('raw-json');
    expect(parsed?.body?.raw).toContain('"codCliente":100');
  });

  it('deve retornar null se não for comando curl válido', () => {
    expect(parseCurlCommand('')).toBeNull();
    expect(parseCurlCommand('GET /api/v1/foo')).toBeNull();
  });
});
