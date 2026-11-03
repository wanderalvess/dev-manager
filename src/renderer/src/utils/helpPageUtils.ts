import type { FaqItem } from '../components/help/helpData';
import { normalizeHelpText } from './helpSearch';

/** Categorias distintas do FAQ, precedidas por 'all'. */
export function helpPageFaqCategories(faqList: FaqItem[]): string[] {
  const cats = new Set(faqList.map((f) => f.category));
  return ['all', ...Array.from(cats)];
}

/** Filtra o FAQ por termo (pergunta, categoria ou tags, sem diferenciar caixa nem acento) e por categoria selecionada. */
export function helpPageFilterFaqs(
  faqList: FaqItem[],
  searchQuery: string,
  categoryFilter: string
): FaqItem[] {
  const needle = normalizeHelpText(searchQuery.trim());
  return faqList.filter((item) => {
    const matchesSearch =
      !needle ||
      normalizeHelpText(item.question).includes(needle) ||
      normalizeHelpText(item.category).includes(needle) ||
      item.tags.some((t) => normalizeHelpText(t).includes(needle));

    const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;

    return matchesSearch && matchesCat;
  });
}

/** Quantas perguntas cada categoria tem com o termo atual (a chave 'all' soma todas). */
export function helpPageFaqCategoryCounts(faqList: FaqItem[], searchQuery: string): Record<string, number> {
  const matching = helpPageFilterFaqs(faqList, searchQuery, 'all');
  const counts: Record<string, number> = { all: matching.length };
  for (const item of matching) counts[item.category] = (counts[item.category] ?? 0) + 1;
  return counts;
}

/**
 * Assuntos que aparecem como chips: 'all' primeiro e, em seguida, os de mais perguntas (empate: ordem original).
 * Recolhido, mostra só os "limit" primeiros e mantém visível o assunto selecionado, mesmo que ele esteja fora do corte.
 */
export function helpPageVisibleCategories(
  categories: string[],
  counts: Record<string, number>,
  selected: string,
  showAll: boolean,
  limit = 8
): string[] {
  const rest = categories
    .filter((c) => c !== 'all')
    .map((name, order) => ({ name, order }))
    .sort((a, b) => (counts[b.name] ?? 0) - (counts[a.name] ?? 0) || a.order - b.order)
    .map((c) => c.name);
  if (showAll) return ['all', ...rest];
  const top = rest.slice(0, limit);
  if (selected !== 'all' && !top.includes(selected) && rest.includes(selected)) top.push(selected);
  return ['all', ...top];
}

/** Conteúdo dinâmico do changelog só substitui o embutido se a leitura não devolveu erro. */
export function helpPageIsValidChangelog(content: string | undefined | null): content is string {
  return Boolean(content) && !content!.startsWith('Erro ao ler');
}

/** Idem para o catálogo MCP: o main devolve markdown de aviso quando falha. */
export function helpPageIsValidMcpDocs(content: string | undefined | null): content is string {
  return (
    Boolean(content) &&
    !content!.startsWith('# Documentação não encontrada') &&
    !content!.startsWith('# Erro ao ler documentação')
  );
}
