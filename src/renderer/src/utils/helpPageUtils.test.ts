import { describe, it, expect } from 'vitest';
import type { FaqItem } from '../components/help/helpData';
import {
  helpPageFaqCategories,
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
