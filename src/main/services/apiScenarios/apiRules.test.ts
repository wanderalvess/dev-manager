import { describe, expect, it } from 'vitest';
import type { ApiRule } from '../../../shared/apiScenarioTypes';
import { evaluateDbRule, evaluateRule, statusMatchesList } from './apiRules';

const json = {
  codigo: 42,
  nome: 'Filial 1',
  ativo: 'S',
  preco: '10,50',
  itens: [{ codprod: 1 }, { codprod: 2 }],
  tags: ['wta', 'pdv'],
  vazio: [],
  nulo: null
};
const ok = { status: 200, isJson: true, json };
const rule = (partial: Partial<ApiRule>): ApiRule => ({ id: 'r1', kind: 'json', operator: 'equals', ...partial });

describe('statusMatchesList', () => {
  it('aceita número, faixa 2xx e intervalo', () => {
    expect(statusMatchesList(201, '200, 201')).toBe(true);
    expect(statusMatchesList(204, '2xx')).toBe(true);
    expect(statusMatchesList(404, '2xx; 3xx')).toBe(false);
    expect(statusMatchesList(250, '200-299')).toBe(true);
  });
});

describe('evaluateRule: status', () => {
  it('igual, diferente e lista', () => {
    expect(evaluateRule(rule({ kind: 'status', expected: '200' }), ok).passed).toBe(true);
    expect(evaluateRule(rule({ kind: 'status', operator: 'not-equals', expected: '500' }), ok).passed).toBe(true);
    expect(evaluateRule(rule({ kind: 'status', operator: 'in', expected: '4xx' }), ok)).toMatchObject({ passed: false, actual: '200' });
  });

  it('sem resposta reprova qualquer regra', () => {
    expect(evaluateRule(rule({ kind: 'status', expected: '200' }), { status: 0, isJson: false })).toMatchObject({ passed: false, actual: 'sem resposta' });
  });
});

describe('evaluateRule: JSON', () => {
  it('igual tolera número como texto, vírgula decimal e S/N', () => {
    expect(evaluateRule(rule({ path: '$.codigo', expected: '42' }), ok).passed).toBe(true);
    expect(evaluateRule(rule({ path: '$.preco', expected: '10.5' }), ok).passed).toBe(true);
    expect(evaluateRule(rule({ path: '$.ativo', expected: 'true' }), ok).passed).toBe(true);
    expect(evaluateRule(rule({ path: '$.nome', expected: 'Filial 2' }), ok)).toMatchObject({ passed: false, actual: '"Filial 1"' });
  });

  it('caminhos com índice de lista', () => {
    expect(evaluateRule(rule({ path: '$.itens[1].codprod', expected: '2' }), ok).passed).toBe(true);
  });

  it('existe, não existe e não vazio', () => {
    expect(evaluateRule(rule({ path: '$.codigo', operator: 'exists' }), ok).passed).toBe(true);
    expect(evaluateRule(rule({ path: '$.semCampo', operator: 'exists' }), ok)).toMatchObject({ passed: false, actual: '(campo não existe)' });
    expect(evaluateRule(rule({ path: '$.semCampo', operator: 'not-exists' }), ok).passed).toBe(true);
    expect(evaluateRule(rule({ path: '$.vazio', operator: 'not-empty' }), ok).passed).toBe(false);
    expect(evaluateRule(rule({ path: '$.nulo', operator: 'not-empty' }), ok).passed).toBe(false);
    expect(evaluateRule(rule({ path: '$.tags', operator: 'not-empty' }), ok).passed).toBe(true);
  });

  it('diferente exige que o campo exista', () => {
    expect(evaluateRule(rule({ path: '$.codigo', operator: 'not-equals', expected: '1' }), ok).passed).toBe(true);
    expect(evaluateRule(rule({ path: '$.semCampo', operator: 'not-equals', expected: '1' }), ok).passed).toBe(false);
  });

  it('contém em texto e em lista', () => {
    expect(evaluateRule(rule({ path: '$.nome', operator: 'contains', expected: 'Filial' }), ok).passed).toBe(true);
    expect(evaluateRule(rule({ path: '$.tags', operator: 'contains', expected: 'pdv' }), ok).passed).toBe(true);
    expect(evaluateRule(rule({ path: '$.tags', operator: 'contains', expected: 'ch' }), ok).passed).toBe(false);
  });

  it('maior, menor e quantidade de itens', () => {
    expect(evaluateRule(rule({ path: '$.codigo', operator: 'greater', expected: '40' }), ok).passed).toBe(true);
    expect(evaluateRule(rule({ path: '$.preco', operator: 'less', expected: '11' }), ok).passed).toBe(true);
    expect(evaluateRule(rule({ path: '$.nome', operator: 'greater', expected: '1' }), ok).passed).toBe(false);
    expect(evaluateRule(rule({ path: '$.itens', operator: 'length-equals', expected: '2' }), ok)).toMatchObject({ passed: true, actual: '2 item(ns)' });
  });

  it('resposta que não é JSON reprova as regras de JSON, mas não as de status', () => {
    const html = { status: 200, isJson: false };
    expect(evaluateRule(rule({ path: '$.codigo', operator: 'exists' }), html)).toMatchObject({ passed: false, actual: 'a resposta não é JSON' });
    expect(evaluateRule(rule({ kind: 'status', expected: '200' }), html).passed).toBe(true);
  });

  it('o rótulo descreve a regra em português', () => {
    expect(evaluateRule(rule({ path: '$.itens', operator: 'length-equals', expected: '2' }), ok).label).toBe('Campo $.itens com quantidade de itens igual a 2');
  });
});

