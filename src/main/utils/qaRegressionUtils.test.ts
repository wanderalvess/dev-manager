import { describe, it, expect } from 'vitest';
import {
  normalizeAssertionExpression,
  cleanJsonPathExpression,
  extractJsonPath,
  formatDateValue,
  areValuesEquivalent,
  evaluateSingleAssertion,
  extractBindsFromSql,
  getColumnValueFromRow,
  generateMarkdownEvidence
} from './qaRegressionUtils';
import { QaExecutionResult, QaRegressionAssertion } from '../../shared/types';

describe('qaRegressionUtils', () => {
  describe('normalizeAssertionExpression', () => {
    it('deve identificar <S> como notNull', () => {
      expect(normalizeAssertionExpression('<S>')).toEqual({ type: 'notNull', value: '' });
      expect(normalizeAssertionExpression('<PREENCHIDO>')).toEqual({ type: 'notNull', value: '' });
    });

    it('deve identificar <N> como null', () => {
      expect(normalizeAssertionExpression('<N>')).toEqual({ type: 'null', value: '' });
      expect(normalizeAssertionExpression('<VAZIO>')).toEqual({ type: 'null', value: '' });
    });

    it('deve identificar <0> como zero', () => {
      expect(normalizeAssertionExpression('<0>')).toEqual({ type: 'zero', value: '0' });
    });

    it('deve identificar JSONPath iniciado com $.', () => {
      expect(normalizeAssertionExpression('$.vlTotal')).toEqual({ type: 'jsonPath', value: '$.vlTotal' });
      expect(normalizeAssertionExpression('$.produtos.[*].qt')).toEqual({
        type: 'jsonPath',
        value: '$.produtos.[*].qt'
      });
    });

    it('deve identificar regex prefixado', () => {
      expect(normalizeAssertionExpression('regex: ^[0-9]+$')).toEqual({
        type: 'regex',
        value: '^[0-9]+$'
      });
    });

    it('deve tratar valores literais simples', () => {
      expect(normalizeAssertionExpression('DVARLIVEPDV-46538')).toEqual({
        type: 'literal',
        value: 'DVARLIVEPDV-46538'
      });
    });
  });

  describe('cleanJsonPathExpression', () => {
    it('deve remover anotação de data #D e sufixos de nota ! e @', () => {
      expect(cleanJsonPathExpression('$.data#D')).toEqual({
        cleanPath: '$.data',
        isDate: true
      });
      expect(cleanJsonPathExpression('$.produtos.[*].codProd!!')).toEqual({
        cleanPath: '$.produtos.[*].codProd',
        isDate: false
      });
      expect(cleanJsonPathExpression('$.produtos.[*].numSeq@')).toEqual({
        cleanPath: '$.produtos.[*].numSeq',
        isDate: false
      });
    });
  });

  describe('extractJsonPath', () => {
    const samplePayload = {
      codFilial: '1',
      numCupom: 4387,
      data: '2024-05-13T14:30:00Z',
      consumidorFinal: {
        cliente: 'CLIENTE TESTE',
        cgcEnt: '10190260000120'
      },
      produtos: [
        { codProd: 1184, qt: 2, pVenda: 2532.35, data: '2024-05-13' },
        { codProd: 1102, qt: 1.25, pVenda: 10.5, data: '2024-05-13' }
      ],
      pagamentos: [
        {
          codCob: 'D',
          valor: 100,
          itensPagamento: [{ valor: 100 }]
        }
      ]
    };

    it('deve extrair campos de primeiro nível', () => {
      expect(extractJsonPath(samplePayload, '$.codFilial')).toBe('1');
      expect(extractJsonPath(samplePayload, '$.numCupom')).toBe(4387);
    });

    it('deve extrair campos de objetos aninhados', () => {
      expect(extractJsonPath(samplePayload, '$.consumidorFinal.cgcEnt')).toBe('10190260000120');
      expect(extractJsonPath(samplePayload, '$.consumidorFinal.cliente')).toBe('CLIENTE TESTE');
    });

    it('deve extrair campos de array com coringa [*] respeitando o rowIndex', () => {
      expect(extractJsonPath(samplePayload, '$.produtos.[*].codProd', 0)).toBe(1184);
      expect(extractJsonPath(samplePayload, '$.produtos.[*].codProd', 1)).toBe(1102);
      expect(extractJsonPath(samplePayload, '$.produtos.[*].qt', 1)).toBe(1.25);
    });

    it('deve extrair e formatar data com sufixo #D', () => {
      expect(extractJsonPath(samplePayload, '$.data#D')).toBe('2024-05-13');
    });
  });

  describe('areValuesEquivalent', () => {
    it('deve considerar equivalentes números com diferentes precisões decimais', () => {
      expect(areValuesEquivalent(768.7, '768.70')).toBe(true);
      expect(areValuesEquivalent('10.5', 10.5)).toBe(true);
      expect(areValuesEquivalent(0, '0.00')).toBe(true);
      expect(areValuesEquivalent(10, 11)).toBe(false);
    });

    it('deve considerar equivalentes flags WinThor e booleanos', () => {
      expect(areValuesEquivalent('S', true)).toBe(true);
      expect(areValuesEquivalent('N', false)).toBe(true);
      expect(areValuesEquivalent('S', 's')).toBe(true);
    });

    it('deve comparar datas normalizadas YYYY-MM-DD', () => {
      expect(areValuesEquivalent('2024-05-13', '2024-05-13T00:00:00.000Z')).toBe(true);
      expect(areValuesEquivalent('13/05/2024', '2024-05-13')).toBe(true);
    });
  });

  describe('evaluateSingleAssertion', () => {
    const jsonContext = {
      codFilial: 1,
      numCupom: 4387,
      vlTotal: 768.7
    };

    it('deve aprovar asserção <S> quando preenchido', () => {
      const assertion: QaRegressionAssertion = {
        id: 'a1',
        column: 'CHAVENFE',
        expectedType: 'notNull',
        expectedValue: '<S>'
      };
      const res = evaluateSingleAssertion('35240510190260000120650010000043871000043871', assertion);
      expect(res.status).toBe('passed');
    });

    it('deve falhar asserção <S> quando null', () => {
      const assertion: QaRegressionAssertion = {
        id: 'a2',
        column: 'CHAVENFE',
        expectedType: 'notNull',
        expectedValue: '<S>'
      };
      const res = evaluateSingleAssertion(null, assertion);
      expect(res.status).toBe('failed');
    });

    it('deve aprovar asserção <0> quando zero', () => {
      const assertion: QaRegressionAssertion = {
        id: 'a3',
        column: 'VLTABELA',
        expectedType: 'zero',
        expectedValue: '<0>'
      };
      const res = evaluateSingleAssertion(0, assertion);
      expect(res.status).toBe('passed');
    });

    it('deve validar asserção por jsonPath', () => {
      const assertion: QaRegressionAssertion = {
        id: 'a4',
        column: 'VLTOTAL',
        expectedType: 'jsonPath',
        expectedValue: '$.vlTotal'
      };
      const res = evaluateSingleAssertion(768.7, assertion, jsonContext);
      expect(res.status).toBe('passed');
    });
  });

  describe('extractBindsFromSql', () => {
    it('deve extrair binds nomeados com dois-pontos', () => {
      const sql = 'SELECT * FROM PCNFSAID WHERE CODFILIAL = :codFilial AND NUMNOTA = :numCupom';
      expect(extractBindsFromSql(sql).sort()).toEqual(['codFilial', 'numCupom'].sort());
    });
  });

  describe('getColumnValueFromRow', () => {
    it('deve retornar case-insensitively', () => {
      const row = { CODFILIAL: '1', numCupom: 4387 };
      expect(getColumnValueFromRow(row, 'codfilial')).toBe('1');
      expect(getColumnValueFromRow(row, 'NUMCUPOM')).toBe(4387);
      expect(getColumnValueFromRow(row, 'INEXISTENTE')).toBeUndefined();
    });
  });

  describe('generateMarkdownEvidence', () => {
    it('deve gerar relatório markdown formatado', () => {
      const mockResult: QaExecutionResult = {
        templateId: 't1',
        templateName: 'Teste Regressivo Venda PDV',
        timestamp: '2024-05-13T10:00:00Z',
        durationMs: 145,
        totalAssertions: 2,
        passedAssertions: 2,
        failedAssertions: 0,
        warningAssertions: 0,
        success: true,
        extractedVariables: { codFilial: 1, numCupom: 4387 },
        stepResults: [
          {
            stepId: 's1',
            stepTitle: 'Cabeçalho da Nota',
            tableName: 'PCNFSAID',
            query: 'SELECT * FROM PCNFSAID',
            rowCount: 1,
            executionTimeMs: 40,
            success: true,
            assertions: [
              {
                assertionId: 'a1',
                column: 'NUMCUPOM',
                expectedType: 'literal',
                expectedDisplay: '4387',
                actualDisplay: '4387',
                status: 'passed'
              }
            ]
          }
        ]
      };

      const md = generateMarkdownEvidence(mockResult, { issueKey: 'DDWMISSI-T966' });
      expect(md).toContain('[DDWMISSI-T966]');
      expect(md).toContain('APROVADO');
      expect(md).toContain('PCNFSAID');
      expect(md).toContain('4387');
    });
  });
});
