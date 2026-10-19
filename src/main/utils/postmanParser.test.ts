import { describe, it, expect } from 'vitest';
import { parsePostmanCollection } from './postmanParser';

describe('postmanParser', () => {
  it('deve rejeitar JSON inválido', () => {
    const result = parsePostmanCollection('invalid json');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('deve parsear coleção com pastas, requisições, variáveis e bodies', () => {
    const samplePostman = JSON.stringify({
      info: {
        _postman_id: 'ec86deac-abb3-45e2-b9f6-dfbfcf444ae4',
        name: 'API Vendas OFFICIAL',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'Login',
          item: [
            {
              name: 'Usuario - Login',
              request: {
                method: 'POST',
                header: [
                  {
                    key: 'Content-Type',
                    value: 'application/json'
                  }
                ],
                body: {
                  mode: 'raw',
                  raw: '{\r\n    "login": "{{LOGIN}}",\r\n    "senha": "{{SENHA}}"\r\n}'
                },
                url: {
                  raw: 'http://{{host}}:{{port}}/winthor/autenticacao/v1/login',
                  protocol: 'http',
                  host: ['{{host}}'],
                  port: '{{port}}',
                  path: ['winthor', 'autenticacao', 'v1', 'login']
                }
              },
              response: []
            }
          ]
        },
        {
          name: 'Cadastrar Pedido',
          item: [
            {
              name: 'Gravar pedido',
              request: {
                method: 'POST',
                header: [],
                body: {
                  mode: 'raw',
                  raw: '{"branchId": "1"}'
                },
                url: {
                  raw: 'http://{{host}}:{{port}}/api/wholesale/v1/orders/'
                }
              },
              response: [
                {
                  name: 'Sucesso',
                  code: 200,
                  status: 'OK',
                  body: '{"id": 123}'
                }
              ]
            }
          ]
        }
      ],
      variable: [
        { key: 'idExterno', value: '1' }
      ]
    });

    const result = parsePostmanCollection(samplePostman);
    expect(result.success).toBe(true);
    expect(result.collectionName).toBe('API Vendas OFFICIAL');
    expect(result.foldersCount).toBe(2);
    expect(result.requestsCount).toBe(2);

    const col = result.collection!;
    expect(col.folders.some((f) => f.name === 'Login')).toBe(true);
    expect(col.folders.some((f) => f.name === 'Cadastrar Pedido')).toBe(true);

    const loginReq = col.requests.find((r) => r.name === 'Usuario - Login')!;
    expect(loginReq).toBeDefined();
    expect(loginReq.method).toBe('POST');
    expect(loginReq.url).toBe('http://{{host}}:{{port}}/winthor/autenticacao/v1/login');
    expect(loginReq.body.mode).toBe('raw-json');
    expect(loginReq.body.raw).toContain('{{LOGIN}}');

    const pedidoReq = col.requests.find((r) => r.name === 'Gravar pedido')!;
    expect(pedidoReq.examples?.length).toBe(1);
    expect(pedidoReq.examples?.[0].status).toBe(200);
  });
});
