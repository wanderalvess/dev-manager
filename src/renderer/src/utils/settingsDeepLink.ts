import type { SettingsTab } from '../components/settings/settingsSearchData';

let pendingSettingsTab: SettingsTab | null = null;
const listeners = new Set<(tab: SettingsTab) => void>();

export function requestSettingsTab(tab: SettingsTab): void {
  pendingSettingsTab = tab;
  listeners.forEach((cb) => cb(tab));
}

export function consumeSettingsTab(): SettingsTab | null {
  const t = pendingSettingsTab;
  pendingSettingsTab = null;
  return t;
}
