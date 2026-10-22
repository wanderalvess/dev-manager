import { describe, expect, it } from 'vitest';
import {
  DEFAULT_QUICK_COMMANDS,
  isDestructiveKarafCommand,
  isValidQuickCommand,
  MAX_QUICK_COMMANDS,
  sanitizeQuickCommands
} from './karafQuickCommands';

describe('sanitizeQuickCommands', () => {
  it('retorna null quando o valor não é uma lista', () => {
    expect(sanitizeQuickCommands(null)).toBeNull();
    expect(sanitizeQuickCommands('x')).toBeNull();
    expect(sanitizeQuickCommands({})).toBeNull();
  });

  it('aceita lista vazia (o usuário removeu tudo)', () => {
    expect(sanitizeQuickCommands([])).toEqual([]);
  });

  it('descarta itens sem comando válido e usa o comando como rótulo quando falta', () => {
    const result = sanitizeQuickCommands([
      { id: 'a', label: 'Bundles', command: ' bundle:list ' },
      { id: 'b', label: 'Vazio', command: '   ' },
      { id: 'c', command: 'la' },
      { id: 'd', label: 'Dois', command: 'la\nshutdown' },
      42,
      null
    ]);
    expect(result).toEqual([
      { id: 'a', label: 'Bundles', command: 'bundle:list' },
      { id: 'c', label: 'la', command: 'la' }
    ]);
  });

  it('gera novo id para ids repetidos ou ausentes', () => {
    const result = sanitizeQuickCommands([
      { id: 'x', label: 'A', command: 'a' },
      { id: 'x', label: 'B', command: 'b' },
      { label: 'C', command: 'c' }
    ])!;
    expect(new Set(result.map((r) => r.id)).size).toBe(3);
    expect(result[0].id).toBe('x');
  });

  it('limita quantidade e tamanho do rótulo', () => {
    const many = Array.from({ length: MAX_QUICK_COMMANDS + 5 }, (_, i) => ({ id: `i${i}`, label: 'L', command: `c${i}` }));
    expect(sanitizeQuickCommands(many)).toHaveLength(MAX_QUICK_COMMANDS);
    const [long] = sanitizeQuickCommands([{ id: 'a', label: 'x'.repeat(100), command: 'a' }])!;
    expect(long.label).toHaveLength(40);
  });

  it('os comandos padrão passam pela própria validação sem mudar', () => {
    expect(sanitizeQuickCommands(DEFAULT_QUICK_COMMANDS)).toEqual(DEFAULT_QUICK_COMMANDS);
  });
});

describe('isValidQuickCommand', () => {
  it('recusa vazio, multilinha e comando gigante', () => {
    expect(isValidQuickCommand('')).toBe(false);
    expect(isValidQuickCommand('a\r\nb')).toBe(false);
    expect(isValidQuickCommand('x'.repeat(301))).toBe(false);
    expect(isValidQuickCommand('feature:list -i')).toBe(true);
  });
});

describe('isDestructiveKarafCommand', () => {
  it('marca uninstall, log:clear e shutdown', () => {
    expect(isDestructiveKarafCommand('log:clear')).toBe(true);
    expect(isDestructiveKarafCommand('feature:uninstall -r foo')).toBe(true);
    expect(isDestructiveKarafCommand(' bundle:uninstall 12')).toBe(true);
    expect(isDestructiveKarafCommand('system:shutdown -f')).toBe(true);
  });

  it('não marca consultas nem o watch --stop', () => {
    expect(isDestructiveKarafCommand('feature:list -i')).toBe(false);
    expect(isDestructiveKarafCommand('bundle:watch --stop')).toBe(false);
    expect(isDestructiveKarafCommand('bundle:restart 12')).toBe(false);
  });
});
