import { describe, it, expect } from 'vitest';
import {
  validateApiFetchRequest,
  extractJsonByPath,
  formatPayloadAsPrettyJson
} from './qaApiFetchUtils';

describe('qaApiFetchUtils', () => {
  describe('validateApiFetchRequest', () => {
    it('deve rejeitar requisição sem URL', () => {
      const res = validateApiFetchRequest({ url: '' });
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('obrigatória');
    });

    it('deve rejeitar URLs com protocolo inválido', () => {
      const res = validateApiFetchRequest({ url: 'ftp://servidor/arquivo.json' });
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('http:// ou https://');
    });

    it('deve aceitar URLs http e https válidas', () => {
      expect(validateApiFetchRequest({ url: 'http://localhost:8080/api/pedido' }).isValid).toBe(true);
      expect(validateApiFetchRequest({ url: 'https://api.empresa.com.br/v1/pedidos' }).isValid).toBe(true);
    });

    it('deve rejeitar métodos HTTP não suportados', () => {
      const res = validateApiFetchRequest({
        url: 'http://localhost:8080/api/pedido',
        method: 'DELETE' as any
      });
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('não suportado');
    });

    it('deve aceitar GET e POST', () => {
      expect(
        validateApiFetchRequest({ url: 'http://localhost:8080/api/pedido', method: 'GET' }).isValid
      ).toBe(true);
      expect(
        validateApiFetchRequest({ url: 'http://localhost:8080/api/pedido', method: 'POST' }).isValid
      ).toBe(true);
    });
  });

  describe('extractJsonByPath', () => {
    const sample = {
      status: 'success',
      data: {
        pedido: {
          numCupom: '735585',
          codFilial: '1'
        },
        items: [{ id: 10, nome: 'Item A' }, { id: 20, nome: 'Item B' }]
      }
    };

    it('deve retornar o próprio objeto se path for vazio ou indefinido', () => {
      expect(extractJsonByPath(sample)).toEqual(sample);
      expect(extractJsonByPath(sample, '')).toEqual(sample);
      expect(extractJsonByPath(sample, '  ')).toEqual(sample);
    });

    it('deve extrair propriedades aninhadas simples', () => {
      expect(extractJsonByPath(sample, 'status')).toBe('success');
      expect(extractJsonByPath(sample, 'data.pedido')).toEqual({
        numCupom: '735585',
        codFilial: '1'
      });
      expect(extractJsonByPath(sample, 'data.pedido.numCupom')).toBe('735585');
    });

    it('deve extrair elementos de array com colchetes ou ponto', () => {
      expect(extractJsonByPath(sample, 'data.items[0]')).toEqual({ id: 10, nome: 'Item A' });
      expect(extractJsonByPath(sample, 'data.items.1.nome')).toBe('Item B');
    });

    it('deve retornar undefined se caminho não existir', () => {
      expect(extractJsonByPath(sample, 'data.naoExiste')).toBeUndefined();
      expect(extractJsonByPath(sample, 'data.pedido.inexistente.sub')).toBeUndefined();
    });
  });

  describe('formatPayloadAsPrettyJson', () => {
    it('deve formatar objeto para string JSON indentada', () => {
      const formatted = formatPayloadAsPrettyJson({ a: 1, b: 'teste' });
      expect(formatted).toBe('{\n  "a": 1,\n  "b": "teste"\n}');
    });

    it('deve formatar string JSON para indentada', () => {
      const formatted = formatPayloadAsPrettyJson('{"x":10}');
      expect(formatted).toBe('{\n  "x": 10\n}');
    });

    it('deve lidar com valores vazios', () => {
      expect(formatPayloadAsPrettyJson(null)).toBe('');
      expect(formatPayloadAsPrettyJson(undefined)).toBe('');
    });
  });
});
