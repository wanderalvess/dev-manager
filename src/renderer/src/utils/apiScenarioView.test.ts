import { describe, expect, it } from 'vitest';
import { changeRule, isSameScenario, isUntouchedDraft, newExceptionScenario, newRule, newScenario, scenarioProblem } from './apiScenarioView';

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

  it('modelo de exceção não mapeada: 4xx, sem UNK-ERR, JSON, formato de erro, sem vazamento e registro no log; falta só a rota', () => {
    const scenario = newExceptionScenario();
    expect(scenario.rules.map((r) => r.kind)).toEqual(['status', 'json', 'header', 'body', 'leak', 'log']);
    expect(scenario.rules[0]).toMatchObject({ operator: 'in', expected: '4xx' });
    expect(scenario.rules[1]).toMatchObject({ path: '$.code', operator: 'not-equals', expected: 'UNK-ERR' });
    expect(scenario.rules[5]).toMatchObject({ expected: '{{requestId}}', logSource: 'any' });
    expect(scenarioProblem(scenario)).toContain('rota');
    expect(scenarioProblem({ ...scenario, url: '{{wtaUrl}}/winthor/pedidos' })).toBeNull();
  });

  it('rascunho igual a um modelo não pede confirmação para ser trocado', () => {
    expect(isUntouchedDraft(newScenario())).toBe(true);
    expect(isUntouchedDraft(newExceptionScenario())).toBe(true);
    expect(isUntouchedDraft({ ...newScenario(), name: 'Mexido' })).toBe(false);
    expect(isUntouchedDraft({ ...newScenario(), id: 'salvo' })).toBe(false);
  });
});
