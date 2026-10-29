import { describeRule } from '../../../shared/apiRuleText';
import type { ApiRule, ApiRuleResult } from '../../../shared/apiScenarioTypes';
import { areValuesEquivalent, extractJsonPath } from '../../utils/qaRegressionUtils';

export interface EvaluatedResponse {
  /** 0 = sem resposta. */
  status: number;
  isJson: boolean;
  json?: unknown;
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

/** Confronta a resposta com uma regra. Sem resposta ou resposta que não é JSON reprovam as regras de JSON. */
export function evaluateRule(rule: ApiRule, response: EvaluatedResponse): ApiRuleResult {
  const label = describeRule(rule);
  const expected = rule.expected?.trim() || '—';
  const base = { ruleId: rule.id, label, expected };
  if (response.status === 0) return { ...base, passed: false, actual: 'sem resposta' };
  if (rule.kind === 'status') return { ...base, ...evaluateStatus(rule, response.status) };
  if (!response.isJson) return { ...base, passed: false, actual: 'a resposta não é JSON' };
  return { ...base, ...evaluateJson(rule, response.json) };
}
