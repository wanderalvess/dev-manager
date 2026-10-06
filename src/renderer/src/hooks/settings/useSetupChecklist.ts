import { useMemo } from 'react';
import type { AppSettings, PathStatusInfo } from '../../../../shared/types';
import type { SettingsTab } from '../../components/settings/settingsSearchData';
import { computeSetupChecklistStatus } from '../../utils/settingsListEditors';

/** Checklist de primeira configuração: orienta o usuário novo pelas etapas essenciais, com o atalho de cada uma. */
export function useSetupChecklist(
  settings: AppSettings,
  pathStatuses: Record<string, PathStatusInfo>,
  setActiveTab: (tab: SettingsTab) => void,
  onNavigate?: (tab: string) => void
) {
  const { karafUser, karafPass, hasKarafPass, databaseConnections } = settings;

  const checklist = useMemo(() => {
    const actionsById: Record<string, () => void> = {
      dirs: () => setActiveTab('dirs'),
      ide: () => setActiveTab('dirs'),
      'karaf-creds': () => setActiveTab('karaf'),
      database: () => onNavigate?.('database')
    };
    return computeSetupChecklistStatus({ karafUser, karafPass, hasKarafPass, databaseConnections }, pathStatuses).map((item) => ({
      ...item,
      action: actionsById[item.id]
    }));
  }, [pathStatuses, karafUser, karafPass, hasKarafPass, databaseConnections, setActiveTab, onNavigate]);

  return { checklist, pendingCount: checklist.filter((item) => !item.done).length };
}
