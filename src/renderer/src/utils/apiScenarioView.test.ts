import { describe, expect, it } from 'vitest';
import { changeRule, isSameScenario, newRule, newScenario, scenarioProblem } from './apiScenarioView';

describe('apiScenarioView', () => {
  it('cenário novo já confere status 200 e pede a URL', () => {
    const scenario = newScenario();
    expect(scenario.rules[0]).toMatchObject({ kind: 'status', operator: 'equals', expected: '200' });
    expect(scenarioProblem(scenario)).toContain('URL');
    expect(scenarioProblem({ ...scenario, url: '{{wtaUrl}}/winthor/filiais' })).toBeNull();
  });

  it('trocar o tipo da regra recomeça com um operador válido e mantém o id', () => {
    const status = newRule('status');
    const json = changeRule(status, { kind: 'json' });
    expect(json).toMatchObject({ id: status.id, kind: 'json', operator: 'exists' });
  });

  it('operador que não usa valor limpa o esperado', () => {
    const rule = changeRule({ ...newRule('json'), operator: 'equals', expected: 'x' }, { operator: 'not-empty' });
    expect(rule.expected).toBeUndefined();
  });

  it('aponta regra sem caminho ou sem valor e cabeçalho sem nome', () => {
    const base = { ...newScenario(), url: 'http://x/api' };
    expect(scenarioProblem({ ...base, rules: [{ id: 'r', kind: 'json', path: '', operator: 'exists' }] })).toContain('caminho');
    expect(scenarioProblem({ ...base, rules: [{ id: 'r', kind: 'json', path: '$.a', operator: 'equals' }] })).toContain('valor esperado');
    expect(scenarioProblem({ ...base, headers: [{ key: '', value: 'x' }] })).toContain('cabeçalho');
  });

  it('compara rascunho e salvo ignorando a data de atualização', () => {
    const a = { ...newScenario(), id: 's1', updatedAt: '2026-01-01' };
    expect(isSameScenario(a, { ...a, updatedAt: '2026-02-02' })).toBe(true);
    expect(isSameScenario(a, { ...a, name: 'Outro' })).toBe(false);
  });
});
