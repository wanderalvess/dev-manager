import { useEffect, useState } from 'react';
import type { AppSettings } from '../../../../../shared/types';

export function useQualityPageSettings(settingsVersion?: number) {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    if (window.electronAPI?.getSettings) {
      window.electronAPI.getSettings().then((st) => setSettings(st)).catch(() => {});
    }
  }, [settingsVersion]);

  const qualitySources = settings?.qualitySources || [];
  const activeQualitySource = qualitySources.find((s) =>
    settings?.activeQualitySourceId ? s.id === settings.activeQualitySourceId : s.enabled
  );

  return { settings, qualitySources, activeQualitySource };
}
