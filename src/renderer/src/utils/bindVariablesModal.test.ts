import { describe, expect, it } from 'vitest';
import type { BindInputState } from './sqlBinds';
import {
  appendManualBind,
  clearBindValues,
  getBindBadgeTone,
  getBindValuePlaceholder,
  normalizeBindName,
  removeBindAt,
  updateBindType,
  updateBindValue
} from './bindVariablesModal';

const base: BindInputState[] = [
  { name: 'A', value: '1', type: 'auto', prefix: ':' },
  { name: 'B', value: '2', type: 'number', prefix: '&' }
];

describe('bindVariablesModal', () => {
  it('normaliza o nome da variável', () => {
    expect(normalizeBindName('  cod-cli_1 ')).toBe('CODCLI_1');
    expect(normalizeBindName('---')).toBe('');
  });

  it('adiciona bind manual e ignora duplicado', () => {
    const added = appendManualBind(base, 'C', '@');
    expect(added).toHaveLength(3);
    expect(added[2]).toEqual({ name: 'C', value: '', type: 'auto', prefix: '@', raw: '@C' });
    expect(appendManualBind(base, 'A', ':')).toBe(base);
  });

  it('remove, limpa e atualiza itens sem mutar', () => {
    expect(removeBindAt(base, 0).map((b) => b.name)).toEqual(['B']);
    expect(clearBindValues(base).every((b) => b.value === '')).toBe(true);
    expect(updateBindType(base, 1, 'date')[1].type).toBe('date');
    expect(updateBindValue(base, 0, 'x')[0].value).toBe('x');
    expect(base[0].value).toBe('1');
  });

  it('classifica o prefixo', () => {
    expect(getBindBadgeTone('&&')).toBe('sqlplus');
    expect(getBindBadgeTone('@')).toBe('script');
    expect(getBindBadgeTone('#{}')).toBe('template');
    expect(getBindBadgeTone(undefined)).toBe('native');
  });

  it('gera o placeholder por tipo', () => {
    expect(getBindValuePlaceholder({ name: 'X', value: '', type: 'list' })).toContain('Ex:');
    expect(getBindValuePlaceholder({ name: 'X', value: '', type: 'date' })).toBe('YYYY-MM-DD');
    expect(getBindValuePlaceholder({ name: 'X', value: '', type: 'auto' })).toBe('Valor para :X...');
  });
});
