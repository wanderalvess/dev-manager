import { normalizeSettingsTab, type SettingsTab } from '../components/settings/settingsSections';

const EVENT_NAME = 'hub:settings-tab';
let pendingTab: SettingsTab | null = null;

/**
 * Pede à tela de Configurações para abrir numa seção (vale também se ela ainda não foi montada).
 * Aceita os ids antigos de aba e os das seções do onboarding; um id desconhecido cai na Visão geral.
 */
export function requestSettingsTab(tab: string): void {
  const section = normalizeSettingsTab(tab) ?? 'overview';
  pendingTab = section;
  window.dispatchEvent(new CustomEvent<SettingsTab>(EVENT_NAME, { detail: section }));
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
