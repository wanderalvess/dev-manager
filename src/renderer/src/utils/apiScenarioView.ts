import { API_RULE_OPERATORS, ruleNeedsValue, ruleProblem } from '../../../shared/apiRuleText';
import type { ApiRule, ApiRuleKind, ApiRuleOperator, ApiScenario } from '../../../shared/apiScenarioTypes';

let seq = 0;
/** Id local para itens novos da tela; o service troca por um definitivo ao salvar. */
export function localId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
}

/** Regra nova já com um exemplo que costuma servir, para a pessoa só ajustar. */
export function newRule(kind: ApiRuleKind = 'json'): ApiRule {
  const id = localId('r');
  switch (kind) {
    case 'status':
      return { id, kind, operator: 'equals', expected: '200' };
    case 'duration':
      return { id, kind, operator: 'less', expected: '2000' };
    case 'header':
      return { id, kind, path: 'content-type', operator: 'contains', expected: 'json' };
    case 'body':
      return { id, kind, operator: 'contains', expected: '' };
    case 'db':
      return { id, kind, path: '$.', operator: 'equals', connectionId: '', sql: '', bindPath: '' };
    case 'leak':
      return { id, kind, operator: 'not-contains' };
    case 'log':
      return { id, kind, operator: 'contains', expected: '{{requestId}}', logSource: 'any' };
    default:
      return { id, kind, path: '$.', operator: 'exists' };
  }
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
export function changeRule(
  rule: ApiRule,
  patch: Partial<Pick<ApiRule, 'kind' | 'operator' | 'path' | 'expected' | 'connectionId' | 'sql' | 'bindPath' | 'logSource'>>
): ApiRule {
  const next: ApiRule = { ...rule, ...patch };
  if (patch.kind && patch.kind !== rule.kind) {
    const fresh = newRule(patch.kind);
    return { ...fresh, id: rule.id };
  }
  if (!API_RULE_OPERATORS[next.kind].includes(next.operator)) next.operator = API_RULE_OPERATORS[next.kind][0] as ApiRuleOperator;
  if (!ruleNeedsValue(next.operator, next.kind)) delete next.expected;
  return next;
}

/**
 * Modelo "Exceção não mapeada": o QA força a API a cair num erro que o código não trata (campo desconhecido, tipo
 * errado, valor fora da faixa) e o cenário confere se o erro foi tratado: 4xx em vez de 500, resposta de erro em
 * JSON, nenhum detalhe interno vazado e o erro registrado no log. Só falta a rota e o corpo que forçam o erro.
 */
export function newExceptionScenario(): ApiScenario {
  return {
    id: '',
    name: 'Exceção não mapeada — (rota)',
    method: 'POST',
    url: '{{wtaUrl}}/winthor/',
    headers: [],
    body: '{ "campoQueNaoExiste": "{{requestId}}" }',
    auth: 'settings-wta',
    rules: [
      { ...newRule('status'), operator: 'in', expected: '4xx' },
      // UNK-ERR é o código que o WTA dá à exceção que nenhum tratador reconheceu
      { ...newRule('json'), path: '$.code', operator: 'not-equals', expected: 'UNK-ERR' },
      newRule('header'),
      { ...newRule('body'), operator: 'matches', expected: '"(message|mensagem|erro|error)"\\s*:' },
      newRule('leak'),
      newRule('log')
    ]
  };
}

/** O primeiro problema que impede salvar ou rodar o rascunho; nulo quando está pronto. */
export function scenarioProblem(scenario: ApiScenario): string | null {
  if (!scenario.name.trim()) return 'Dê um nome ao cenário.';
  if (!scenario.url.trim() || scenario.url.trim() === '{{wtaUrl}}/') return 'Informe a URL da API.';
  if (scenario.url.trim() === '{{wtaUrl}}/winthor/') return 'Informe a rota da API que vai receber o erro forçado.';
  if (scenario.rules.length === 0) return 'Adicione ao menos uma regra.';
  for (const rule of scenario.rules) {
    const problem = ruleProblem(rule);
    if (problem) return problem;
  }
  if (scenario.headers.some((h) => !h.key.trim() && h.value.trim())) return 'Há um cabeçalho com valor e sem nome.';
  return null;
}

/** Rascunho novo que ninguém mexeu (igual a um dos modelos): trocar por outro não perde nada. */
export function isUntouchedDraft(draft: ApiScenario): boolean {
  if (draft.id) return false;
  const shape = (s: ApiScenario) => JSON.stringify({ ...s, rules: s.rules.map(({ id: _id, ...rest }) => rest) });
  return [newScenario(), newExceptionScenario()].some((template) => shape(template) === shape(draft));
}

export function isSameScenario(a: ApiScenario | undefined, b: ApiScenario | undefined): boolean {
  const strip = (s?: ApiScenario) => (s ? JSON.stringify({ ...s, updatedAt: undefined }) : '');
  return strip(a) === strip(b);
}
