import { useMemo, useState } from 'react';
import { buildHelpSearchIndex, searchHelp, type HelpSearchEntry } from '../../utils/helpSearch';
import { getModuleSearchSources } from '../../utils/helpOverviewModules';
import type { FaqItem } from '../../components/help/helpData';

interface UseHelpSearchOptions {
  faqList: FaqItem[];
  shortcuts: { key: string; desc: string }[];
  onSelect: (entry: HelpSearchEntry) => void;
}

/** Busca do menu da Ajuda: lista perguntas, módulos e atalhos que casam e entrega o escolhido a quem abre a seção. */
export function useHelpSearch({ faqList, shortcuts, onSelect }: UseHelpSearchOptions) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const index = useMemo(
    () => buildHelpSearchIndex({ faqs: faqList, modules: getModuleSearchSources(), shortcuts }),
    [faqList, shortcuts]
  );
  const results = useMemo(() => searchHelp(index, query), [index, query]);

  const selectResult = (entry: HelpSearchEntry) => {
    setQuery('');
    setIsOpen(false);
    onSelect(entry);
  };

  return { query, setQuery, isOpen, setIsOpen, results, selectResult };
}
