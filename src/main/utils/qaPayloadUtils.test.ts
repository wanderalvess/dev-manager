import { describe, it, expect } from 'vitest';
import { buildCoreSearchSql, extractRawJsonString, parseCoreJsonItem } from './qaPayloadUtils';

describe('qaPayloadUtils', () => {
  describe('buildCoreSearchSql', () => {
    it('deve gerar query para busca por cgcEnt', () => {
      const { sql, binds } = buildCoreSearchSql({
        mode: 'cgcEnt',
        cgcEnt: '68886626088'
      });

      expect(sql).toContain('PCINTEGRACAOCORE');
      expect(sql).toContain('DADOSTRANSFORMADOS LIKE :pCgc');
      expect(binds.pCgc).toBe('%"cgcEnt": "68886626088"%');
      expect(binds.pLimit).toBe(15);
    });

    it('deve gerar query para busca por numCupom e filial', () => {
      const { sql, binds } = buildCoreSearchSql({
        mode: 'cupom',
        numCupom: '271454',
        codFilial: '1',
        limit: 10
      });

      expect(sql).toContain('numCupom');
      expect(sql).toContain('codFilial');
      expect(binds.pCupomStr).toBe('%"numCupom": "271454"%');
      expect(binds.pFilialStr).toBe('%"codFilial": "1"%');
      expect(binds.pLimit).toBe(10);
    });

    it('deve gerar query para busca por chave NFC-e', () => {
      const { sql, binds } = buildCoreSearchSql({
        mode: 'chave',
        chaveNfe: '26250611468154000200650010002714391954558770'
      });

      expect(sql).toContain('chaveNfce');
      expect(sql).toContain('chaveNfe');
      expect(binds.pChaveNfce).toContain('26250611468154000200650010002714391954558770');
    });

    it('deve gerar query para busca de mensagens recentes', () => {
      const { sql, binds } = buildCoreSearchSql({
        mode: 'recent',
        limit: 25
      });

      expect(sql).toContain('DADOSTRANSFORMADOS IS NOT NULL');
      expect(binds.pLimit).toBe(25);
    });
  });

  describe('extractRawJsonString', () => {
    it('deve normalizar strings, buffers e objetos', () => {
      expect(extractRawJsonString('  {"a": 1}  ')).toBe('{"a": 1}');
      expect(extractRawJsonString(Buffer.from('{"b": 2}'))).toBe('{"b": 2}');
      expect(extractRawJsonString(null)).toBe('');
    });
  });

  describe('parseCoreJsonItem', () => {
    it('deve extrair campos de cabeçalho e metadados de JSON do PDV', () => {
      const sample = JSON.stringify({
        codCob: 'PIX',
        pdvOrigem: 'WSH-OMNISHOP',
        chaveNfce: '26250611468154000200650010002714391954558770',
        chaveNfe: '26250611468154000200650010002714391954558770',
        consumidorFinal: {
          cgcEnt: '68886626088',
          cliente: 'COD.: 1002 - CLIENTE PF'
        },
        codFilial: '1',
        numCupom: '271454',
        vlTotal: '6.0'
      });

      const parsed = parseCoreJsonItem(sample, 'ROW123');

      expect(parsed).not.toBeNull();
      expect(parsed?.numCupom).toBe('271454');
      expect(parsed?.codFilial).toBe('1');
      expect(parsed?.cgcEnt).toBe('68886626088');
      expect(parsed?.cliente).toBe('COD.: 1002 - CLIENTE PF');
      expect(parsed?.pdvOrigem).toBe('WSH-OMNISHOP');
      expect(parsed?.chaveNfe).toBe('26250611468154000200650010002714391954558770');
      expect(parsed?.vlTotal).toBe('6.0');
      expect(parsed?.rawJson).toContain('  "codCob": "PIX"');
    });

    it('deve retornar null para texto inválido ou não JSON', () => {
      expect(parseCoreJsonItem('invalido')).toBeNull();
      expect(parseCoreJsonItem('')).toBeNull();
    });
  });
});
