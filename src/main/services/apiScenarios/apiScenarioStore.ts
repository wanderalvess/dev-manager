import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { API_RULE_OPERATORS, ruleProblem } from '../../../shared/apiRuleText';
import { API_HTTP_METHODS, type ApiHeader, type ApiRule, type ApiRuleKind, type ApiScenario } from '../../../shared/apiScenarioTypes';

/**
 * Cenários da Validação de API num arquivo ao lado do config.json: o app, o servidor web e o MCP são processos
 * diferentes e precisam enxergar os mesmos cenários. Nenhum segredo fica aqui: a autenticação usa o login do WTA
 * de Configurações, que já é criptografado em repouso.
 */

export const MAX_SCENARIOS = 200;
const MAX_RULES = 50;
const MAX_HEADERS = 30;
const MAX_BODY_BYTES = 1024 * 1024;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/;
// Nome de cabeçalho HTTP (token da RFC 9110) e valor sem quebra de linha: evita injeção de cabeçalho
const HEADER_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

export function isSafeScenarioId(id: unknown): id is string {
  return typeof id === 'string' && SAFE_ID.test(id);
}

function normalizeHeaders(value: unknown): ApiHeader[] | string {
  if (!Array.isArray(value)) return [];
  const headers: ApiHeader[] = [];
  for (const item of value.slice(0, MAX_HEADERS)) {
    const key = String(item?.key ?? '').trim();
    const headerValue = String(item?.value ?? '');
    if (!key) continue;
    if (!HEADER_NAME.test(key) || /[\r\n]/.test(headerValue)) return `Cabeçalho inválido: "${key}".`;
    headers.push({ key, value: headerValue });
  }
  return headers;
}

function normalizeRules(value: unknown): ApiRule[] | string {
  if (!Array.isArray(value)) return [];
  const rules: ApiRule[] = [];
  for (const item of value.slice(0, MAX_RULES)) {
    const kind = Object.keys(API_RULE_OPERATORS).find((k) => k === item?.kind) as ApiRuleKind | undefined;
    if (!kind || !API_RULE_OPERATORS[kind].includes(item?.operator)) return 'Regra com tipo ou operador desconhecido.';
    const text = (value: unknown) => String(value ?? '').trim();
    const rule: ApiRule = {
      id: isSafeScenarioId(item.id) ? item.id : randomUUID(),
      kind,
      operator: item.operator,
      ...(kind === 'json' || kind === 'db' || kind === 'header' ? { path: text(item.path) } : {}),
      ...(kind !== 'db' && item.expected !== undefined && item.expected !== null ? { expected: kind === 'body' ? String(item.expected) : text(item.expected) } : {}),
      ...(kind === 'db'
        ? { connectionId: text(item.connectionId), sql: text(item.sql), ...(text(item.bindPath) ? { bindPath: text(item.bindPath) } : {}) }
        : {})
    };
    const problem = ruleProblem(rule);
    if (problem) return problem;
    rules.push(rule);
  }
  return rules;
}

/** Valida e limpa um cenário vindo da tela, do REST ou do MCP. Erro volta como texto. */
export function normalizeScenario(input: Partial<ApiScenario>): { scenario: ApiScenario } | { error: string } {
  const name = String(input?.name ?? '').trim();
  if (!name) return { error: 'Dê um nome ao cenário.' };
  const method = API_HTTP_METHODS.find((m) => m === String(input.method ?? 'GET').toUpperCase());
  if (!method) return { error: `Método HTTP não suportado: ${input.method}.` };
  const url = String(input.url ?? '').trim();
  if (!url) return { error: 'Informe a URL da API.' };
  const headers = normalizeHeaders(input.headers);
  if (typeof headers === 'string') return { error: headers };
  const rules = normalizeRules(input.rules);
  if (typeof rules === 'string') return { error: rules };
  if (rules.length === 0) return { error: 'Adicione ao menos uma regra (status ou campo do JSON).' };
  const body = typeof input.body === 'string' && input.body.trim() ? input.body : undefined;
  if (body && Buffer.byteLength(body, 'utf-8') > MAX_BODY_BYTES) return { error: 'O corpo da requisição passa de 1 MB.' };
  return {
    scenario: {
      id: isSafeScenarioId(input.id) ? input.id : randomUUID(),
      name: name.slice(0, 120),
      method,
      url,
      headers,
      ...(body && method !== 'GET' ? { body } : {}),
      auth: input.auth === 'settings-wta' ? 'settings-wta' : 'none',
      rules,
      updatedAt: new Date().toISOString()
    }
  };
}

export class ApiScenarioStore {
  constructor(private readonly file: string) {}

  static forConfigFile(configFilePath: string): ApiScenarioStore {
    return new ApiScenarioStore(path.join(path.dirname(configFilePath), 'api-scenarios.json'));
  }

  /** Arquivo ausente ou corrompido vira lista vazia; cenário inválido no arquivo é ignorado, não derruba a lista. */
  async list(): Promise<ApiScenario[]> {
    let raw: string;
    try {
      raw = await fs.promises.readFile(this.file, 'utf-8');
    } catch {
      return [];
    }
    try {
      const data = JSON.parse(raw);
      const items: unknown[] = Array.isArray(data?.scenarios) ? data.scenarios : [];
      return items.flatMap((item) => {
        const result = normalizeScenario(item as Partial<ApiScenario>);
        return 'scenario' in result ? [{ ...result.scenario, updatedAt: (item as ApiScenario).updatedAt }] : [];
      });
    } catch {
      return [];
    }
  }

  async get(id: string): Promise<ApiScenario | undefined> {
    return (await this.list()).find((s) => s.id === id);
  }

  async save(scenario: ApiScenario): Promise<void> {
    const list = (await this.list()).filter((s) => s.id !== scenario.id);
    if (list.length >= MAX_SCENARIOS) throw new Error(`Limite de ${MAX_SCENARIOS} cenários atingido.`);
    await this.write([...list, scenario]);
  }

  async delete(id: string): Promise<boolean> {
    const list = await this.list();
    const kept = list.filter((s) => s.id !== id);
    if (kept.length === list.length) return false;
    await this.write(kept);
    return true;
  }

  private async write(scenarios: ApiScenario[]): Promise<void> {
    await fs.promises.mkdir(path.dirname(this.file), { recursive: true });
    const temp = `${this.file}.tmp`;
    await fs.promises.writeFile(temp, JSON.stringify({ version: 1, scenarios }, null, 2), 'utf-8');
    await fs.promises.rename(temp, this.file);
  }
}
