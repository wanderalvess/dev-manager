import { describe, expect, it } from 'vitest';
import { parseClickLine } from './inputAutomation';

describe('parseClickLine', () => {
  it('lê clique esquerdo e direito', () => {
    expect(parseClickLine('click 1 120 340')).toEqual({ button: 'left', x: 120, y: 340 });
    expect(parseClickLine('click 2 5 6\r')).toEqual({ button: 'right', x: 5, y: 6 });
  });

  it('ignora linhas que não são clique ou têm coordenada negativa', () => {
    expect(parseClickLine('ready')).toBeNull();
    expect(parseClickLine('click 1 -10 5')).toBeNull();
    expect(parseClickLine('click x 1 2')).toBeNull();
  });
});
