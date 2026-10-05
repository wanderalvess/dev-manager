import { useEffect, useState } from 'react';
import type { HelpCategory } from '../../components/help/helpData';

/** Aba ativa, busca e estado do FAQ (filtro de categoria e itens expandidos). */
export function useHelpPageSearch(initialSearch?: string) {
  const [activeCategory, setActiveCategory] = useState<HelpCategory>(initialSearch ? 'faq' : 'overview');
  const [searchQuery, setSearchQuery] = useState(initialSearch || '');
  const [faqCategoryFilter, setFaqCategoryFilter] = useState<string>('all');
  const [expandedFaqs, setExpandedFaqs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialSearch) {
      setSearchQuery(initialSearch);
      setActiveCategory('faq');
    }
  }, [initialSearch]);

  const toggleFaq = (id: string) => {
    setExpandedFaqs((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Digitar na busca a partir da Visão Geral leva direto ao FAQ, onde estão os resultados.
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (val.trim() && activeCategory === 'overview') {
      setActiveCategory('faq');
    }
  };

  return {
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    faqCategoryFilter,
    setFaqCategoryFilter,
    expandedFaqs,
    toggleFaq,
    handleSearchChange
  };
}
