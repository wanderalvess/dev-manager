import { useCallback, useState } from 'react';
import type { AppSettings, PathStatusInfo } from '../../../../shared/types';
import { mergeDetectedPaths } from '../../utils/environmentPageUtils';
import type { SetSettings } from './settingsHookTypes';

const PATH_FIELDS: (keyof AppSettings)[] = ['projectsPath', 'karafPath', 'jdkPath', 'appPath', 'intellijPath', 'tautProjectPath'];

const NOT_CONFIGURED: PathStatusInfo = { path: '', exists: false, isDirectory: false, isFile: false, message: 'Não configurado' };

function fileFiltersFor(field: keyof AppSettings) {
  const all = { name: 'Todos os arquivos (*.*)', extensions: ['*'] };
  if (field === 'karafScript') return [{ name: 'Scripts de Execução (*.bat;*.cmd)', extensions: ['bat', 'cmd'] }, all];
  if (field === 'oracleTnsnamesPath') return [{ name: 'Configuração Oracle (*.ora)', extensions: ['ora'] }, all];
  return [{ name: 'Executáveis (*.exe)', extensions: ['exe'] }, all];
}

/** Status de existência dos caminhos configurados, seletores de pasta/arquivo e a auto-detecção. */
export function usePathValidation(settings: AppSettings, setSettings: SetSettings) {
  const [pathStatuses, setPathStatuses] = useState<Record<string, PathStatusInfo>>({});
  const [isDetecting, setIsDetecting] = useState(false);

  const validateAllPaths = useCallback(async (st: AppSettings) => {
    const checkPath = window.electronAPI?.checkPath;
    if (!checkPath) return;
    const entries = await Promise.all(
      PATH_FIELDS.map(async (key) => {
        const value = st[key];
        const status = typeof value === 'string' && value.trim() ? await checkPath(value.trim()) : NOT_CONFIGURED;
        return [key, status] as [string, PathStatusInfo];
      })
    );
    setPathStatuses(Object.fromEntries(entries));
  }, []);

  const validateSinglePath = useCallback(async (key: keyof AppSettings, value: string) => {
    const checkPath = window.electronAPI?.checkPath;
    if (!checkPath) return;
    if (!value || !value.trim()) {
      setPathStatuses((prev) => ({ ...prev, [key]: { ...NOT_CONFIGURED, path: value || '' } }));
      return;
    }
    try {
      const res = await checkPath(value.trim());
      setPathStatuses((prev) => ({ ...prev, [key]: res }));
    } catch {
      setPathStatuses((prev) => ({
        ...prev,
        [key]: { path: value, exists: false, isDirectory: false, isFile: false, message: 'Erro ao validar caminho' }
      }));
    }
  }, []);

  const applyPicked = (field: keyof AppSettings, selected: string) => {
    setSettings((prev) => ({ ...prev, [field]: selected }));
    void validateSinglePath(field, selected);
  };

  const handleBrowseDirectory = async (field: keyof AppSettings) => {
    const select = window.electronAPI?.selectDirectory;
    if (!select) return;
    const selected = await select((settings[field] as string) || '');
    if (selected) applyPicked(field, selected);
  };

  const handleBrowseFile = async (field: keyof AppSettings) => {
    const select = window.electronAPI?.selectFile;
    if (!select) return;
    const selected = await select({ defaultPath: (settings[field] as string) || '', filters: fileFiltersFor(field) });
    if (selected) applyPicked(field, selected);
  };

  const handleAutoDetect = async () => {
    const detect = window.electronAPI?.autoDetectPaths;
    if (!detect) return;
    setIsDetecting(true);
    try {
      const updated = mergeDetectedPaths(settings, await detect());
      setSettings(updated);
      await validateAllPaths(updated);
    } finally {
      setIsDetecting(false);
    }
  };

  return { pathStatuses, isDetecting, validateAllPaths, validateSinglePath, handleBrowseDirectory, handleBrowseFile, handleAutoDetect };
}
