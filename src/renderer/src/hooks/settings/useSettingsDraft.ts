import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppSettings } from '../../../../shared/types';
import { createInitialSettings, normalizeLoadedSettings } from '../../utils/settingsDefaults';

/**
 * Rascunho editável das configurações: carrega do disco, sabe se há alterações não salvas (comparando com o
 * snapshot do último carregamento/salvamento) e salva. `loadedSettings` muda a cada (re)carga, para quem precisa
 * reagir a ela (validar caminhos, remontar o editor de launchers).
 */
export function useSettingsDraft(onSettingsSaved?: () => void) {
  const [settings, setSettings] = useState<AppSettings>(createInitialSettings);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const [loadedSettings, setLoadedSettings] = useState<AppSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // O JSON.stringify roda só quando o rascunho muda, não a cada render
  const hasUnsavedChanges = useMemo(
    () => savedSnapshot !== null && JSON.stringify(settings) !== savedSnapshot,
    [settings, savedSnapshot]
  );

  /** Relê do disco (já sanitizado pelo main) e descarta o rascunho. */
  const reload = useCallback(async (): Promise<AppSettings | null> => {
    const api = window.electronAPI;
    if (!api) return null;
    try {
      const loaded = normalizeLoadedSettings(await api.getSettings());
      setSettings(loaded);
      setSavedSnapshot(JSON.stringify(loaded));
      setLoadedSettings(loaded);
      return loaded;
    } catch (err) {
      console.error('[Configurações] Falha ao carregar:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  const handleSave = useCallback(async () => {
    const api = window.electronAPI;
    if (!api) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await api.saveSettings(settings);
      setSavedSnapshot(JSON.stringify(settings));
      setSavedSuccess(true);
      window.setTimeout(() => setSavedSuccess(false), 2500);
      onSettingsSaved?.();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  }, [settings, onSettingsSaved]);

  return { settings, setSettings, loadedSettings, hasUnsavedChanges, isSaving, savedSuccess, saveError, handleSave, reload };
}
