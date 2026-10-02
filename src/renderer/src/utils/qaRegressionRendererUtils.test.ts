import { describe, it, expect } from 'vitest';
import {
  autoExtractVariablesFromJson,
  filterStepResults,
  buildJiraEvidenceClipboardText
} from './qaRegressionRendererUtils';
import { QaExecutionResult, QaStepExecutionResult } from '../../../shared/types';

describe('qaRegressionRendererUtils', () => {
  describe('autoExtractVariablesFromJson', () => {
    it('deve extrair chaves padrão como codFilial e numCupom', () => {
      const json = JSON.stringify({
        codFilial: 1,
        numCupom: 4387,
        chaveNfe: '352405001'
      });
      const res = autoExtractVariablesFromJson(json);
      expect(res.codFilial).toBe('1');
      expect(res.numCupom).toBe('4387');
      expect(res.chaveNfe).toBe('352405001');
    });

    it('deve extrair chaves aninhadas recursivamente', () => {
      const json = JSON.stringify({
        cabecalho: {
          filial: '2',
          numNota: '10047'
        }
      });
      const res = autoExtractVariablesFromJson(json);
      expect(res.filial).toBe('2');
      expect(res.numNota).toBe('10047');
    });

    it('deve retornar objeto vazio para JSON inválido sem quebrar', () => {
      expect(autoExtractVariablesFromJson('invalido {')).toEqual({});
      expect(autoExtractVariablesFromJson('')).toEqual({});
    });
  });

  describe('filterStepResults', () => {
    const mockSteps: QaStepExecutionResult[] = [
      {
        stepId: 's1',
        stepTitle: 'Cabeçalho da Nota',
        tableName: 'PCNFSAID',
        query: 'SELECT * FROM PCNFSAID',
        rowCount: 1,
        executionTimeMs: 12,
        success: true,
        assertions: [
          {
            assertionId: 'a1',
            column: 'CODFILIAL',
            expectedType: 'literal',
            expectedDisplay: '1',
            actualDisplay: '1',
            status: 'passed'
          }
        ]
      },
      {
        stepId: 's2',
        stepTitle: 'Itens da Venda',
        tableName: 'PCPEDI',
        query: 'SELECT * FROM PCPEDI',
        rowCount: 1,
        executionTimeMs: 14,
        success: false,
        assertions: [
          {
            assertionId: 'a2',
            column: 'PVENDA',
            expectedType: 'literal',
            expectedDisplay: '10.50',
            actualDisplay: '11.00',
            status: 'failed',
            message: 'Divergência de valor'
          }
        ]
      }
    ];

    it('deve filtrar apenas passos com falha', () => {
      const filtered = filterStepResults(mockSteps, 'failed');
      expect(filtered.length).toBe(1);
      expect(filtered[0].tableName).toBe('PCPEDI');
    });

    it('deve filtrar por termo de busca no nome da tabela', () => {
      const filtered = filterStepResults(mockSteps, 'all', 'NFSAID');
      expect(filtered.length).toBe(1);
      expect(filtered[0].stepId).toBe('s1');
    });
  });

  describe('buildJiraEvidenceClipboardText', () => {
    it('deve gerar texto no formato Confluence/Jira markup com cores e tabelas', () => {
      const mockResult: QaExecutionResult = {
        templateId: 't1',
        templateName: 'Venda PDV',
        timestamp: '2024-05-13T10:00:00Z',
        durationMs: 120,
        totalAssertions: 1,
        passedAssertions: 1,
        failedAssertions: 0,
        warningAssertions: 0,
        success: true,
        extractedVariables: {},
        stepResults: [
          {
            stepId: 's1',
            stepTitle: 'Checagem',
            tableName: 'PCNFSAID',
            query: 'SELECT 1',
            rowCount: 1,
            executionTimeMs: 10,
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

      const out = buildJiraEvidenceClipboardText(mockResult, 'DDWMISSI-T966');
      expect(out).toContain('[DDWMISSI-T966]');
      expect(out).toContain('||Tabela / Etapa||');
      expect(out).toContain('{color:green}PASSOU{color}');
    });
  });
});
