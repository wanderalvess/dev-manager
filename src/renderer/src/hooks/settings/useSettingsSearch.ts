import { useEffect, useMemo, useState } from 'react';
import { SETTINGS_SEARCH_INDEX, type SettingsSearchEntry, type SettingsTab } from '../../components/settings/settingsSearchData';

const HIGHLIGHT_CLASSES = ['ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background', 'rounded-xl'];

/** Busca rápida dentro de Configurações: lista os campos que casam, troca para a aba e realça o campo escolhido. */
export function useSettingsSearch(activeTab: SettingsTab, setActiveTab: (tab: SettingsTab) => void) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedFieldId, setHighlightedFieldId] = useState<string | null>(null);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return SETTINGS_SEARCH_INDEX.filter(
      (entry) => entry.label.toLowerCase().includes(needle) || entry.keywords.toLowerCase().includes(needle)
    ).slice(0, 8);
  }, [query]);

  const selectResult = (entry: SettingsSearchEntry) => {
    setActiveTab(entry.tab);
    setQuery('');
    setIsOpen(false);
    setHighlightedFieldId(entry.id);
    window.setTimeout(() => {
      document.getElementById(entry.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
    window.setTimeout(() => setHighlightedFieldId(null), 2200);
  };

  // Realce temporário (ring) no campo encontrado; refeito quando a aba troca, pois o elemento só existe na aba ativa
  useEffect(() => {
    if (!highlightedFieldId) return undefined;
    const el = document.getElementById(highlightedFieldId);
    if (!el) return undefined;
    el.classList.add(...HIGHLIGHT_CLASSES);
    return () => {
      el.classList.remove(...HIGHLIGHT_CLASSES);
    };
  }, [highlightedFieldId, activeTab]);

  return { query, setQuery, isOpen, setIsOpen, results, selectResult };
}
