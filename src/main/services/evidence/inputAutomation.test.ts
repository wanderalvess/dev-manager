import { describe, expect, it } from 'vitest';
import { parseClickLine } from './inputAutomation';

describe('parseClickLine', () => {
  it('lê clique esquerdo e direito no formato antigo', () => {
    expect(parseClickLine('click 1 120 340')).toEqual({ button: 'left', x: 120, y: 340 });
    expect(parseClickLine('click 2 5 6\r')).toEqual({ button: 'right', x: 5, y: 6 });
  });

  it('aceita coordenada negativa de monitor à esquerda do principal', () => {
    expect(parseClickLine('click 1 -1500 40')).toEqual({ button: 'left', x: -1500, y: 40 });
  });

  it('lê a janela de origem do clique', () => {
    const line = 'click {"b":1,"x":300,"y":220,"p":"chrome","ti":"Hub – Evidências","dx":100,"dy":20}';
    expect(parseClickLine(line)).toEqual({
      button: 'left',
      x: 300,
      y: 220,
      win: { process: 'chrome', title: 'Hub – Evidências', dx: 100, dy: 20 }
    });
    expect(parseClickLine('click {"b":2,"x":1,"y":2}')).toEqual({ button: 'right', x: 1, y: 2 });
  });

  it('ignora linhas que não são clique', () => {
    expect(parseClickLine('ready')).toBeNull();
    expect(parseClickLine('click x 1 2')).toBeNull();
    expect(parseClickLine('click {quebrado')).toBeNull();
    expect(parseClickLine('click {"b":1}')).toBeNull();
  });
});
