import { useState } from 'react';
import type { AppSettings, EnvironmentProfile } from '../../../../shared/types';
import type { SetSettings } from './settingsHookTypes';

/** Campos que compõem um preset de ambiente: os mesmos que EnvironmentProfile declara em shared/types. */
const ENVIRONMENT_PROFILE_FIELDS = [
  'projectsPath',
  'karafPath',
  'jdkPath',
  'intellijPath',
  'appPath',
  'webPort',
  'karafSshPort',
  'karafDebugPort',
  'monitoredPorts'
] as const;

/**
 * Presets de ambiente (ex.: "Cliente A", "Homologação"). Diferente do resto da tela, salvar/ativar/excluir aqui grava
 * na hora, só os campos do preset, sem esperar o botão "Salvar Configurações".
 */
export function useEnvironmentProfiles(
  settings: AppSettings,
  setSettings: SetSettings,
  validateAllPaths: (settings: AppSettings) => Promise<void>
) {
  const [newEnvironmentProfileLabel, setNewEnvironmentProfileLabel] = useState('');

  const handleSaveCurrentAsEnvironmentProfile = async () => {
    const label = newEnvironmentProfileLabel.trim();
    if (!label || !window.electronAPI) return;
    const profile: EnvironmentProfile = { id: `envprofile_${Date.now()}`, label };
    for (const field of ENVIRONMENT_PROFILE_FIELDS) {
      Object.assign(profile, { [field]: settings[field] });
    }
    const environmentProfiles = [...(settings.environmentProfiles || []), profile];
    setSettings((prev) => ({ ...prev, environmentProfiles }));
    await window.electronAPI.saveSettings({ environmentProfiles });
    setNewEnvironmentProfileLabel('');
  };

  const handleActivateEnvironmentProfile = async (profile: EnvironmentProfile) => {
    if (!window.electronAPI) return;
    const fieldsToApply: Partial<AppSettings> = { activeEnvironmentProfileId: profile.id };
    for (const field of ENVIRONMENT_PROFILE_FIELDS) {
      if (profile[field] !== undefined) Object.assign(fieldsToApply, { [field]: profile[field] });
    }
    const merged = { ...settings, ...fieldsToApply };
    setSettings(merged);
    await window.electronAPI.saveSettings(fieldsToApply);
    await validateAllPaths(merged);
  };

  const handleDeleteEnvironmentProfile = async (id: string) => {
    if (!window.electronAPI) return;
    const environmentProfiles = (settings.environmentProfiles || []).filter((p) => p.id !== id);
    setSettings((prev) => ({ ...prev, environmentProfiles }));
    await window.electronAPI.saveSettings({ environmentProfiles });
  };

  return {
    newEnvironmentProfileLabel,
    setNewEnvironmentProfileLabel,
    handleSaveCurrentAsEnvironmentProfile,
    handleActivateEnvironmentProfile,
    handleDeleteEnvironmentProfile
  };
}
