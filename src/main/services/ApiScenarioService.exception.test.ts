import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import type { AddressInfo } from 'net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ApiScenario, ApiScenarioRunResult } from '../../shared/apiScenarioTypes';
import { ApiScenarioService } from './ApiScenarioService';
import type { ConfigService } from './ConfigService';
import { newExceptionScenario } from '../../renderer/src/utils/apiScenarioView';

/**
 * Exceção não mapeada: o QA força a API a cair num erro que o código não trata. /tratado responde 400 com mensagem
 * e grava a linha no winthor.log (com o X-Request-Id); /vaza responde 500 com stack trace, ORA- e JDBC e não grava nada.
 */
function startFakeApi(logFile: string) {
  const logged: string[] = [];
  const server = http.createServer((req, res) => {
    req.resume();
    req.on('end', () => {
      const id = String(req.headers['x-request-id'] ?? '');
      if (req.url?.startsWith('/winthor/tratado')) {
        const line = `2026-10-29 10:00:00 ERROR [${id}] IllegalArgumentException tratada: campo desconhecido`;
        fs.appendFileSync(logFile, `${line}\n`);
        logged.push(line);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Campo desconhecido: campoQueNaoExiste' }));
        return;
      }
      if (req.url?.startsWith('/winthor/vaza')) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            error: 'java.lang.NullPointerException: null\n\tat br.com.pcsist.winthor.Pedido.salvar(Pedido.java:42)',
            detalhe: 'ORA-00942: table or view does not exist',
            conexao: 'jdbc:oracle:thin:@//10.0.0.5:1521/WINT'
          })
        );
        return;
      }
      if (req.url === '/winthor/ferramenta/servidor/v1/logs') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(logged));
        return;
      }
      res.writeHead(404).end();
    });
  });
  return new Promise<{ server: http.Server; url: string }>((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}` }))
  );
}

let dir: string;
let server: http.Server;
let service: ApiScenarioService;

beforeEach(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-exception-'));
  fs.mkdirSync(path.join(dir, 'data', 'log'), { recursive: true });
  const logFile = path.join(dir, 'data', 'log', 'winthor.log');
  fs.writeFileSync(logFile, 'linha antiga com dm-qualquer-coisa\n');
  const fake = await startFakeApi(logFile);
  server = fake.server;
  service = new ApiScenarioService({
    getConfigFilePath: () => path.join(dir, 'config.json'),
    getSettings: () => ({ wtaUrl: fake.url, karafPath: dir })
  } as unknown as ConfigService);
});

afterEach(() => {
  server.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

const exception = (route: string): Partial<ApiScenario> => ({ ...newExceptionScenario(), auth: 'none', url: `{{wtaUrl}}/winthor/${route}` });
const run = async (scenario: Partial<ApiScenario>) => (await service.run({ scenario })) as ApiScenarioRunResult;

describe('Validação de API: exceção não mapeada', () => {
  it('erro bem tratado: 4xx, mensagem em JSON, sem vazamento e registrado no log com o requestId', async () => {
    const result = await run(exception('tratado'));
    expect(result.rules.map((r) => [r.label, r.passed])).toEqual([
      ['Status um destes 4xx', true],
      ['Cabeçalho content-type contém json', true],
      ['Corpo casa com a expressão "(message|mensagem|erro|error)"\\s*:', true],
      ['Resposta sem stack trace, erro ORA-/SQL, string de conexão, senha ou token', true],
      ['winthor.log ou API de logs registra "{{requestId}}"', true]
    ]);
    expect(result.success).toBe(true);
    expect(result.requestId).toMatch(/^dm-/);
    expect(result.rules[4].actual).toContain(result.requestId);
  });

  it('exceção vazada: 500, stack trace, ORA- e JDBC expostos e nada no log', async () => {
    const result = await run(exception('vaza'));
    const byKind = Object.fromEntries(result.rules.map((r, i) => [i, r]));
    expect(result.success).toBe(false);
    expect(byKind[0]).toMatchObject({ passed: false, actual: '500' });
    expect(byKind[3].passed).toBe(false);
    expect(byKind[3].actual).toBe('expôs stack trace, string de conexão, erro de SQL do banco');
    expect(byKind[4].passed).toBe(false);
    expect(byKind[4].actual).toContain('não apareceu nas 0 linha(s) novas do winthor.log');
    expect(result.exposure).toEqual(expect.arrayContaining(['stack-trace', 'sql-error', 'connection-string']));
    expect(result.markdown).toContain('A resposta expõe: stack trace');
  });

  it('linhas antigas do log não contam: só o que foi escrito depois da chamada', async () => {
    const result = await run({ ...exception('vaza'), rules: [{ id: 'l', kind: 'log', operator: 'contains', expected: 'dm-qualquer-coisa', logSource: 'file' }] });
    expect(result.rules[0].passed).toBe(false);
  });

  it('procura também na API de logs, e {{requestId}} vai no corpo e no cabeçalho', async () => {
    const result = await run({ ...exception('tratado'), rules: [{ id: 'l', kind: 'log', operator: 'contains', expected: '{{requestId}}', logSource: 'api' }] });
    expect(result.rules[0]).toMatchObject({ passed: true });
    expect(result.rules[0].actual).toContain('API de logs');
    expect(result.log.some((l) => l.message.includes(`Identificador desta execução: ${result.requestId}`))).toBe(true);
  });

  it('sem a regra de vazamento, o passo a passo avisa que a resposta expõe detalhe interno', async () => {
    const result = await run({ ...exception('vaza'), rules: [{ id: 's', kind: 'status', operator: 'in', expected: '5xx' }] });
    expect(result.success).toBe(true);
    expect(result.log.some((l) => l.level === 'error' && l.message.includes('Sem vazamento de erro'))).toBe(true);
  });
});
