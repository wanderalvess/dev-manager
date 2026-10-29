import { describe, expect, it } from 'vitest';
import { batchNumberPattern, extractLogExcerpt, MAX_EXCERPT_LINE_LENGTH } from './logEvidence';

describe('logEvidence', () => {
  it('o lote precisa estar isolado: 482 não casa com 14821 nem com LOTE_4821', () => {
    const pattern = batchNumberPattern('482');
    expect(pattern.test('abrindo lote 482 para venda')).toBe(true);
    expect(pattern.test('lote=482,')).toBe(true);
    expect(pattern.test('lote 14821')).toBe(false);
    expect(pattern.test('LOTE_4821')).toBe(false);
    expect(pattern.test('x4820')).toBe(false);
  });

  it('número com caracteres especiais é tratado como texto, não como expressão', () => {
    expect(batchNumberPattern('A.1+').test('lote A.1+ ok')).toBe(true);
    expect(batchNumberPattern('A.1+').test('lote AX1 ok')).toBe(false);
  });

  it('guarda só as linhas do lote, conta os erros e mantém a ordem do arquivo', () => {
    const lines = [
      '10:00:01 INFO  abrindo lote 48213',
      '10:00:02 INFO  outro lote 99',
      '10:00:03 ERROR enviando lote 48213: timeout',
      '10:00:04 WARN  lote 48213 reenviado',
      '10:00:05 INFO  java.lang.IllegalStateException no lote 48213'
    ];
    const excerpt = extractLogExcerpt('ch', lines, '48213');

    expect(excerpt).toMatchObject({ source: 'ch', totalMatches: 4, errorLines: 2, truncated: false });
    expect(excerpt.lines).toEqual([lines[0], lines[2], lines[3], lines[4]]);
  });

  it('o marcador restringe: só entra a linha que cita o lote e o marcador', () => {
    const lines = ['[Worker] lote 48213 aberto', '[Outro] lote 48213 aberto', '[worker] lote 48213 fechado'];
    const excerpt = extractLogExcerpt('wsh', lines, '48213', '[WORKER]');

    expect(excerpt.lines).toEqual([lines[0], lines[2]]);
    expect(excerpt.totalMatches).toBe(2);
  });

  it('limita às últimas linhas e avisa que cortou', () => {
    const lines = Array.from({ length: 10 }, (_, i) => `linha ${i} do lote 7`);
    const excerpt = extractLogExcerpt('wsh', lines, '7', undefined, 3);

    expect(excerpt.lines).toEqual(['linha 7 do lote 7', 'linha 8 do lote 7', 'linha 9 do lote 7']);
    expect(excerpt).toMatchObject({ totalMatches: 10, truncated: true });
  });

  it('corta linhas gigantes e devolve vazio quando nada cita o lote', () => {
    const long = `lote 5 ${'x'.repeat(MAX_EXCERPT_LINE_LENGTH * 2)}`;
    const excerpt = extractLogExcerpt('ch', [long], '5');
    expect(excerpt.lines[0].length).toBe(MAX_EXCERPT_LINE_LENGTH + 1);
    expect(excerpt.lines[0].endsWith('…')).toBe(true);

    expect(extractLogExcerpt('ch', ['nada aqui'], '5')).toEqual({ source: 'ch', lines: [], totalMatches: 0, errorLines: 0, truncated: false });
  });
});
