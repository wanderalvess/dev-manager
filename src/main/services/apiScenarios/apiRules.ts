import { describeRule } from '../../../shared/apiRuleText';
import type { ApiRule, ApiRuleResult } from '../../../shared/apiScenarioTypes';
import { areValuesEquivalent, extractJsonPath } from '../../utils/qaRegressionUtils';

export interface EvaluatedResponse {
  /** 0 = sem resposta. */
  status: number;
  isJson: boolean;
  json?: unknown;
  durationMs?: number;
  /** Nomes em minúsculas. */
  headers?: Record<string, string>;
  /** Corpo como veio, sem máscara (a máscara é aplicada ao mostrar). */
  bodyText?: string;
}

const MAX_SHOWN = 160;

/** Valor como aparece no resultado: texto curto, JSON compacto para objetos e listas. */
export function showValue(value: unknown): string {
  if (value === undefined) return '(campo não existe)';
  if (value === null) return 'null';
  const text = typeof value === 'string' ? `"${value}"` : JSON.stringify(value);
  return text.length > MAX_SHOWN ? `${text.slice(0, MAX_SHOWN)}…` : text;
}

/** `2xx`, `200`, `200-299`: o status cai em algum dos itens da lista? */
export function statusMatchesList(status: number, list: string): boolean {
  return list
    .split(/[,;\s]+/)
    .filter(Boolean)
    .some((item) => {
      const range = /^([1-5])xx$/i.exec(item);
      if (range) return Math.floor(status / 100) === Number(range[1]);
      const span = /^(\d{3})-(\d{3})$/.exec(item);
      if (span) return status >= Number(span[1]) && status <= Number(span[2]);
      return Number(item) === status;
    });
}

const toNumber = (value: unknown): number => (typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.')));

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  return typeof value === 'object' && Object.keys(value as object).length === 0;
}

function evaluateStatus(rule: ApiRule, status: number): { passed: boolean; actual: string } {
  const expected = rule.expected?.trim() ?? '';
  const actual = String(status);
  if (rule.operator === 'in') return { passed: statusMatchesList(status, expected), actual };
  const same = Number(expected) === status;
  return { passed: rule.operator === 'not-equals' ? !same : same, actual };
}

function evaluateJson(rule: ApiRule, json: unknown): { passed: boolean; actual: string } {
  const value = extractJsonPath(json, rule.path?.trim() ?? '');
  const expected = rule.expected?.trim() ?? '';
  const actual = showValue(value);
  switch (rule.operator) {
    case 'exists':
      return { passed: value !== undefined, actual };
    case 'not-exists':
      return { passed: value === undefined, actual };
    case 'not-empty':
      return { passed: !isEmptyValue(value), actual };
    case 'equals':
      return { passed: value !== undefined && areValuesEquivalent(value, expected), actual };
    case 'not-equals':
      // Campo ausente não conta como "diferente": a regra fala de um valor que precisa existir
      return { passed: value !== undefined && !areValuesEquivalent(value, expected), actual };
    case 'contains':
      if (Array.isArray(value)) return { passed: value.some((item) => areValuesEquivalent(item, expected)), actual };
      return { passed: value !== undefined && value !== null && String(value).includes(expected), actual };
    case 'greater':
    case 'less': {
      const a = toNumber(value);
      const b = toNumber(expected);
      if (value === undefined || Number.isNaN(a) || Number.isNaN(b)) return { passed: false, actual };
      return { passed: rule.operator === 'greater' ? a > b : a < b, actual };
    }
    case 'length-equals': {
      const length = Array.isArray(value) || typeof value === 'string' ? value.length : undefined;
      return { passed: length !== undefined && length === toNumber(expected), actual: length === undefined ? actual : `${length} item(ns)` };
    }
    default:
      return { passed: false, actual };
  }
}

function evaluateDuration(rule: ApiRule, durationMs: number): { passed: boolean; actual: string } {
  const limit = toNumber(rule.expected);
  return { passed: rule.operator === 'greater' ? durationMs > limit : durationMs < limit, actual: `${durationMs} ms` };
}

function evaluateHeader(rule: ApiRule, headers: Record<string, string>): { passed: boolean; actual: string } {
  const value = headers[rule.path?.trim().toLowerCase() ?? ''];
  const actual = value === undefined ? '(cabeçalho ausente)' : `"${value}"`;
  const expected = rule.expected?.trim() ?? '';
  switch (rule.operator) {
    case 'exists':
      return { passed: value !== undefined, actual };
    case 'not-exists':
      return { passed: value === undefined, actual };
    case 'equals':
      return { passed: value !== undefined && value.trim().toLowerCase() === expected.toLowerCase(), actual };
    case 'contains':
      return { passed: value !== undefined && value.toLowerCase().includes(expected.toLowerCase()), actual };
    default:
      return { passed: false, actual };
  }
}

