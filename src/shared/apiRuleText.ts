import type { ApiRule, ApiRuleKind, ApiRuleOperator } from './apiScenarioTypes';

/** Operadores oferecidos para cada tipo de regra, na ordem do seletor da tela. */
export const API_RULE_OPERATORS: Record<ApiRuleKind, readonly ApiRuleOperator[]> = {
  status: ['equals', 'in', 'not-equals'],
  json: ['equals', 'not-equals', 'contains', 'exists', 'not-exists', 'not-empty', 'greater', 'less', 'length-equals']
};

export const API_RULE_OPERATOR_LABELS: Record<ApiRuleOperator, string> = {
  equals: 'igual a',
  'not-equals': 'diferente de',
  in: 'um destes',
  contains: 'contém',
  exists: 'existe',
  'not-exists': 'não existe',
  'not-empty': 'não está vazio',
  greater: 'maior que',
  less: 'menor que',
  'length-equals': 'com quantidade de itens igual a'
};

/** Operadores que não usam valor esperado. */
export const OPERATORS_WITHOUT_VALUE: readonly ApiRuleOperator[] = ['exists', 'not-exists', 'not-empty'];

export function ruleNeedsValue(operator: ApiRuleOperator): boolean {
  return !OPERATORS_WITHOUT_VALUE.includes(operator);
}

/** A regra em português, para a tela, o passo a passo e o relatório. */
export function describeRule(rule: ApiRule): string {
  const subject = rule.kind === 'status' ? 'Status' : `Campo ${rule.path?.trim() || '(sem caminho)'}`;
  const op = API_RULE_OPERATOR_LABELS[rule.operator];
  return ruleNeedsValue(rule.operator) ? `${subject} ${op} ${rule.expected?.trim() || '(vazio)'}` : `${subject} ${op}`;
}

/** O que falta para a regra poder rodar; nulo quando está completa. */
export function ruleProblem(rule: ApiRule): string | null {
  if (!API_RULE_OPERATORS[rule.kind].includes(rule.operator)) return `Operador "${rule.operator}" não vale para ${rule.kind}.`;
  if (rule.kind === 'json' && !rule.path?.trim()) return 'Informe o caminho do campo no JSON (ex.: $.codigo).';
  if (ruleNeedsValue(rule.operator) && !rule.expected?.trim()) return `Informe o valor esperado em "${describeRule(rule)}".`;
  return null;
}
