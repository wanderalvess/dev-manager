import { describe, it, expect } from 'vitest';
import { validateSearchTerm, formatPayloadSummary } from './qaPayloadFetchUtils';

describe('qaPayloadFetchUtils', () => {
  describe('validateSearchTerm', () => {
    it('deve aceitar busca recente sem termos', () => {
      expect(validateSearchTerm('recent', '').isValid).toBe(true);
    });

    it('deve exigir termo para cgcEnt e cupom', () => {
      expect(validateSearchTerm('cgcEnt', '').isValid).toBe(false);
      expect(validateSearchTerm('cupom', '').isValid).toBe(false);
    });

    it('deve validar tamanho mínimo de CPF/CNPJ', () => {
      expect(validateSearchTerm('cgcEnt', '12345').isValid).toBe(false);
      expect(validateSearchTerm('cgcEnt', '68886626088').isValid).toBe(true);
    });

    it('deve validar chave com 44 dígitos', () => {
      expect(validateSearchTerm('chave', '12345').isValid).toBe(false);
      expect(
        validateSearchTerm('chave', '26250611468154000200650010002714391954558770').isValid
      ).toBe(true);
    });
  });

  describe('formatPayloadSummary', () => {
    it('deve formatar badge, título e valor em moeda', () => {
      const summary = formatPayloadSummary({
        numCupom: '271454',
        codFilial: '1',
        cliente: 'VICTOR VIANA',
        pdvOrigem: 'WSH-OMNISHOP',
        vlTotal: '6.0',
        rawJson: '{}'
      });

      expect(summary.badge).toBe('Cupom #271454 • Filial 1');
      expect(summary.title).toBe('VICTOR VIANA');
      expect(summary.subtitle).toContain('WSH-OMNISHOP');
      expect(summary.valueDisplay).toContain('6,00');
    });
  });
});
