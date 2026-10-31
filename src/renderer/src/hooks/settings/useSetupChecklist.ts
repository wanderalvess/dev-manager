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
    const toDirs = { action: () => setActiveTab('dirs'), actionLabel: 'Resolver em Caminhos & IDE' };
    const toKaraf = { action: () => setActiveTab('karaf'), actionLabel: 'Resolver em Karaf' };
    const actionsById: Record<string, { action: () => void; actionLabel: string }> = {
      dirs: toDirs,
      'karaf-path': toKaraf,
      ide: toDirs,
      'karaf-creds': toKaraf,
      database: { action: () => onNavigate?.('database'), actionLabel: 'Abrir Banco de Dados' }
    };
    return computeSetupChecklistStatus({ karafUser, karafPass, hasKarafPass, databaseConnections }, pathStatuses).map((item) => ({
      ...item,
      ...actionsById[item.id]
    }));
  }, [pathStatuses, karafUser, karafPass, hasKarafPass, databaseConnections, setActiveTab, onNavigate]);

  return { checklist, pendingCount: checklist.filter((item) => !item.done).length };
}
