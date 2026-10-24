import type { SettingsTab } from '../components/settings/settingsSearchData';

const EVENT_NAME = 'hub:settings-tab';
let pendingTab: SettingsTab | null = null;

/** Pede à tela de Configurações para abrir numa aba (vale também se ela ainda não foi montada). */
export function requestSettingsTab(tab: SettingsTab): void {
  pendingTab = tab;
  window.dispatchEvent(new CustomEvent<SettingsTab>(EVENT_NAME, { detail: tab }));
}

/** Aba pedida antes de a tela montar (só lê: o initializer do useState roda duas vezes no StrictMode). */
export function peekPendingSettingsTab(): SettingsTab | null {
  return pendingTab;
}

export function clearPendingSettingsTab(): void {
  pendingTab = null;
}

export function onSettingsTabRequested(listener: (tab: SettingsTab) => void): () => void {
  const handler = (e: Event) => {
    pendingTab = null;
    listener((e as CustomEvent<SettingsTab>).detail);
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
