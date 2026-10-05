import type { FaqItem } from '../components/help/helpData';

/** Categorias distintas do FAQ, precedidas por 'all'. */
export function helpPageFaqCategories(faqList: FaqItem[]): string[] {
  const cats = new Set(faqList.map((f) => f.category));
  return ['all', ...Array.from(cats)];
}

/** Filtra o FAQ por termo (pergunta, categoria ou tags) e por categoria selecionada. */
export function helpPageFilterFaqs(
  faqList: FaqItem[],
  searchQuery: string,
  categoryFilter: string
): FaqItem[] {
  return faqList.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;

    return matchesSearch && matchesCat;
  });
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
