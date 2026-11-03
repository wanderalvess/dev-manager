import type { AppSettings } from '../../../shared/types';
import type { SettingsTab } from '../components/settings/settingsSections';
import type { SetupChecklistItemStatus } from './settingsListEditors';

export type SectionStatus = { kind: 'ok' } | { kind: 'pending'; count: number } | { kind: 'optional' };

/** Itens do checklist inicial que cada seção resolve (o de banco é resolvido na página Banco de Dados). */
const CHECKLIST_BY_SECTION: Partial<Record<SettingsTab, string[]>> = {
  dirs: ['dirs', 'ide'],
  karaf: ['karaf-path', 'karaf-creds']
};

/**
 * Marca de cada seção no menu lateral: pronta ou com pendências (pelo checklist inicial) e "opcional" para
 * recursos que só interessam a quem os usa, enquanto estiverem vazios. Seção sem marca não aparece no mapa.
 */
export function computeSectionStatuses(
  checklist: SetupChecklistItemStatus[],
  settings: Pick<AppSettings, 'qualitySources' | 'tautProjectPath' | 'integrationLayers'>
): Partial<Record<SettingsTab, SectionStatus>> {
  const result: Partial<Record<SettingsTab, SectionStatus>> = {};
  for (const [section, ids] of Object.entries(CHECKLIST_BY_SECTION) as [SettingsTab, string[]][]) {
    const pending = checklist.filter((item) => ids.includes(item.id) && !item.done).length;
    result[section] = pending > 0 ? { kind: 'pending', count: pending } : { kind: 'ok' };
  }
  if (!(settings.qualitySources?.length || settings.tautProjectPath?.trim())) result.quality = { kind: 'optional' };
  if (!settings.integrationLayers?.length) result.integration = { kind: 'optional' };
  return result;
}
