import { describe, expect, it } from 'vitest';
import { API_RULE_KIND_LABELS } from '../../../../../shared/apiRuleText';
import { AUTH_LOCKOUT_CHECKS } from '../../../../../shared/authLockoutCatalog';
import {
  SCENARIO_GUIDE_API_RULES,
  SCENARIO_GUIDE_BUTTONS,
  SCENARIO_GUIDE_EXCEPTION_RECIPES,
  SCENARIO_GUIDE_LOCATIONS,
  SCENARIO_GUIDE_LOCKOUT_CHECKS,
  SCENARIO_GUIDE_PROBLEMS,
  SCENARIO_GUIDE_SETUP,
  SCENARIO_GUIDE_STATUSES
} from './scenarioGuideData';

describe('manual da Validação de Cenários', () => {
  it('lista todas as regras do Bloqueio de Login, na ordem da tela', () => {
    expect(SCENARIO_GUIDE_LOCKOUT_CHECKS.map((r) => r.name)).toEqual(AUTH_LOCKOUT_CHECKS.map((c) => c.title));
  });

  it('lista todos os tipos de regra da Validação de API, com operadores e exemplo', () => {
    expect(SCENARIO_GUIDE_API_RULES.map((r) => r.name)).toEqual(Object.values(API_RULE_KIND_LABELS));
    expect(SCENARIO_GUIDE_API_RULES.find((r) => r.name === 'Status HTTP')?.text).toBe('igual a, um destes, diferente de');
  });

  it('explica os status que aparecem no resultado, sem os de andamento', () => {
    expect(SCENARIO_GUIDE_STATUSES.map((r) => r.name)).toEqual(['OK', 'Falhou', 'Atenção', 'Observado', 'Manual', 'Não executada']);
  });

  it('a receita de número inválido é o caso real do UNK-ERR', () => {
    expect(SCENARIO_GUIDE_EXCEPTION_RECIPES[0]).toMatchObject({ name: 'Texto onde vai número' });
    expect(SCENARIO_GUIDE_EXCEPTION_RECIPES[0].extra).toContain('For input string');
  });

  it('nenhuma célula das tabelas fica vazia', () => {
    const tables = [
      SCENARIO_GUIDE_SETUP,
      SCENARIO_GUIDE_LOCKOUT_CHECKS,
      SCENARIO_GUIDE_API_RULES,
      SCENARIO_GUIDE_EXCEPTION_RECIPES,
      SCENARIO_GUIDE_BUTTONS,
      SCENARIO_GUIDE_PROBLEMS
    ];
    for (const rows of tables) {
      for (const row of rows) expect([row.name, row.text, row.extra].every((cell) => (cell ?? '').trim().length > 0), row.name).toBe(true);
    }
    expect(SCENARIO_GUIDE_LOCATIONS.every((row) => row.name && row.text)).toBe(true);
  });
});
