import { useEffect, useMemo, useState } from 'react';
import type { SystemAppInfo, UpdateStatus } from '../../../../shared/types';
import { getMissingRequiredPaths } from '../../utils/environmentPageUtils';

/** Dados vindos do processo main (info do app, settings, status de atualização). */
export function useHelpPageData(settingsVersion?: number) {
  const [appInfo, setAppInfo] = useState<SystemAppInfo | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const needsSetup = useMemo(() => getMissingRequiredPaths(settings).length > 0, [settings]);

  useEffect(() => {
    if (window.electronAPI) {
      if (window.electronAPI.getAppInfo) {
        window.electronAPI.getAppInfo().then((info) => setAppInfo(info)).catch(() => {});
      }
      if (window.electronAPI.getSettings) {
        window.electronAPI.getSettings().then((st) => setSettings(st)).catch(() => {});
      }
      const unsubUpdate = window.electronAPI.onUpdateStatus?.(setUpdateStatus);
      return () => unsubUpdate?.();
    }
  }, [settingsVersion]);

  const handleCheckForUpdates = () => {
    setUpdateStatus({ status: 'checking' });
    window.electronAPI?.checkForUpdate?.();
  };

  return { appInfo, updateStatus, settings, needsSetup, handleCheckForUpdates };
}
