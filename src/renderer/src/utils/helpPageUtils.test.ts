import { describe, it, expect } from 'vitest';
import type { FaqItem } from '../components/help/helpData';
import {
  helpPageFaqCategories,
  helpPageFaqCategoryCounts,
  helpPageVisibleCategories,
  helpPageFilterFaqs,
  helpPageIsValidChangelog,
  helpPageIsValidMcpDocs
} from './helpPageUtils';

const faqs: FaqItem[] = [
  { id: 'a', question: 'Como mudar a porta?', category: 'Rede', answer: null, tags: ['porta', 'ssh'] },
  { id: 'b', question: 'Backup do banco', category: 'Banco', answer: null, tags: ['oracle'] },
  { id: 'c', question: 'Outra de rede', category: 'Rede', answer: null, tags: [] }
];

describe('helpPageFaqCategories', () => {
  it('inicia com all e remove duplicadas', () => {
    expect(helpPageFaqCategories(faqs)).toEqual(['all', 'Rede', 'Banco']);
  });
});

describe('helpPageFilterFaqs', () => {
  it('sem filtro devolve tudo', () => {
    expect(helpPageFilterFaqs(faqs, '', 'all')).toHaveLength(3);
  });

  it('busca por pergunta, categoria e tag sem diferenciar caixa', () => {
    expect(helpPageFilterFaqs(faqs, 'PORTA', 'all').map((f) => f.id)).toEqual(['a']);
    expect(helpPageFilterFaqs(faqs, 'banco', 'all').map((f) => f.id)).toEqual(['b']);
    expect(helpPageFilterFaqs(faqs, 'oracle', 'all').map((f) => f.id)).toEqual(['b']);
  });

  it('combina busca com categoria', () => {
    expect(helpPageFilterFaqs(faqs, 'rede', 'Rede').map((f) => f.id)).toEqual(['a', 'c']);
    expect(helpPageFilterFaqs(faqs, 'rede', 'Banco')).toEqual([]);
  });
});

describe('validação de conteúdo dinâmico', () => {
  it('changelog rejeita vazio e erro de leitura', () => {
    expect(helpPageIsValidChangelog('# ok')).toBe(true);
    expect(helpPageIsValidChangelog('')).toBe(false);
    expect(helpPageIsValidChangelog(undefined)).toBe(false);
    expect(helpPageIsValidChangelog('Erro ao ler arquivo')).toBe(false);
  });

  it('docs MCP rejeita avisos do main', () => {
    expect(helpPageIsValidMcpDocs('# Catálogo')).toBe(true);
    expect(helpPageIsValidMcpDocs('# Documentação não encontrada')).toBe(false);
    expect(helpPageIsValidMcpDocs('# Erro ao ler documentação')).toBe(false);
    expect(helpPageIsValidMcpDocs(null)).toBe(false);
  });
});

describe('helpPageFaqCategoryCounts', () => {
  it('soma todas e separa por categoria', () => {
    expect(helpPageFaqCategoryCounts(faqs, '')).toEqual({ all: 3, Rede: 2, Banco: 1 });
  });

  it('respeita o termo de busca, sem acento', () => {
    expect(helpPageFaqCategoryCounts(faqs, 'ORACLE')).toEqual({ all: 1, Banco: 1 });
    expect(helpPageFaqCategoryCounts([{ ...faqs[0], question: 'Configurações' }], 'configuracoes').all).toBe(1);
  });
});

describe('helpPageVisibleCategories', () => {
  const cats = ['all', 'A', 'B', 'C', 'D'];
  const counts = { all: 10, A: 1, B: 5, C: 3, D: 1 };

  it('ordena pelos assuntos com mais perguntas e respeita o limite', () => {
    expect(helpPageVisibleCategories(cats, counts, 'all', false, 2)).toEqual(['all', 'B', 'C']);
  });

  it('mantém visível o assunto selecionado fora do corte', () => {
    expect(helpPageVisibleCategories(cats, counts, 'D', false, 2)).toEqual(['all', 'B', 'C', 'D']);
  });

  it('mostra todos quando expandido, no mesmo critério de ordem', () => {
    expect(helpPageVisibleCategories(cats, counts, 'all', true, 2)).toEqual(['all', 'B', 'C', 'A', 'D']);
  });
});
