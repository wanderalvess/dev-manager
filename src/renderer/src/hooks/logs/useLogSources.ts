import { useState, useEffect, useCallback, useMemo } from 'react';
import { RealtimeLogSource, AppSettings } from '../../../../shared/types';

const DEFAULT_SOURCES: RealtimeLogSource[] = [];

export const EMPTY_LOG_SOURCE: RealtimeLogSource = {
  id: '',
  name: '',
  filePath: '',
  encoding: 'utf-8',
  enabled: false
};

/** Fontes de log salvas em AppSettings e a fonte atualmente selecionada. */
export function useLogSources(settingsVersion?: number) {
  const [sources, setSources] = useState<RealtimeLogSource[]>(DEFAULT_SOURCES);
  const [activeSourceId, setActiveSourceId] = useState<string>('');

  const activeSource = useMemo(() => {
    return sources.find((s) => s.id === activeSourceId) || sources[0] || EMPTY_LOG_SOURCE;
  }, [sources, activeSourceId]);

  const loadSavedSources = useCallback(async () => {
    if (!window.electronAPI?.getSettings) return;
    try {
      const settings: AppSettings = await window.electronAPI.getSettings();
      if (Array.isArray(settings.realtimeLogSources) && settings.realtimeLogSources.length > 0) {
        setSources(settings.realtimeLogSources);
        if (settings.activeLogSourceId && settings.realtimeLogSources.some((s) => s.id === settings.activeLogSourceId)) {
          setActiveSourceId(settings.activeLogSourceId);
        } else {
          setActiveSourceId(settings.realtimeLogSources[0].id);
        }
      }
    } catch (err) {
      console.warn('[LogsPage] Erro ao carregar fontes salvas:', err);
    }
  }, []);

  useEffect(() => {
    loadSavedSources();
  }, [loadSavedSources, settingsVersion]);

  const persistSources = useCallback(
    async (newSources: RealtimeLogSource[], newActiveId?: string) => {
      setSources(newSources);
      if (newActiveId) setActiveSourceId(newActiveId);

      if (window.electronAPI?.saveSettings) {
        try {
          await window.electronAPI.saveSettings({
            realtimeLogSources: newSources,
            activeLogSourceId: newActiveId || activeSourceId
          });
        } catch (err) {
          console.error('[LogsPage] Falha ao salvar fontes de log:', err);
        }
      }
    },
    [activeSourceId]
  );

  return { sources, activeSourceId, setActiveSourceId, activeSource, persistSources };
}
