import { describe, it, expect } from 'vitest';
import { interpolateVariables, buildResolvedKeyValueMap } from './httpVariableUtils';

describe('httpVariableUtils', () => {
  it('deve interpolar variáveis simples com {{KEY}}', () => {
    const vars = { host: 'localhost', port: '8181', LOGIN: 'PCADMIN' };
    const url = 'http://{{host}}:{{port}}/winthor/autenticacao/v1/login';
    const result = interpolateVariables(url, vars);
    expect(result).toBe('http://localhost:8181/winthor/autenticacao/v1/login');
  });

  it('deve lidar com espaços dentro das chaves {{ VAR }}', () => {
    const vars = { SENHA: '123' };
    const input = '{"senha": "{{ SENHA }}"}';
    const result = interpolateVariables(input, vars);
    expect(result).toBe('{"senha": "123"}');
  });

  it('deve manter o placeholder se a variável não existir', () => {
    const vars = { host: '127.0.0.1' };
    const input = 'http://{{host}}:{{desconhecida}}';
    const result = interpolateVariables(input, vars);
    expect(result).toBe('http://127.0.0.1:{{desconhecida}}');
  });

  it('deve gerar número aleatório para {{$randomInt}}', () => {
    const input = 'order-{{$randomInt}}';
    const result = interpolateVariables(input, {});
    expect(result).toMatch(/^order-\d+$/);
  });

  it('deve gerar timestamp para {{$timestamp}}', () => {
    const input = 'ts:{{$timestamp}}';
    const result = interpolateVariables(input, {});
    expect(result).toMatch(/^ts:\d{10}$/);
  });

  it('deve resolver mapa chave-valor apenas com itens ativados', () => {
    const items = [
      { key: 'Authorization', value: 'Bearer {{TOKEN}}', enabled: true },
      { key: 'Content-Type', value: 'application/json', enabled: true },
      { key: 'X-Disabled', value: 'ignore', enabled: false }
    ];
    const vars = { TOKEN: 'token_abc_123' };
    const map = buildResolvedKeyValueMap(items, vars);

    expect(map).toEqual({
      Authorization: 'Bearer token_abc_123',
      'Content-Type': 'application/json'
    });
    expect(map['X-Disabled']).toBeUndefined();
  });
});
