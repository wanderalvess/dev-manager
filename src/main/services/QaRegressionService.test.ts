import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QaRegressionService } from './QaRegressionService';
import { ConfigService } from './ConfigService';
import { DatabaseService } from './DatabaseService';
import { QaRegressionTemplate, QueryResult } from '../../shared/types';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('QaRegressionService', () => {
  let tempDir: string;
  let mockConfigService: any;
  let mockDatabaseService: any;
  let service: QaRegressionService;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-test-'));

    mockConfigService = {
      getSettings: vi.fn().mockReturnValue({
        qaTemplatesDir: tempDir,
        databaseConnections: [
          {
            id: 'conn-oracle-test',
            name: 'Oracle QA',
            type: 'oracle',
            host: 'localhost',
            port: 1521,
            user: 'SYSTEM',
            database: 'XE'
          }
        ]
      })
    };

    mockDatabaseService = {
      resolveConnectionConfig: vi.fn((c) => c),
      interpolateBinds: vi.fn((sql, _binds) => sql),
      executeQuery: vi.fn()
    };

    service = new QaRegressionService(mockConfigService as ConfigService, mockDatabaseService as DatabaseService);
  });

  it('deve listar templates e garantir os templates padrão quando a pasta estiver vazia', async () => {
    const list = await service.listTemplates();
    expect(list.length).toBeGreaterThan(0);
    const hasPdv = list.some((t) => t.id === 'wsh-venda-pdv-completa');
    const hasPreVenda = list.some((t) => t.id === 'wsh-prevenda-tv7-tv8');
    const hasCaixa = list.some((t) => t.id === 'wsh-movimentacao-caixa');
    const hasInut = list.some((t) => t.id === 'wsh-inutilizacao-nfce');
    expect(hasPdv).toBe(true);
    expect(hasPreVenda).toBe(true);
    expect(hasCaixa).toBe(true);
    expect(hasInut).toBe(true);
  });

  it('deve salvar e recuperar um template customizado', async () => {
    const newTmpl: QaRegressionTemplate = {
      id: 'template-custom-test',
      name: 'Template Customizado',
      description: 'Teste',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      steps: [
        {
          id: 'step-1',
          title: 'Passo 1',
          query: 'SELECT 1 AS TESTE FROM DUAL',
          enabled: true,
          assertions: []
        }
      ]
    };

    await service.saveTemplate(newTmpl);
    const retrieved = await service.getTemplate('template-custom-test');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.name).toBe('Template Customizado');

    const deleted = await service.deleteTemplate('template-custom-test');
    expect(deleted).toBe(true);
    const afterDelete = await service.getTemplate('template-custom-test');
    expect(afterDelete).toBeNull();
  });

  it('deve executar uma bateria de testes com asserções válidas', async () => {
    const fakeQueryResult: QueryResult = {
      success: true,
      columns: ['CODFILIAL', 'NUMCUPOM', 'VLTOTAL', 'CHAVENFE'],
      rows: [
        {
          CODFILIAL: '1',
          NUMCUPOM: 4387,
          VLTOTAL: 768.7,
          CHAVENFE: '35240510190260000120650010000043871000043871'
        }
      ],
      rowCount: 1,
      executionTimeMs: 15,
      isQuery: true
    };

    mockDatabaseService.executeQuery.mockResolvedValue(fakeQueryResult);

    const tmpl: QaRegressionTemplate = {
      id: 'tmpl-run-test',
      name: 'Teste Execução',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      defaultVariables: { codFilial: '1', numCupom: 4387 },
      steps: [
        {
          id: 's1',
          title: 'Checar Cabeçalho',
          tableName: 'PCNFSAID',
          enabled: true,
          query: 'SELECT * FROM PCNFSAID WHERE CODFILIAL = :codFilial AND NUMNOTA = :numCupom',
          assertions: [
            {
              id: 'a1',
              column: 'CODFILIAL',
              expectedType: 'literal',
              expectedValue: '1'
            },
            {
              id: 'a2',
              column: 'CHAVENFE',
              expectedType: 'notNull',
              expectedValue: '<S>'
            },
            {
              id: 'a3',
              column: 'VLTOTAL',
              expectedType: 'jsonPath',
              expectedValue: '$.vlTotal'
            }
          ]
        }
      ]
    };

    const res = await service.executeSuite({
      template: tmpl,
      rawJson: JSON.stringify({ vlTotal: 768.7 })
    });

    expect(res.success).toBe(true);
    expect(res.totalAssertions).toBe(3);
    expect(res.passedAssertions).toBe(3);
    expect(res.failedAssertions).toBe(0);
    expect(res.stepResults.length).toBe(1);
    expect(res.stepResults[0].assertions[0].status).toBe('passed');
  });

  it('deve extrair variáveis de um passo e disponibilizar para o próximo passo', async () => {
    // Passo 1 retorna NUMTRANSVENDA = 9999
    // Passo 2 usa :numTransVenda
    mockDatabaseService.executeQuery
      .mockResolvedValueOnce({
        success: true,
        columns: ['NUMTRANSVENDA'],
        rows: [{ NUMTRANSVENDA: 9999 }],
        rowCount: 1,
        executionTimeMs: 10,
        isQuery: true
      })
      .mockResolvedValueOnce({
        success: true,
        columns: ['NUMTRANSVENDA', 'VALOR'],
        rows: [{ NUMTRANSVENDA: 9999, VALOR: 50 }],
        rowCount: 1,
        executionTimeMs: 10,
        isQuery: true
      });

    const tmpl: QaRegressionTemplate = {
      id: 'tmpl-chain-test',
      name: 'Teste de Encadeamento de Passos',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      steps: [
        {
          id: 'step-1',
          title: 'Obter Transação',
          enabled: true,
          query: 'SELECT NUMTRANSVENDA FROM PCNFSAID',
          assertions: [],
          extractVariables: [{ variableName: 'numTransVenda', column: 'NUMTRANSVENDA' }]
        },
        {
          id: 'step-2',
          title: 'Validar Financeiro',
          enabled: true,
          query: 'SELECT * FROM PCPREST WHERE NUMTRANSVENDA = :numTransVenda',
          assertions: [
            {
              id: 'a-prest',
              column: 'VALOR',
              expectedType: 'literal',
              expectedValue: '50'
            }
          ]
        }
      ]
    };

    const res = await service.executeSuite({ template: tmpl });
    expect(res.success).toBe(true);
    expect(res.extractedVariables.numTransVenda).toBe(9999);
  });

  it('deve executar suite com template inline e auto-popular binds a partir de payload JSON', async () => {
    mockDatabaseService.executeQuery.mockResolvedValueOnce({
      success: true,
      columns: ['CODFILIAL', 'NUMCUPOM', 'VLTOTAL'],
      rows: [{ CODFILIAL: '1', NUMCUPOM: 4387, VLTOTAL: 100.5 }],
      rowCount: 1,
      executionTimeMs: 10,
      isQuery: true
    });

    const inlineTmpl: QaRegressionTemplate = {
      id: 'inline-test',
      name: 'Template Inline Ad-hoc',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      steps: [
        {
          id: 'step-inline-1',
          title: 'Validação Direta',
          enabled: true,
          query: 'SELECT * FROM PCNFSAID WHERE CODFILIAL = :codFilial AND NUMNOTA = :numCupom',
          assertions: [
            {
              id: 'a1',
              column: 'VLTOTAL',
              expectedType: 'jsonPath',
              expectedValue: '$.vlTotal'
            }
          ]
        }
      ]
    };

    const payload = JSON.stringify({ codFilial: '1', numCupom: 4387, vlTotal: 100.5 });
    const res = await service.executeSuite({
      template: inlineTmpl,
      rawJson: payload
    });

    expect(res.success).toBe(true);
    expect(res.passedAssertions).toBe(1);
    expect(res.templateName).toBe('Template Inline Ad-hoc');
  });
});

