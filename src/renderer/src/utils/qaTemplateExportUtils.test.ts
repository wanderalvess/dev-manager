import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sanitizeTemplateForExport,
  serializeTemplateToJson,
  serializeTemplatesBundleToJson,
  getTemplateExportFilename,
  exportTemplateAsJsonFile,
  exportTemplatesBundleAsJsonFile
} from './qaTemplateExportUtils';
import { QaRegressionTemplate } from '../../../shared/types';

const mockTemplate: QaRegressionTemplate = {
  id: 'template-venda-pdv',
  name: 'Validação de Venda no PDV 4387',
  description: 'Testa gravação de cabeçalho e itens',
  category: 'Vendas',
  author: 'QA Team',
  version: '1.0.0',
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-01T12:00:00.000Z',
  defaultVariables: { codFilial: '1', numCupom: '4387' },
  sampleJson: '{"vlTotal": 100}',
  steps: [
    {
      id: 'step-1',
      title: 'Validar PCNFSAID',
      tableName: 'PCNFSAID',
      enabled: true,
      query: 'SELECT * FROM PCNFSAID WHERE NUMNOTA = :numCupom',
      assertions: [
        {
          id: 'ass-1',
          column: 'VLTOTAL',
          expectedType: 'jsonPath',
          expectedValue: '$.vlTotal'
        }
      ]
    }
  ]
};

describe('qaTemplateExportUtils', () => {
  it('sanitizeTemplateForExport deve garantir propriedades essenciais e atualizar updatedAt', () => {
    const sanitized = sanitizeTemplateForExport(mockTemplate);
    expect(sanitized.id).toBe('template-venda-pdv');
    expect(sanitized.name).toBe('Validação de Venda no PDV 4387');
    expect(sanitized.steps.length).toBe(1);
    expect(sanitized.updatedAt).toBeDefined();
  });

  it('serializeTemplateToJson deve gerar JSON formatado com indentação', () => {
    const jsonStr = serializeTemplateToJson(mockTemplate, true);
    expect(jsonStr).toContain('\n  "id": "template-venda-pdv"');
    const parsed = JSON.parse(jsonStr);
    expect(parsed.name).toBe('Validação de Venda no PDV 4387');
  });

  it('serializeTemplatesBundleToJson deve serializar array de templates', () => {
    const bundleJson = serializeTemplatesBundleToJson([mockTemplate]);
    const parsed = JSON.parse(bundleJson);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(1);
    expect(parsed[0].id).toBe('template-venda-pdv');
  });

  it('getTemplateExportFilename deve sanitizar caracteres especiais no nome do arquivo', () => {
    const filename = getTemplateExportFilename(mockTemplate);
    expect(filename).toBe('template-venda-pdv.json');

    const templateWithSpecialChars: QaRegressionTemplate = {
      ...mockTemplate,
      id: 'Cenário & Teste #1 / Vendas!'
    };
    const sanitizedFilename = getTemplateExportFilename(templateWithSpecialChars);
    expect(sanitizedFilename).toBe('cen-rio-teste-1-vendas.json');
  });

  describe('download via âncora', () => {
    // O Vitest roda em ambiente node (sem jsdom), então o DOM mínimo é simulado.
    const clickMock = vi.fn();
    const removeMock = vi.fn();
    const setAttributeMock = vi.fn();
    const createElementMock = vi.fn();
    const appendChildMock = vi.fn();

    beforeEach(() => {
      createElementMock.mockReturnValue({
        setAttribute: setAttributeMock,
        click: clickMock,
        remove: removeMock
      });
      vi.stubGlobal('document', {
        createElement: createElementMock,
        body: { appendChild: appendChildMock }
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.clearAllMocks();
    });

    it('exportTemplateAsJsonFile deve disparar o download com click em elemento âncora', () => {
      exportTemplateAsJsonFile(mockTemplate);

      expect(createElementMock).toHaveBeenCalledWith('a');
      expect(setAttributeMock).toHaveBeenCalledWith('download', 'template-venda-pdv.json');
      expect(appendChildMock).toHaveBeenCalled();
      expect(clickMock).toHaveBeenCalled();
      expect(removeMock).toHaveBeenCalled();
    });

    it('exportTemplatesBundleAsJsonFile deve disparar o download com nome de arquivo customizado', () => {
      exportTemplatesBundleAsJsonFile([mockTemplate], 'backup-completo.json');

      expect(setAttributeMock).toHaveBeenCalledWith('download', 'backup-completo.json');
      expect(clickMock).toHaveBeenCalled();
    });
  });
});
