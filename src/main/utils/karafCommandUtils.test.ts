import { describe, expect, it } from 'vitest';
import {
  filterBenignStderr,
  findKarafErrorMatch,
  isHeavyKarafCommand,
  stripAnsiSequences
} from './karafCommandUtils';

describe('karafCommandUtils', () => {
  it('filterBenignStderr descarta ruidos da JVM e preserva erros reais', () => {
    const raw = 'Picked up JAVA_TOOL_OPTIONS: -Dx\n\nerro real\n';
    expect(filterBenignStderr(raw)).toBe('erro real');
    expect(filterBenignStderr('')).toBe('');
  });

  it('isHeavyKarafCommand reconhece install/repo-add/update', () => {
    expect(isHeavyKarafCommand(' feature:install foo')).toBe(true);
    expect(isHeavyKarafCommand('bundle:update 1')).toBe(true);
    expect(isHeavyKarafCommand('bundle:list')).toBe(false);
  });

  it('stripAnsiSequences remove sequencias de escape', () => {
    expect(stripAnsiSequences('\u001b[31mErro\u001b[0m')).toBe('Erro');
  });

  it('findKarafErrorMatch detecta erro em comandos comuns e em log:display', () => {
    expect(findKarafErrorMatch('bundle:list', 'ok\nCommand not found: x')?.[0]).toBe('Command not found: x');
    expect(findKarafErrorMatch('bundle:list', 'tudo certo')).toBeNull();
    expect(findKarafErrorMatch('log:display', 'Error executing command: falhou')?.[1]).toBe('falhou');
    expect(findKarafErrorMatch('log:display', 'linha com Command not found')).toBeNull();
  });
});
