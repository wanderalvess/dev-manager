import { describe, it, expect } from 'vitest';
import {
  filterLogLines,
  findErrorIndices,
  countLogLevels,
  getLogRowKind,
  isStackTraceLine,
  pickNextErrorIndex,
  formatFileSize,
  buildLogExportFileName,
  escapeRegExp,
  type LogTextFilter
} from './logsFilterUtils';

const baseFilter: LogTextFilter = {
  levelFilter: 'ALL',
  filterText: '',
  isRegex: false,
  isCaseSensitive: false,
  invertFilter: false
};

const lines = [
  '2024 INFO started',
  '2024 WARN slow',
  '2024 ERROR boom',
  '  at com.Foo.bar(Foo.java:1)',
  'Caused by: x',
  '2024 DEBUG detail'
];

describe('filterLogLines', () => {
  it('retorna tudo sem filtros', () => {
    expect(filterLogLines(lines, baseFilter)).toEqual(lines);
  });

  it('filtra por nivel ERROR incluindo Caused by', () => {
    const result = filterLogLines(lines, { ...baseFilter, levelFilter: 'ERROR' });
    expect(result).toEqual(['2024 ERROR boom', 'Caused by: x']);
  });

  it('filtra por texto sem diferenciar caixa', () => {
    expect(filterLogLines(lines, { ...baseFilter, filterText: 'SLOW' })).toEqual(['2024 WARN slow']);
  });

  it('respeita case sensitive e inversao', () => {
    expect(filterLogLines(lines, { ...baseFilter, filterText: 'SLOW', isCaseSensitive: true })).toEqual([]);
    expect(filterLogLines(lines, { ...baseFilter, filterText: 'INFO', invertFilter: true })).toHaveLength(5);
  });

  it('regex invalida nao filtra nada', () => {
    expect(filterLogLines(lines, { ...baseFilter, filterText: '(', isRegex: true })).toEqual(lines);
  });
});

describe('contagens e navegacao', () => {
  it('conta niveis', () => {
    expect(countLogLevels(lines)).toEqual({ errorCount: 1, warnCount: 1, infoCount: 1, debugCount: 1 });
  });

  it('encontra indices de erro', () => {
    expect(findErrorIndices(lines)).toEqual([2]);
  });

  it('navega circularmente entre erros', () => {
    expect(pickNextErrorIndex([2, 5, 9], 5, 'next')).toBe(9);
    expect(pickNextErrorIndex([2, 5, 9], 9, 'next')).toBe(2);
    expect(pickNextErrorIndex([2, 5, 9], 2, 'prev')).toBe(9);
    expect(pickNextErrorIndex([], -1, 'next')).toBe(-1);
  });
});

describe('classificacao de linha', () => {
  it('classifica severidade e stack trace', () => {
    expect(getLogRowKind('x ERROR y')).toBe('error');
    expect(getLogRowKind('x WARNING y')).toBe('warn');
    expect(getLogRowKind('x TRACE y')).toBe('debug');
    expect(getLogRowKind('plain')).toBe('plain');
    expect(isStackTraceLine('   at a.b')).toBe(true);
    expect(isStackTraceLine('normal')).toBe(false);
  });
});

describe('formatacao', () => {
  it('formata tamanho de arquivo', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('gera nome de exportacao', () => {
    expect(buildLogExportFileName('api', new Date('2024-01-02T03:04:05Z'))).toBe('api-log-2024-01-02-03-04-05.txt');
  });

  it('escapa metacaracteres de regex', () => {
    expect(escapeRegExp('a.b*c')).toBe('a\\.b\\*c');
  });
});