describe('evaluateRule: tempo, cabeçalho e corpo', () => {
  const full = {
    status: 200,
    isJson: true,
    json,
    durationMs: 350,
    headers: { 'content-type': 'application/json; charset=utf-8', 'x-request-id': 'abc' },
    bodyText: '{"codigo": 42, "nome": "Filial 1"}'
  };

  it('tempo de resposta menor ou maior que o limite', () => {
    expect(evaluateRule(rule({ kind: 'duration', operator: 'less', expected: '2000' }), full)).toMatchObject({ passed: true, actual: '350 ms', expected: '2000 ms' });
    expect(evaluateRule(rule({ kind: 'duration', operator: 'less', expected: '100' }), full).passed).toBe(false);
  });

  it('cabeçalho: nome sem diferenciar maiúsculas, existe, igual e contém', () => {
    expect(evaluateRule(rule({ kind: 'header', path: 'Content-Type', operator: 'contains', expected: 'JSON' }), full).passed).toBe(true);
    expect(evaluateRule(rule({ kind: 'header', path: 'x-request-id', operator: 'equals', expected: 'abc' }), full).passed).toBe(true);
    expect(evaluateRule(rule({ kind: 'header', path: 'x-powered-by', operator: 'not-exists' }), full).passed).toBe(true);
    expect(evaluateRule(rule({ kind: 'header', path: 'x-powered-by', operator: 'exists' }), full)).toMatchObject({ passed: false, actual: '(cabeçalho ausente)' });
  });

  it('corpo: contém, não contém e expressão regular', () => {
    expect(evaluateRule(rule({ kind: 'body', operator: 'contains', expected: 'Filial 1' }), full).passed).toBe(true);
    expect(evaluateRule(rule({ kind: 'body', operator: 'not-contains', expected: 'Exception' }), full).passed).toBe(true);
    expect(evaluateRule(rule({ kind: 'body', operator: 'matches', expected: '"codigo":\\s*\\d+' }), full)).toMatchObject({ passed: true, actual: 'encontrou ""codigo": 42"' });
    expect(evaluateRule(rule({ kind: 'body', operator: 'matches', expected: '(' }), full)).toMatchObject({ passed: false, actual: 'expressão regular inválida' });
    expect(evaluateRule(rule({ kind: 'body', operator: 'matches', expected: 'a'.repeat(301) }), full).passed).toBe(false);
  });
});

describe('evaluateDbRule', () => {
  it('compara o campo com o valor do banco, que vira o esperado', () => {
    expect(evaluateDbRule(rule({ kind: 'db', path: '$.nome' }), ok, { value: 'Filial 1' })).toMatchObject({ passed: true, expected: '"Filial 1"' });
    expect(evaluateDbRule(rule({ kind: 'db', path: '$.codigo' }), ok, { value: 42 }).passed).toBe(true);
    expect(evaluateDbRule(rule({ kind: 'db', path: '$.codigo', operator: 'greater' }), ok, { value: '41' }).passed).toBe(true);
    expect(evaluateDbRule(rule({ kind: 'db', path: '$.codigo', operator: 'not-equals' }), ok, { value: 42 }).passed).toBe(false);
  });

  it('problema na consulta reprova e aparece no esperado', () => {
    expect(evaluateDbRule(rule({ kind: 'db', path: '$.nome' }), ok, { problem: 'a consulta não devolveu nenhuma linha' })).toMatchObject({
      passed: false,
      expected: 'a consulta não devolveu nenhuma linha'
    });
  });

  it('campo ausente na resposta reprova', () => {
    expect(evaluateDbRule(rule({ kind: 'db', path: '$.semCampo' }), ok, { value: 1 })).toMatchObject({ passed: false, actual: '(campo não existe)' });
  });
});
