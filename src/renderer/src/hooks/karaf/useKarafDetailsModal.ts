import { useEffect, useState } from 'react';
import type { KarafBundleDetails, KarafBundleInfo } from '../../../../shared/types';
import { DEFAULT_DETAILS_TAB, type KarafDetailsTab } from '../../utils/karafDetailsModalUtils';

/** Carrega os detalhes do bundle alvo e controla a aba ativa (abre em 'diag' se houver diagnóstico). */
export function useKarafDetailsModal(target: KarafBundleInfo | null) {
  const [bundleDetails, setBundleDetails] = useState<KarafBundleDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsTab, setDetailsTab] = useState<KarafDetailsTab>(DEFAULT_DETAILS_TAB);

  useEffect(() => {
    if (!target) {
      setBundleDetails(null);
      return;
    }
    setDetailsTab(DEFAULT_DETAILS_TAB);
    if (!window.electronAPI?.getKarafBundleDetails) {
      setIsLoadingDetails(false);
      return;
    }
    setIsLoadingDetails(true);
    window.electronAPI.getKarafBundleDetails(target.id)
      .then((details) => {
        setBundleDetails(details);
        if (details?.diag) {
          setDetailsTab('diag');
        }
      })
      .catch((err) => {
        console.error('Erro ao buscar detalhes do bundle:', err);
        setBundleDetails(null);
      })
      .finally(() => {
        setIsLoadingDetails(false);
      });
  }, [target]);

  return { bundleDetails, isLoadingDetails, detailsTab, setDetailsTab };
}
