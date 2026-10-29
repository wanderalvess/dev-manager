import { createHash } from 'crypto';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import type { AddressInfo } from 'net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ApiScenario, ApiScenarioRunResult } from '../../shared/apiScenarioTypes';
import { ApiScenarioService } from './ApiScenarioService';
import type { ConfigService } from './ConfigService';
import type { DatabaseService } from './DatabaseService';

const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiQURNSU4ifQ.assinaturaFalsa123';
const md5 = (text: string) => createHash('md5').update(text, 'utf8').digest('hex').toUpperCase();

/** API falsa: login do WTA (só aceita o MD5 da senha) e duas rotas, uma protegida e uma que devolve HTML. */
function startFakeApi(): Promise<{ server: http.Server; url: string }> {
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const send = (status: number, body: unknown, type = 'application/json') => {
        res.writeHead(status, { 'Content-Type': type });
        res.end(typeof body === 'string' ? body : JSON.stringify(body));
      };
      if (req.url === '/winthor/autenticacao/v1/login') {
        const data = JSON.parse(raw || '{}');
        return data.login === 'ADMIN' && data.senha === md5('1') ? send(200, { accessToken: TOKEN }) : send(401, { message: 'Usuário ou senha inválidos' });
      }
      if (req.url === '/winthor/filiais') {
        if (req.headers.authorization !== `Bearer ${TOKEN}`) return send(401, { message: 'Não autorizado' });
        return send(200, { total: 2, filiais: [{ codigo: '1', nome: 'Matriz' }, { codigo: '2', nome: 'Loja' }], token: TOKEN });
      }
      if (req.url === '/pagina') return send(200, '<html>ok</html>', 'text/html');
      send(404, { message: 'Recurso não encontrado' });
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}` })));
}

let dir: string;
let server: http.Server;
let service: ApiScenarioService;
let settings: Record<string, unknown>;
const queries: { sql: string; binds: unknown }[] = [];
/** Banco falso: PCFILIAL com as mesmas filiais da API, para o "Campo × banco". */
const fakeDb = {
  executeQuery: async (_conn: unknown, sql: string, _max: number, binds: Record<string, unknown>) => {
    queries.push({ sql, binds });
    if (/COUNT/i.test(sql)) return { success: true, rows: [{ TOTAL: 2 }] };
    const nomes: Record<string, string> = { '1': 'Matriz', '2': 'Loja' };
    return { success: true, rows: nomes[String(binds.valor)] ? [{ FANTASIA: nomes[String(binds.valor)] }] : [] };
  }
} as unknown as DatabaseService;

beforeEach(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-scenarios-'));
  const fake = await startFakeApi();
  server = fake.server;
  settings = { wtaUrl: fake.url, wtaLogin: 'ADMIN', wtaPassword: '1', databaseConnections: [{ id: 'oracle-hml', name: 'Oracle HML', type: 'oracle' }] };
  queries.length = 0;
  service = new ApiScenarioService(
    { getConfigFilePath: () => path.join(dir, 'config.json'), getSettings: () => settings } as unknown as ConfigService,
    fakeDb
  );
});

afterEach(() => {
  server.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

const filiais = (partial: Partial<ApiScenario> = {}): Partial<ApiScenario> => ({
  name: 'Filiais do WTA',
  method: 'GET',
  url: '{{wtaUrl}}/winthor/filiais',
  headers: [],
  auth: 'settings-wta',
  rules: [
    { id: 'r1', kind: 'status', operator: 'equals', expected: '200' },
    { id: 'r2', kind: 'json', path: '$.total', operator: 'equals', expected: '2' },
    { id: 'r3', kind: 'json', path: '$.filiais[1].nome', operator: 'equals', expected: 'Loja' }
  ],
  ...partial
});

const asResult = (r: unknown) => r as ApiScenarioRunResult;

describe('ApiScenarioService', () => {
  it('salva, lista e apaga cenários num arquivo ao lado do config.json', async () => {
    const saved = await service.save(filiais());
    expect(saved.success).toBe(true);
    expect(fs.existsSync(path.join(dir, 'api-scenarios.json'))).toBe(true);
    const list = await service.list();
    expect(list.map((s) => s.name)).toEqual(['Filiais do WTA']);
    expect(await service.delete(list[0].id)).toBe(true);
    expect(await service.list()).toEqual([]);
  });

  it('recusa cenário sem regra, regra sem valor e cabeçalho com quebra de linha', async () => {
    expect(await service.save(filiais({ rules: [] }))).toEqual({ success: false, error: expect.stringContaining('ao menos uma regra') });
    expect(await service.save(filiais({ rules: [{ id: 'x', kind: 'json', path: '$.a', operator: 'equals' }] }))).toEqual({
      success: false,
      error: expect.stringContaining('valor esperado')
    });
    expect(await service.save(filiais({ headers: [{ key: 'X-Teste', value: 'a\r\nInjetado: 1' }] }))).toEqual({
      success: false,
      error: expect.stringContaining('Cabeçalho inválido')
    });
  });

  it('roda um cenário salvo com o login do WTA de Configurações e confere cada regra', async () => {
    const saved = await service.save(filiais());
    if (!saved.success) throw new Error(saved.error);
    const result = asResult(await service.run({ id: saved.scenario.id }));
    expect(result.success).toBe(true);
    expect(result.rules.map((r) => r.passed)).toEqual([true, true, true]);
    expect(result.request.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/winthor\/filiais$/);
    // O token aparece mascarado no corpo, no passo a passo e no relatório
    expect(JSON.stringify(result)).not.toContain(TOKEN);
    expect(result.log.some((l) => l.message.startsWith('✔ Campo $.filiais[1].nome igual a Loja'))).toBe(true);
    expect(result.markdown).toContain('| Status igual a 200 | 200 | 200 | ✅ |');
  });

  it('valor obtido que é token sai mascarado na regra, no passo a passo e no relatório', async () => {
    const result = asResult(
      await service.run({ scenario: filiais({ rules: [{ id: 'r', kind: 'json', path: '$.token', operator: 'not-empty' }] }) })
    );
    expect(result.rules[0].passed).toBe(true);
    expect(result.rules[0].actual).not.toContain(TOKEN);
    expect(JSON.stringify(result)).not.toContain(TOKEN);
  });

  it('regra que não bate mostra o esperado e o obtido', async () => {
    const result = asResult(
      await service.run({ scenario: filiais({ rules: [{ id: 'r', kind: 'json', path: '$.total', operator: 'greater', expected: '5' }] }) })
    );
    expect(result.success).toBe(false);
    expect(result.rules[0]).toMatchObject({ passed: false, expected: '5', actual: '2' });
    expect(result.log.some((l) => l.message === '✘ Campo $.total maior que 5 — esperado 5, obtido 2' && l.asExpected === false)).toBe(true);
  });

  it('sem autenticação a API protegida responde 401 e a regra de status reprova', async () => {
    const result = asResult(await service.run({ scenario: filiais({ auth: 'none' }) }));
    expect(result.rules[0]).toMatchObject({ passed: false, actual: '401' });
  });

  it('login do WTA recusado para antes de chamar a API', async () => {
    settings.wtaPassword = 'errada';
    const result = asResult(await service.run({ scenario: filiais() }));
    expect(result.error).toContain('Não foi possível autenticar');
    expect(result.response).toBeUndefined();
  });

  it('resposta HTML reprova as regras de JSON e passa a de status', async () => {
    const result = asResult(
      await service.run({
        scenario: filiais({
          url: '{{wtaUrl}}/pagina',
          auth: 'none',
          rules: [
            { id: 'a', kind: 'status', operator: 'in', expected: '2xx' },
            { id: 'b', kind: 'json', path: '$.x', operator: 'exists' }
          ]
        })
      })
    );
    expect(result.rules.map((r) => r.passed)).toEqual([true, false]);
    expect(result.rules[1].actual).toBe('a resposta não é JSON');
  });

  it('API fora do ar reprova tudo com "sem resposta"; URL de metadados é recusada', async () => {
    const down = asResult(await service.run({ scenario: filiais({ url: 'http://127.0.0.1:1/x', auth: 'none' }) }));
    expect(down.response?.status).toBe(0);
    expect(down.rules.every((r) => !r.passed && r.actual === 'sem resposta')).toBe(true);
    const meta = asResult(await service.run({ scenario: filiais({ url: 'http://169.254.169.254/latest', auth: 'none' }) }));
    expect(meta.error).toContain('URL inválida');
  });

  it('roda todos os cenários salvos em sequência', async () => {
    await service.save(filiais());
    await service.save(filiais({ name: 'Sem token', auth: 'none' }));
    const results = await service.runAll();
    expect(results.map((r) => [r.scenarioName, r.success])).toEqual([
      ['Filiais do WTA', true],
      ['Sem token', false]
    ]);
  });

  it('tempo, cabeçalho e texto do corpo', async () => {
    const result = asResult(
      await service.run({
        scenario: filiais({
          rules: [
            { id: 'a', kind: 'duration', operator: 'less', expected: '5000' },
            { id: 'b', kind: 'header', path: 'Content-Type', operator: 'contains', expected: 'json' },
            { id: 'c', kind: 'body', operator: 'not-contains', expected: 'Exception' },
            { id: 'd', kind: 'body', operator: 'matches', expected: '"total":\\s*2' }
          ]
        })
      })
    );
    expect(result.rules.map((r) => [r.label, r.passed])).toEqual([
      ['Tempo de resposta menor que 5000 ms', true],
      ['Cabeçalho content-type contém json', true],
      ['Corpo não contém "Exception"', true],
      ['Corpo casa com a expressão "total":\\s*2', true]
    ]);
    expect(result.response?.headers['content-type']).toContain('json');
  });

  it('campo × banco: compara com a consulta, passando outro campo da resposta como :valor', async () => {
    const saved = await service.save(
      filiais({
        rules: [
          { id: 'a', kind: 'db', path: '$.filiais[1].nome', operator: 'equals', connectionId: 'oracle-hml', sql: 'SELECT FANTASIA FROM PCFILIAL WHERE CODIGO = :valor', bindPath: '$.filiais[1].codigo' },
          { id: 'b', kind: 'db', path: '$.total', operator: 'equals', connectionId: 'oracle-hml', sql: 'SELECT COUNT(*) TOTAL FROM PCFILIAL' }
        ]
      })
    );
    if (!saved.success) throw new Error(saved.error);
    expect(saved.scenario.rules[0]).toMatchObject({ connectionId: 'oracle-hml', bindPath: '$.filiais[1].codigo' });
    const result = asResult(await service.run({ id: saved.scenario.id }));
    expect(result.rules.map((r) => [r.passed, r.expected, r.actual])).toEqual([
      [true, '"Loja"', '"Loja"'],
      [true, '2', '2']
    ]);
    expect(queries[0].binds).toEqual({ valor: '2' });
    expect(result.log.some((l) => l.message.includes(':valor = "2"'))).toBe(true);
  });

  it('campo × banco: recusa salvar consulta que escreve e acusa conexão apagada', async () => {
    const write = await service.save(
      filiais({ rules: [{ id: 'a', kind: 'db', path: '$.total', operator: 'equals', connectionId: 'oracle-hml', sql: 'UPDATE PCFILIAL SET X = 1' }] })
    );
    expect(write).toEqual({ success: false, error: expect.stringContaining('somente leitura') });
    const gone = asResult(
      await service.run({ scenario: filiais({ rules: [{ id: 'a', kind: 'db', path: '$.total', operator: 'equals', connectionId: 'apagada', sql: 'SELECT 1 FROM DUAL' }] }) })
    );
    expect(gone.rules[0]).toMatchObject({ passed: false, expected: expect.stringContaining('conexão') });
  });
});