const MAX_SEARCHED_BODY = 2 * 1024 * 1024;
// A expressão é de quem monta o cenário (tela ou MCP): limitar tamanho e texto evita travar o processo num backtracking
const MAX_REGEX_LENGTH = 300;
const MAX_REGEX_BODY = 256 * 1024;

function evaluateBody(rule: ApiRule, body: string): { passed: boolean; actual: string } {
  const text = body.slice(0, MAX_SEARCHED_BODY);
  const expected = rule.expected ?? '';
  if (rule.operator === 'matches') {
    if (expected.length > MAX_REGEX_LENGTH) return { passed: false, actual: `expressão maior que ${MAX_REGEX_LENGTH} caracteres` };
    let found: RegExpExecArray | null = null;
    try {
      found = new RegExp(expected).exec(text.slice(0, MAX_REGEX_BODY));
    } catch {
      return { passed: false, actual: 'expressão regular inválida' };
    }
    return { passed: !!found, actual: found ? `encontrou "${showText(found[0])}"` : 'nada casou com a expressão' };
  }
  const has = text.includes(expected);
  return { passed: rule.operator === 'not-contains' ? !has : has, actual: has ? 'o texto aparece no corpo' : 'o texto não aparece no corpo' };
}

const showText = (text: string) => (text.length > 80 ? `${text.slice(0, 80)}…` : text);

/** Confronta a resposta com uma regra. Sem resposta reprova tudo; resposta que não é JSON reprova as regras de JSON. */
export function evaluateRule(rule: ApiRule, response: EvaluatedResponse): ApiRuleResult {
  const label = describeRule(rule);
  const expected = rule.kind === 'duration' ? `${rule.expected?.trim()} ms` : rule.expected?.trim() || '—';
  const base = { ruleId: rule.id, label, expected };
  if (response.status === 0) return { ...base, passed: false, actual: 'sem resposta' };
  if (rule.kind === 'status') return { ...base, ...evaluateStatus(rule, response.status) };
  if (rule.kind === 'duration') return { ...base, ...evaluateDuration(rule, response.durationMs ?? 0) };
  if (rule.kind === 'header') return { ...base, ...evaluateHeader(rule, response.headers ?? {}) };
  if (rule.kind === 'body') return { ...base, ...evaluateBody(rule, response.bodyText ?? '') };
  if (!response.isJson) return { ...base, passed: false, actual: 'a resposta não é JSON' };
  return { ...base, ...evaluateJson(rule, response.json) };
}

/** Valor que a consulta devolveu: primeira coluna da primeira linha, ou o motivo de não ter valor. */
export type DbLookup = { value: unknown } | { problem: string };

/**
 * Campo × banco: compara o campo da resposta com o valor do banco, com a mesma tolerância das regras de JSON
 * (número como texto, vírgula decimal, S/N). O "esperado" mostrado é o valor do banco.
 */
export function evaluateDbRule(rule: ApiRule, response: EvaluatedResponse, lookup: DbLookup): ApiRuleResult {
  const label = describeRule(rule);
  if (response.status === 0) return { ruleId: rule.id, label, expected: '—', passed: false, actual: 'sem resposta' };
  if ('problem' in lookup) return { ruleId: rule.id, label, expected: lookup.problem, passed: false, actual: '—' };
  const expected = showValue(lookup.value);
  if (!response.isJson) return { ruleId: rule.id, label, expected, passed: false, actual: 'a resposta não é JSON' };
  const value = extractJsonPath(response.json, rule.path?.trim() ?? '');
  const actual = showValue(value);
  let passed = false;
  if (value !== undefined) {
    if (rule.operator === 'equals') passed = areValuesEquivalent(value, lookup.value);
    else if (rule.operator === 'not-equals') passed = !areValuesEquivalent(value, lookup.value);
    else {
      const a = toNumber(value);
      const b = toNumber(lookup.value);
      passed = !Number.isNaN(a) && !Number.isNaN(b) && (rule.operator === 'greater' ? a > b : a < b);
    }
  }
  return { ruleId: rule.id, label, expected, passed, actual };
}
