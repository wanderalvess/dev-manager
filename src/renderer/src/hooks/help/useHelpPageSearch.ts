import { useEffect, useState } from 'react';
import type { HelpCategory } from '../../components/help/helpSections';

/** Seção ativa da Ajuda e o estado de "Resolver problemas" (filtro de texto, assunto e perguntas abertas). */
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

  const toggleFaq = (id: string, currentlyOpen: boolean) => {
    setExpandedFaqs((prev) => ({ ...prev, [id]: !currentlyOpen }));
  };

  // Abre a pergunta escolhida na busca ou na Visão geral: limpa os filtros, expande e rola até ela
  const openFaq = (id: string) => {
    setActiveCategory('faq');
    setSearchQuery('');
    setFaqCategoryFilter('all');
    setExpandedFaqs((prev) => ({ ...prev, [id]: true }));
    window.setTimeout(() => {
      document.getElementById(`help-faq-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
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
    openFaq
  };
}
