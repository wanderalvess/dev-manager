import { describe, it, expect } from 'vitest';
import { buildEmptyResultHint, formatConnectionTarget } from './emptyResultHint';

describe('buildEmptyResultHint', () => {
  it('não mostra nada enquanto carrega', () => {
    expect(buildEmptyResultHint({ status: 'loading' })).toBeNull();
  });

  it('estimativa 0: tabela parece vazia', () => {
    const t = buildEmptyResultHint({ status: 'done', estimate: 0 });
    expect(t).toContain('aprox. 0 linhas (estimativa do catálogo)');
    expect(t).toContain('parece vazia');
  });

  it('estimativa > 0: sugere segurança por linha, permissão e WHERE', () => {
    const t = buildEmptyResultHint({ status: 'done', estimate: 1500 });
    expect(t).toContain('aprox. 1.500 linhas (estimativa do catálogo)');
    expect(t).toMatch(/segurança por linha/);
    expect(t).toMatch(/permissão/);
    expect(t).toMatch(/WHERE/);
  });

  it('estimativa indisponível ou erro: tabela parece vazia', () => {
    expect(buildEmptyResultHint({ status: 'done', estimate: undefined })).toContain('parece vazia');
    expect(buildEmptyResultHint({ status: 'error' })).toContain('parece vazia');
  });
});

describe('formatConnectionTarget', () => {
  it('monta database @ host:porta', () => {
    expect(formatConnectionTarget({ database: 'postgres', host: 'sposrvaplhom007', port: 5432 })).toBe('postgres @ sposrvaplhom007:5432');
  });

  it('sem database mostra só host:porta', () => {
    expect(formatConnectionTarget({ database: '', host: 'localhost', port: 1521 })).toBe('localhost:1521');
  });
});
