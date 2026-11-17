import { describe, expect, it } from 'vitest';
import { buildWatchCommand } from './karafWatchCommand';

describe('buildWatchCommand', () => {
  it('monitora tudo quando o alvo está vazio', () => {
    expect(buildWatchCommand('start')).toBe('bundle:watch *');
    expect(buildWatchCommand('start', '  ')).toBe('bundle:watch *');
  });

  it('aceita ids, nomes e URLs mvn', () => {
    expect(buildWatchCommand('start', '12,13')).toBe('bundle:watch 12,13');
    expect(buildWatchCommand('start', 'mvn:com.acme/app/1.0.0')).toBe('bundle:watch mvn:com.acme/app/1.0.0');
  });

  it('para e lista sem alvo', () => {
    expect(buildWatchCommand('stop', 'qualquer')).toBe('bundle:watch --stop');
    expect(buildWatchCommand('list')).toBe('bundle:watch --list');
  });

  it('recusa alvo com metacaracteres de shell', () => {
    expect(buildWatchCommand('start', '12; la')).toBeNull();
    expect(buildWatchCommand('start', '$(x)')).toBeNull();
    expect(buildWatchCommand('start', 'a|b')).toBeNull();
  });
});
