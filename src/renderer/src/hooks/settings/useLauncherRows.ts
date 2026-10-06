import { useCallback, useState } from 'react';
import { launcherMapToRows, launcherRowsToMap, type LauncherRow } from '../../utils/settingsListEditors';
import type { SetSettings } from './settingsHookTypes';

/**
 * Editor do launcher de rotinas (extensão -> executável). As linhas ficam à parte porque aceitam estado incompleto
 * (extensão ainda vazia); a cada alteração o mapa já normalizado vai para as configurações — sem efeito colateral
 * que reescreva o rascunho na abertura da tela.
 */
export function useLauncherRows(setSettings: SetSettings) {
  const [launcherRows, setLauncherRows] = useState<LauncherRow[]>([]);

  const resetRows = useCallback((map: Record<string, string> | undefined) => setLauncherRows(launcherMapToRows(map)), []);

  const commit = (next: LauncherRow[]) => {
    setLauncherRows(next);
    setSettings((prev) => ({ ...prev, routineLauncherMap: launcherRowsToMap(next) }));
  };

  const handleAddLauncherRow = () => commit([...launcherRows, { ext: '', path: '' }]);

  const handleUpdateLauncherRow = (index: number, field: 'ext' | 'path', value: string) =>
    commit(launcherRows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));

  const handleRemoveLauncherRow = (index: number) => commit(launcherRows.filter((_, i) => i !== index));

  const handleBrowseLauncherPath = async (index: number) => {
    const selected = await window.electronAPI?.selectFile?.();
    if (selected) handleUpdateLauncherRow(index, 'path', selected);
  };

  return { launcherRows, resetRows, handleAddLauncherRow, handleUpdateLauncherRow, handleRemoveLauncherRow, handleBrowseLauncherPath };
}
