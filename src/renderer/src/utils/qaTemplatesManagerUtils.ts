import type {
  QaRegressionAssertion,
  QaRegressionStep,
  QaRegressionTemplate
} from '../../../shared/types';

/** Cria um template em branco com um passo e uma asserção de exemplo. */
export function createBlankTemplate(now: number = Date.now()): QaRegressionTemplate {
  const iso = new Date(now).toISOString();
  return {
    id: `template-${now}`,
    name: 'Novo Cenário de Teste Regressivo',
    description: 'Descrição do fluxo a ser homologado',
    category: 'Geral',
    author: 'QA',
    version: '1.0.0',
    createdAt: iso,
    updatedAt: iso,
    defaultVariables: { codFilial: '1', numCupom: '4387' },
    steps: [
      {
        id: `step-${now}`,
        title: 'Passo 1 — Validação de Registro',
        tableName: 'PCNFSAID',
        enabled: true,
        query: 'SELECT * FROM PCNFSAID WHERE CODFILIAL = :codFilial AND NUMNOTA = :numCupom',
        assertions: [
          {
            id: `ass-${now}`,
            column: 'CODFILIAL',
            expectedType: 'literal',
            expectedValue: '1'
          }
        ]
      }
    ]
  };
}

export function duplicateTemplate(
  tmpl: QaRegressionTemplate,
  now: number = Date.now()
): QaRegressionTemplate {
  const iso = new Date(now).toISOString();
  return {
    ...tmpl,
    id: `${tmpl.id}-copia-${now}`,
    name: `${tmpl.name} (Cópia)`,
    createdAt: iso,
    updatedAt: iso
  };
}

export function createNewStep(stepCount: number, now: number = Date.now()): QaRegressionStep {
  return {
    id: `step-${now}`,
    title: `Novo Passo ${stepCount + 1}`,
    tableName: 'PCPEDC',
    enabled: true,
    query: 'SELECT * FROM PCPEDC WHERE CODFILIAL = :codFilial AND NUMCUPOM = :numCupom',
    assertions: []
  };
}

export function createNewAssertion(now: number = Date.now()): QaRegressionAssertion {
  return {
    id: `ass-${now}`,
    column: 'VLTOTAL',
    expectedType: 'jsonPath',
    expectedValue: '$.vlTotal'
  };
}

/** Substitui um passo por índice sem mutar o array original. */
export function replaceStepAt(
  template: QaRegressionTemplate,
  stepIndex: number,
  step: QaRegressionStep
): QaRegressionTemplate {
  const steps = [...template.steps];
  steps[stepIndex] = step;
  return { ...template, steps };
}

/** Substitui uma asserção de um passo por índice sem mutar o original. */
export function replaceAssertionAt(
  template: QaRegressionTemplate,
  stepIndex: number,
  assertionIndex: number,
  assertion: QaRegressionAssertion
): QaRegressionTemplate {
  const step = template.steps[stepIndex];
  const assertions = [...step.assertions];
  assertions[assertionIndex] = assertion;
  return replaceStepAt(template, stepIndex, { ...step, assertions });
}

/** Mantém o índice ativo dentro dos limites após remover um passo. */
export function clampActiveIndex(activeIndex: number, remainingCount: number): number {
  return activeIndex >= remainingCount ? Math.max(0, remainingCount - 1) : activeIndex;
}

export function isValidImportedTemplate(value: Partial<QaRegressionTemplate>): boolean {
  return Boolean(value.id && value.name && Array.isArray(value.steps));
}

export function countAssertions(tmpl: QaRegressionTemplate): number {
  return tmpl.steps.reduce((acc, s) => acc + s.assertions.length, 0);
}
