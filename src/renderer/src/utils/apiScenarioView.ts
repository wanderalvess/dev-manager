import { API_RULE_OPERATORS, ruleNeedsValue, ruleProblem } from '../../../shared/apiRuleText';
import type { ApiRule, ApiRuleKind, ApiRuleOperator, ApiScenario } from '../../../shared/apiScenarioTypes';

let seq = 0;
/** Id local para itens novos da tela; o service troca por um definitivo ao salvar. */
export function localId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
}

export function newRule(kind: ApiRuleKind = 'json'): ApiRule {
  return kind === 'status'
    ? { id: localId('r'), kind, operator: 'equals', expected: '200' }
    : { id: localId('r'), kind, path: '$.', operator: 'exists' };
}

/** Cenário novo já com o que quase todo teste confere: status 200. */
export function newScenario(): ApiScenario {
  return {
    id: '',
    name: 'Novo cenário',
    method: 'GET',
    url: '{{wtaUrl}}/',
    headers: [],
    auth: 'settings-wta',
    rules: [newRule('status')]
  };
}

/** Troca o tipo ou o operador mantendo a regra válida (o operador antigo pode não existir no tipo novo). */
export function changeRule(rule: ApiRule, patch: Partial<Pick<ApiRule, 'kind' | 'operator' | 'path' | 'expected'>>): ApiRule {
  const next: ApiRule = { ...rule, ...patch };
  if (patch.kind && patch.kind !== rule.kind) {
    const fresh = newRule(patch.kind);
    return { ...fresh, id: rule.id };
  }
  if (!API_RULE_OPERATORS[next.kind].includes(next.operator)) next.operator = API_RULE_OPERATORS[next.kind][0] as ApiRuleOperator;
  if (!ruleNeedsValue(next.operator)) delete next.expected;
  return next;
}

/** O primeiro problema que impede salvar ou rodar o rascunho; nulo quando está pronto. */
export function scenarioProblem(scenario: ApiScenario): string | null {
  if (!scenario.name.trim()) return 'Dê um nome ao cenário.';
  if (!scenario.url.trim() || scenario.url.trim() === '{{wtaUrl}}/') return 'Informe a URL da API.';
  if (scenario.rules.length === 0) return 'Adicione ao menos uma regra.';
  for (const rule of scenario.rules) {
    const problem = ruleProblem(rule);
    if (problem) return problem;
  }
  if (scenario.headers.some((h) => !h.key.trim() && h.value.trim())) return 'Há um cabeçalho com valor e sem nome.';
  return null;
}

export function isSameScenario(a: ApiScenario | undefined, b: ApiScenario | undefined): boolean {
  const strip = (s?: ApiScenario) => (s ? JSON.stringify({ ...s, updatedAt: undefined }) : '');
  return strip(a) === strip(b);
}
