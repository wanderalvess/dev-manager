import { describe, expect, it } from 'vitest';
import { parseKarafStreamCommand } from './karafStreamCommand';

describe('parseKarafStreamCommand', () => {
  it('aceita log:tail com argumentos simples', () => {
    expect(parseKarafStreamCommand('log:tail')).toEqual({ ok: true, command: 'log:tail' });
    expect(parseKarafStreamCommand('  log:tail   -n  50 ')).toEqual({ ok: true, command: 'log:tail -n 50' });
  });

  it('recusa comandos fora da lista', () => {
    expect(parseKarafStreamCommand('bundle:uninstall 12').ok).toBe(false);
    expect(parseKarafStreamCommand('bundle:watch *').ok).toBe(false);
    expect(parseKarafStreamCommand('system:shutdown').ok).toBe(false);
    expect(parseKarafStreamCommand('').ok).toBe(false);
  });

  it('recusa metacaracteres de shell e excesso de argumentos', () => {
    for (const bad of ['log:tail | grep x', 'log:tail; la', 'log:tail $(x)', 'log:tail `x`', 'log:tail > out', 'log:tail a&b']) {
      expect(parseKarafStreamCommand(bad).ok).toBe(false);
    }
    expect(parseKarafStreamCommand('log:tail ' + 'a '.repeat(9)).ok).toBe(false);
    expect(parseKarafStreamCommand(42 as unknown as string).ok).toBe(false);
  });
});
