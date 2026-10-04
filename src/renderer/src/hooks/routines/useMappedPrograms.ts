import { useState, useEffect, useCallback } from 'react';
import { MappedProgram, AppSettings } from '../../../../shared/types';
import { buildMappedProgramFromPath, renameMappedProgram } from '../../utils/routinesPageUtils';

export function useMappedPrograms(settingsVersion?: number, loadRoutines?: () => Promise<void>) {
  const [mappedPrograms, setMappedPrograms] = useState<MappedProgram[]>([]);
  const [runningMappedId, setRunningMappedId] = useState<string | null>(null);
  const [isAddingProgram, setIsAddingProgram] = useState(false);
  const [appPath, setAppPath] = useState<string>('');
  const [winthorStartActive, setWinthorStartActive] = useState<boolean>(true);

  const loadSettingsAndPrograms = useCallback(async () => {
    if (window.electronAPI?.getSettings) {
      try {
        const st: AppSettings = await window.electronAPI.getSettings();
        setMappedPrograms(st.mappedPrograms || []);
        setAppPath(st.appPath || '');
        setWinthorStartActive(st.winthorStartEnabled ?? true);
      } catch (err) {
        console.warn('Erro ao carregar configurações de rotinas:', err);
      }
    }
  }, []);

  // O catálogo é recarregado antes das configurações para manter a ordem original de disparo.
  useEffect(() => {
    loadRoutines?.();
    loadSettingsAndPrograms();
  }, [loadRoutines, loadSettingsAndPrograms, settingsVersion]);

  const persistMappedPrograms = async (updated: MappedProgram[]) => {
    setMappedPrograms(updated);
    if (window.electronAPI) {
      await window.electronAPI.saveSettings({ mappedPrograms: updated });
    }
  };

  const handleAddMappedProgram = async () => {
    if (!window.electronAPI) return;
    setIsAddingProgram(true);
    try {
      const picked = await window.electronAPI.selectFile({
        filters: [{ name: 'Executáveis', extensions: ['exe', 'bat', 'cmd'] }]
      });
      if (!picked) return;
      await persistMappedPrograms([...mappedPrograms, buildMappedProgramFromPath(picked)]);
    } finally {
      setIsAddingProgram(false);
    }
  };

  const handleRenameMappedProgram = (id: string, name: string) => {
    setMappedPrograms((prev) => renameMappedProgram(prev, id, name));
  };

  const handleRenameMappedProgramBlur = () => {
    persistMappedPrograms(mappedPrograms);
  };

  const handleRemoveMappedProgram = (id: string) => {
    persistMappedPrograms(mappedPrograms.filter((p) => p.id !== id));
  };

  const handleLaunchMappedProgram = async (id: string) => {
    setRunningMappedId(id);
    try {
      if (window.electronAPI) {
        await window.electronAPI.launchMappedProgram(id);
      }
    } finally {
      setTimeout(() => setRunningMappedId(null), 1500);
    }
  };

  return {
    mappedPrograms,
    runningMappedId,
    isAddingProgram,
    appPath,
    winthorStartActive,
    handleAddMappedProgram,
    handleRenameMappedProgram,
    handleRenameMappedProgramBlur,
    handleRemoveMappedProgram,
    handleLaunchMappedProgram
  };
}
