import { useState } from 'react';
import type { CcwCatalogItem } from '../../../../shared/types';
import { filterCatalogItems } from '../../utils/ccwModalUtils';

/** Estado e ação da aba "Árvore CCW". */
export function useCcwCatalog() {
  const [catalogItems, setCatalogItems] = useState<CcwCatalogItem[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(false);
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [catalogMessage, setCatalogMessage] = useState<string>('');
  const [catalogAuthCookie, setCatalogAuthCookie] = useState<string>('');

  const handleLoadCatalog = async () => {
    if (!window.electronAPI?.getCcwCatalog) return;
    setIsLoadingCatalog(true);
    setCatalogMessage('');
    try {
      const res = await window.electronAPI.getCcwCatalog(catalogAuthCookie.trim() || undefined);
      if (res.success && res.items) {
        setCatalogItems(res.items);
      } else {
        setCatalogMessage(res.message || 'Não foi possível carregar a árvore de rotinas.');
      }
    } catch (err: any) {
      setCatalogMessage(err?.message || 'Erro ao consultar Central de Controle.');
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  const filteredCatalog = filterCatalogItems(catalogItems, catalogSearch);

  return {
    catalogItems,
    isLoadingCatalog,
    catalogSearch,
    setCatalogSearch,
    catalogMessage,
    catalogAuthCookie,
    setCatalogAuthCookie,
    filteredCatalog,
    handleLoadCatalog
  };
}
