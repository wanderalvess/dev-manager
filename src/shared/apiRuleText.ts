import type { ApiRule, ApiRuleKind, ApiRuleOperator } from './apiScenarioTypes';
import { isReadOnlySql } from './sqlSplitUtils';

/** Operadores oferecidos para cada tipo de regra, na ordem do seletor da tela. */
export const API_RULE_OPERATORS: Record<ApiRuleKind, readonly ApiRuleOperator[]> = {
  status: ['equals', 'in', 'not-equals'],
  duration: ['less', 'greater'],
  header: ['exists', 'not-exists', 'equals', 'contains'],
  body: ['contains', 'not-contains', 'matches'],
  json: ['equals', 'not-equals', 'contains', 'exists', 'not-exists', 'not-empty', 'greater', 'less', 'length-equals'],
  db: ['equals', 'not-equals', 'greater', 'less']
};

export const API_RULE_KIND_LABELS: Record<ApiRuleKind, string> = {
  status: 'Status HTTP',
  duration: 'Tempo de resposta',
  header: 'Cabeçalho',
  body: 'Texto do corpo',
  json: 'Campo do JSON',
  db: 'Campo × banco'
};

export const API_RULE_OPERATOR_LABELS: Record<ApiRuleOperator, string> = {
  equals: 'igual a',
  'not-equals': 'diferente de',
  in: 'um destes',
  contains: 'contém',
  'not-contains': 'não contém',
  matches: 'casa com a expressão',
  exists: 'existe',
  'not-exists': 'não existe',
  'not-empty': 'não está vazio',
  greater: 'maior que',
  less: 'menor que',
  'length-equals': 'com quantidade de itens igual a'
};

/** No "Campo × banco" o operador se liga ao valor do banco: "igual ao", "maior que o". */
export const DB_OPERATOR_LABELS: Partial<Record<ApiRuleOperator, string>> = {
  equals: 'igual ao',
  'not-equals': 'diferente do',
  greater: 'maior que o',
  less: 'menor que o'
};

/** Operadores que não usam valor esperado. */
export const OPERATORS_WITHOUT_VALUE: readonly ApiRuleOperator[] = ['exists', 'not-exists', 'not-empty'];

/** Em db o valor esperado vem da consulta, nunca digitado. */
export function ruleNeedsValue(operator: ApiRuleOperator, kind?: ApiRuleKind): boolean {
  return kind !== 'db' && !OPERATORS_WITHOUT_VALUE.includes(operator);
}

const subjectOf = (rule: ApiRule): string => {
  const path = rule.path?.trim() || '(sem caminho)';
  switch (rule.kind) {
    case 'status':
      return 'Status';
    case 'duration':
      return 'Tempo de resposta';
    case 'header':
      return `Cabeçalho ${rule.path?.trim().toLowerCase() || '(sem nome)'}`;
    case 'body':
      return 'Corpo';
    default:
      return `Campo ${path}`;
  }
};

/** A regra em português, para a tela, o passo a passo e o relatório. */
export function describeRule(rule: ApiRule): string {
  const subject = subjectOf(rule);
  const op = API_RULE_OPERATOR_LABELS[rule.operator];
  if (rule.kind === 'db') return `${subject} ${DB_OPERATOR_LABELS[rule.operator] ?? op} valor do banco`;
  if (!ruleNeedsValue(rule.operator, rule.kind)) return `${subject} ${op}`;
  const value = rule.expected?.trim() || '(vazio)';
  if (rule.kind === 'duration') return `${subject} ${op} ${value} ms`;
  if (rule.kind === 'body' && rule.operator !== 'matches') return `${subject} ${op} "${value}"`;
  return `${subject} ${op} ${value}`;
}

/** O que falta para a regra poder rodar; nulo quando está completa. */
export function ruleProblem(rule: ApiRule): string | null {
  if (!API_RULE_OPERATORS[rule.kind]?.includes(rule.operator)) return `Operador "${rule.operator}" não vale para ${rule.kind}.`;
  if ((rule.kind === 'json' || rule.kind === 'db') && !rule.path?.trim()) return 'Informe o caminho do campo no JSON (ex.: $.codigo).';
  if (rule.kind === 'header' && !rule.path?.trim()) return 'Informe o nome do cabeçalho (ex.: content-type).';
  if (ruleNeedsValue(rule.operator, rule.kind) && !rule.expected?.trim()) return `Informe o valor esperado em "${describeRule(rule)}".`;
  if (rule.kind === 'duration' && !(Number(rule.expected) > 0)) return 'O tempo de resposta é em milissegundos (ex.: 2000).';
  if (rule.kind === 'body' && rule.operator === 'matches') {
    if ((rule.expected ?? '').length > 300) return 'A expressão regular pode ter no máximo 300 caracteres.';
    try {
      new RegExp(rule.expected ?? '');
    } catch {
      return `Expressão regular inválida: ${rule.expected}`;
    }
  }
  if (rule.kind === 'db') {
    if (!rule.connectionId?.trim()) return 'Escolha a conexão do banco na regra "Campo × banco".';
    if (!rule.sql?.trim()) return 'Escreva a consulta da regra "Campo × banco".';
    if (!isReadOnlySql(rule.sql)) return 'A consulta da regra "Campo × banco" precisa ser somente leitura (SELECT).';
  }
  return null;
}
