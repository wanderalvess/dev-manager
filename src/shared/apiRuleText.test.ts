import { describe, expect, it } from 'vitest';
import { API_RULE_OPERATORS, describeRule, ruleNeedsValue, ruleProblem } from './apiRuleText';
import type { ApiRule } from './apiScenarioTypes';

const rule = (partial: Partial<ApiRule>): ApiRule => ({ id: 'r', kind: 'json', operator: 'equals', ...partial });

describe('describeRule', () => {
  it('descreve cada tipo em português', () => {
    expect(describeRule(rule({ kind: 'status', expected: '200' }))).toBe('Status igual a 200');
    expect(describeRule(rule({ kind: 'duration', operator: 'less', expected: '2000' }))).toBe('Tempo de resposta menor que 2000 ms');
    expect(describeRule(rule({ kind: 'header', path: 'Content-Type', operator: 'contains', expected: 'json' }))).toBe('Cabeçalho content-type contém json');
    expect(describeRule(rule({ kind: 'body', operator: 'not-contains', expected: 'erro' }))).toBe('Corpo não contém "erro"');
    expect(describeRule(rule({ path: '$.itens', operator: 'not-empty' }))).toBe('Campo $.itens não está vazio');
    expect(describeRule(rule({ kind: 'db', path: '$.nome' }))).toBe('Campo $.nome igual ao valor do banco');
    expect(describeRule(rule({ kind: 'db', path: '$.total', operator: 'greater' }))).toBe('Campo $.total maior que o valor do banco');
  });
});

describe('ruleProblem', () => {
  it('cada tipo só aceita os seus operadores', () => {
    expect(ruleProblem(rule({ kind: 'duration', operator: 'equals', expected: '1' }))).toContain('não vale');
    expect(Object.values(API_RULE_OPERATORS).every((ops) => ops.length > 0)).toBe(true);
  });

  it('pede o que falta em cada tipo', () => {
    expect(ruleProblem(rule({ kind: 'header', operator: 'exists' }))).toContain('nome do cabeçalho');
    expect(ruleProblem(rule({ kind: 'duration', operator: 'less', expected: 'rápido' }))).toContain('milissegundos');
    expect(ruleProblem(rule({ kind: 'body', operator: 'matches', expected: '(' }))).toContain('inválida');
    expect(ruleProblem(rule({ kind: 'db', path: '$.a', sql: 'SELECT 1 FROM DUAL' }))).toContain('conexão');
    expect(ruleProblem(rule({ kind: 'db', path: '$.a', connectionId: 'c', sql: 'DROP TABLE PCFILIAL' }))).toContain('somente leitura');
    expect(ruleProblem(rule({ kind: 'db', path: '$.a', connectionId: 'c', sql: 'SELECT 1 FROM DUAL' }))).toBeNull();
  });

  it('banco não usa valor esperado digitado', () => {
    expect(ruleNeedsValue('equals', 'db')).toBe(false);
    expect(ruleNeedsValue('equals', 'json')).toBe(true);
  });
});

describe('regras de exceção', () => {
  it('sem vazamento não pede valor; registro no log pede o texto e diz onde procura', () => {
    expect(ruleProblem(rule({ kind: 'leak', operator: 'not-contains' }))).toBeNull();
    expect(describeRule(rule({ kind: 'log', operator: 'contains', expected: '{{requestId}}', logSource: 'file' }))).toBe('winthor.log registra "{{requestId}}"');
    expect(ruleProblem(rule({ kind: 'log', operator: 'contains', expected: '' }))).toContain('valor esperado');
  });
});
