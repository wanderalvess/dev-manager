import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import type { AddressInfo } from 'net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ApiRule, ApiScenario, ApiScenarioRunResult } from '../../shared/apiScenarioTypes';
import type { DatabaseConnectionConfig } from '../../shared/types';
import { ApiScenarioService } from './ApiScenarioService';
import type { ConfigService } from './ConfigService';
import { DatabaseService } from './DatabaseService';

/**
 * Validação de API → "Campo × banco" contra um PostgreSQL REAL (teste/homologação, nunca produção), passando pelo
 * DatabaseService de verdade. Mesmas variáveis do roteiro do DB Studio; a senha vem do ambiente:
 *
 *   DM_IT_PG_HOST, DM_IT_PG_PORT, DM_IT_PG_DATABASE, DM_IT_PG_USER, DM_IT_PG_PASSWORD
 *   npx vitest run src/main/services/ApiScenarioService.postgres.integration.test.ts
 *
 * Cria e remove apenas a tabela dm_validation_filial no schema public.
 */
const env = process.env;
const enabled = Boolean(env.DM_IT_PG_HOST && env.DM_IT_PG_USER && env.DM_IT_PG_PASSWORD);
const TABLE = 'dm_validation_filial';

/** O :valor vem da resposta da API, que é dado de fora: estes códigos testam aspas e tentativa de injeção. */
const FILIAIS = [
  { codigo: '1', fantasia: 'Matriz' },
  { codigo: '2', fantasia: "Loja d'Água" },
  { codigo: "1' OR '1'='1", fantasia: 'Matriz' }
];

describe.skipIf(!enabled)('Validação de API: Campo × banco contra PostgreSQL real', () => {
  const db = new DatabaseService();
  const connection: DatabaseConnectionConfig = {
    id: 'it-pg',
    name: 'it-pg',
    type: 'postgres',
    host: env.DM_IT_PG_HOST ?? 'localhost',
    port: Number(env.DM_IT_PG_PORT ?? 5432),
    database: env.DM_IT_PG_DATABASE ?? 'postgres',
    user: env.DM_IT_PG_USER ?? '',
    password: env.DM_IT_PG_PASSWORD
  };
  const q = (sql: string) => db.executeQuery(connection, sql, 50);
  let server: http.Server;
  let apiUrl = '';
  let dir = '';
  let service: ApiScenarioService;

  beforeAll(async () => {
    await q(`DROP TABLE IF EXISTS ${TABLE}`);
    await q(`CREATE TABLE ${TABLE} (codigo VARCHAR(40) PRIMARY KEY, fantasia VARCHAR(60), total_vendas NUMERIC(12,2))`);
    await q(`INSERT INTO ${TABLE} VALUES ('1', 'Matriz', 1500.50), ('2', 'Loja d''Água', 320)`);
    server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      const match = /\/filiais\/(\d+)$/.exec(req.url ?? '');
      const filial = match ? FILIAIS[Number(match[1])] : undefined;
      res.end(JSON.stringify(filial ? { ...filial, vendas: '1500,50' } : { total: 2, filiais: FILIAIS }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    apiUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-pg-'));
    service = new ApiScenarioService(
      { getConfigFilePath: () => path.join(dir, 'config.json'), getSettings: () => ({ databaseConnections: [connection] }) } as unknown as ConfigService,
      db
    );
  });

  afterAll(async () => {
    await q(`DROP TABLE IF EXISTS ${TABLE}`);
    server?.close();
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  });

  const run = async (url: string, rules: Omit<ApiRule, 'id'>[]) => {
    const scenario: Partial<ApiScenario> = {
      name: 'Filial bate com o banco',
      method: 'GET',
      url: `${apiUrl}${url}`,
      headers: [],
      auth: 'none',
      rules: rules.map((rule, i) => ({ ...rule, id: `r${i}` }))
    };
    return (await service.run({ scenario })) as ApiScenarioRunResult;
  };
  const dbRule = (pathInJson: string, sql: string, bindPath?: string, operator: ApiRule['operator'] = 'equals'): Omit<ApiRule, 'id'> => ({
    kind: 'db',
    path: pathInJson,
    operator,
    connectionId: 'it-pg',
    sql,
    ...(bindPath ? { bindPath } : {})
  });

  it('campo da resposta igual ao banco, com :valor vindo de outro campo', async () => {
    const result = await run('/filiais/0', [dbRule('$.fantasia', `SELECT fantasia FROM ${TABLE} WHERE codigo = :valor`, '$.codigo')]);
    expect(result.rules[0]).toMatchObject({ passed: true, expected: '"Matriz"', actual: '"Matriz"' });
  });

  it('aspas no valor vindo da API não quebram a consulta', async () => {
    const result = await run('/filiais/1', [dbRule('$.fantasia', `SELECT fantasia FROM ${TABLE} WHERE codigo = :valor`, '$.codigo')]);
    expect(result.rules[0]).toMatchObject({ passed: true, expected: `"Loja d'Água"` });
  });

  it('tentativa de injeção no :valor é tratada como texto: nenhuma linha, nunca "todas"', async () => {
    const result = await run('/filiais/2', [dbRule('$.fantasia', `SELECT fantasia FROM ${TABLE} WHERE codigo = :valor`, '$.codigo')]);
    expect(result.rules[0]).toMatchObject({ passed: false, expected: 'a consulta não devolveu nenhuma linha' });
  });

  it('número com vírgula na API comparado com NUMERIC do banco; contagem com COUNT(*)', async () => {
    const result = await run('/filiais/0', [
      dbRule('$.vendas', `SELECT total_vendas FROM ${TABLE} WHERE codigo = :valor`, '$.codigo')
    ]);
    expect(result.rules[0].passed).toBe(true);
    const list = await run('/filiais', [dbRule('$.total', `SELECT COUNT(*) FROM ${TABLE}`)]);
    expect(list.rules[0]).toMatchObject({ passed: true, expected: expect.stringContaining('2') });
  });

  it('valor diferente reprova mostrando os dois; erro de SQL aparece no lugar do esperado', async () => {
    const differs = await run('/filiais/0', [dbRule('$.fantasia', `SELECT 'Outra' FROM ${TABLE} WHERE codigo = :valor`, '$.codigo')]);
    expect(differs.rules[0]).toMatchObject({ passed: false, expected: '"Outra"', actual: '"Matriz"' });
    const broken = await run('/filiais/0', [dbRule('$.fantasia', 'SELECT coluna_que_nao_existe FROM dm_validation_filial', undefined)]);
    expect(broken.rules[0].passed).toBe(false);
    expect(broken.rules[0].expected).toContain('a consulta falhou');
  });
});
