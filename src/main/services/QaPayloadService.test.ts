import { describe, it, expect, vi } from 'vitest';
import { QaPayloadService } from './QaPayloadService';

describe('QaPayloadService', () => {
  const mockConfigService = {
    getSettings: vi.fn().mockReturnValue({
      databaseConnections: [
        { id: 'ora-1', type: 'oracle', name: 'Oracle Local', host: 'localhost', user: 'SYSTEM' }
      ]
    })
  } as any;

  const sampleJson = JSON.stringify({
    codFilial: '1',
    numCupom: '271454',
    chaveNfe: '26250611468154000200650010002714391954558770',
    consumidorFinal: {
      cgcEnt: '68886626088',
      cliente: 'CONSUMIDOR PF'
    },
    vlTotal: '10.50'
  });

  it('deve buscar e mapear registros retornados da PCINTEGRACAOCORE', async () => {
    const mockDatabaseService = {
      resolveConnectionConfig: vi.fn().mockImplementation((c) => c),
      executeQuery: vi.fn().mockResolvedValue({
        success: true,
        rows: [{ DADOSTRANSFORMADOS: sampleJson, ROW_ID: 'AAABBBCCC' }]
      })
    } as any;

    const service = new QaPayloadService(mockConfigService, mockDatabaseService);

    const result = await service.searchPayloads({
      mode: 'cgcEnt',
      cgcEnt: '68886626088'
    });

    expect(result.success).toBe(true);
    expect(result.totalFound).toBe(1);
    expect(result.items[0].numCupom).toBe('271454');
    expect(result.items[0].cgcEnt).toBe('68886626088');
    expect(result.items[0].cliente).toBe('CONSUMIDOR PF');
    expect(result.items[0].rawJson).toContain('  "codFilial": "1"');
  });

  it('deve retornar erro amigável quando nenhuma conexão configurada', async () => {
    const emptyConfigService = {
      getSettings: vi.fn().mockReturnValue({ databaseConnections: [] })
    } as any;
    const mockDatabaseService = { resolveConnectionConfig: vi.fn() } as any;

    const service = new QaPayloadService(emptyConfigService, mockDatabaseService);
    const result = await service.searchPayloads({ mode: 'recent' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Nenhuma conexão Oracle');
  });

  it('deve repassar mensagem de erro quando query falha', async () => {
    const mockDatabaseService = {
      resolveConnectionConfig: vi.fn().mockImplementation((c) => c),
      executeQuery: vi.fn().mockResolvedValue({
        success: false,
        error: 'ORA-00942: table or view does not exist'
      })
    } as any;

    const service = new QaPayloadService(mockConfigService, mockDatabaseService);
    const result = await service.searchPayloads({ mode: 'recent' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('ORA-00942');
  });

  describe('fetchPayloadFromApi', () => {
    it('deve rejeitar se a URL for inválida', async () => {
      const service = new QaPayloadService(mockConfigService, {} as any);
      const res = await service.fetchPayloadFromApi({ url: 'invalido' });
      expect(res.success).toBe(false);
      expect(res.error).toContain('URL inválida');
    });

    it('deve recuperar e extrair payload JSON com sucesso via GET', async () => {
      vi.mock('../utils/httpRequest', () => ({
        httpRequest: vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => JSON.stringify({ data: { pedido: { numCupom: '123' } } })
        })
      }));

      const service = new QaPayloadService(mockConfigService, {} as any);
      const res = await service.fetchPayloadFromApi({
        url: 'http://localhost:8080/api/pedidos',
        method: 'GET',
        jsonPath: 'data.pedido'
      });

      expect(res.success).toBe(true);
      expect(res.statusCode).toBe(200);
      expect(res.data).toEqual({ numCupom: '123' });
      expect(res.extractedJson).toContain('"numCupom": "123"');
    });
  });
});

