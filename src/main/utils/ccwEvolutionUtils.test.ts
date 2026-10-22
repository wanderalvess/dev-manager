import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseCcwEvolutionCycles, fetchCcwEvolutionCycles } from './ccwEvolutionUtils';

describe('ccwEvolutionUtils', () => {
  describe('parseCcwEvolutionCycles', () => {
    it('retorna fallback quando payload for nulo ou vazio', () => {
      const res = parseCcwEvolutionCycles(null);
      expect(res).toContain('37.00');
      expect(res).toContain('38.00');
      expect(res).toContain('36.00');
    });

    it('extrai ciclos de array simples', () => {
      const input = ['38.00', '37.00', '36.00'];
      const res = parseCcwEvolutionCycles(input);
      expect(res).toEqual(['38.00', '37.00', '36.00']);
    });

    it('extrai ciclos de números inteiros normalizando para XX.00', () => {
      const input = [38, 37, 36];
      const res = parseCcwEvolutionCycles(input);
      expect(res).toEqual(['38.00', '37.00', '36.00']);
    });

    it('extrai ciclos de objetos paginados (ex: content ou data)', () => {
      const input = {
        data: [
          { versaoCiclo: '37.00' },
          { versaoCiclo: '38.00' },
          { versaoCiclo: '36.00' }
        ]
      };
      const res = parseCcwEvolutionCycles(input);
      expect(res).toEqual(['38.00', '37.00', '36.00']);
    });

    it('extrai ciclos com propriedade ciclo ou descricao', () => {
      const input = {
        content: [
          { ciclo: '36.00.02.003' },
          { ciclo: '37.00.00.028' },
          { ciclo: '38.00.00.002' }
        ]
      };
      const res = parseCcwEvolutionCycles(input);
      expect(res).toEqual(['38.00', '37.00', '36.00']);
    });
  });

  describe('fetchCcwEvolutionCycles', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
      vi.restoreAllMocks();
    });

    it('retorna ciclos obtidos da API em caso de sucesso', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ versaoCiclo: '38.00' }, { versaoCiclo: '37.00' }]
        })
      });

      const res = await fetchCcwEvolutionCycles('https://centraldecontrole.pcinformatica.com.br');
      expect(res.success).toBe(true);
      expect(res.cycles).toEqual(['38.00', '37.00']);
    });

    it('retorna fallback e flag de erro quando fetch falhar', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Connection failed'));

      const res = await fetchCcwEvolutionCycles('https://centraldecontrole.pcinformatica.com.br');
      expect(res.success).toBe(false);
      expect(res.cycles).toContain('37.00');
    });
  });
});
