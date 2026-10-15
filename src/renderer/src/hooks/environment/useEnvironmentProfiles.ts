import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { AppSettings, AutomationProfile } from '../../../../shared/types';
import { resolveActiveProfile, getMissingRequiredPaths } from '../../utils/environmentPageUtils';
import { showToast } from '../../components/ToastHost';
import {
  buildProfileExportData,
  buildExportFileName,
  buildDuplicatedProfile,
  buildImportedProfile,
  upsertProfile,
  setStepEnabled
} from '../../utils/environmentProfileTransfer';
import { requestConfirm } from '../../components/ui/confirmService';

/** Configurações e perfis de automação: carga, seleção, persistência e importação/exportação. */
export function useEnvironmentProfiles(settingsVersion?: number) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [profiles, setProfiles] = useState<AutomationProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('');

  const activeProfile = useMemo(() => resolveActiveProfile(profiles, activeProfileId), [profiles, activeProfileId]);

  // Diretórios essenciais ainda não configurados (detecção automática não achou nada no disco).
  // Usado para orientar quem está usando o programa pela primeira vez direto para as Configurações.
  const missingRequiredPaths = useMemo(() => getMissingRequiredPaths(settings), [settings]);

  // Referências para valores voláteis usados em checagens periódicas (evita recriar callbacks)
  const settingsRef = useRef<AppSettings | null>(settings);
  settingsRef.current = settings;

  const profilesRef = useRef<AutomationProfile[]>(profiles);
  profilesRef.current = profiles;

  const fetchSettings = useCallback(async () => {
    if (window.electronAPI && window.electronAPI.getSettings) {
      try {
        const st = await window.electronAPI.getSettings();
        setSettings(st);
        settingsRef.current = st;

        const loadedProfiles = st.automationProfiles;
        if (loadedProfiles && loadedProfiles.length > 0) {
          setProfiles(loadedProfiles);
          profilesRef.current = loadedProfiles;
          setActiveProfileId((curr) => curr || st.activeProfileId || loadedProfiles[0].id);
        }
      } catch (err) {
        console.error('Erro ao buscar configurações:', err);
      }
    }
  }, []);

  // Sincroniza configurações ao montar e sempre que settingsVersion for incrementado
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings, settingsVersion]);

  // Persistência centralizada (sem risco de closure defasada / sobreposição)
  const persistProfiles = useCallback(async (newProfiles: AutomationProfile[], newActiveId: string) => {
    setProfiles(newProfiles);
    profilesRef.current = newProfiles;
    setActiveProfileId(newActiveId);

    if (window.electronAPI && window.electronAPI.saveProfiles) {
      try {
        const updatedSettings = await window.electronAPI.saveProfiles(newProfiles, newActiveId);
        if (updatedSettings) {
          setSettings(updatedSettings);
          settingsRef.current = updatedSettings;
        }
      } catch (err) {
        console.error('Erro ao persistir perfis:', err);
      }
    }
  }, []);

  const handleSelectProfile = useCallback(
    async (id: string) => {
      await persistProfiles(profilesRef.current, id);
    },
    [persistProfiles]
  );

  const handleSaveProfile = useCallback(
    async (saved: AutomationProfile) => {
      await persistProfiles(upsertProfile(profilesRef.current, saved), saved.id);
    },
    [persistProfiles]
  );

  const handleDeleteProfile = useCallback(
    async (id: string, skipConfirm = false) => {
      const currentList = profilesRef.current;
      if (currentList.length <= 1) {
        showToast('Não é possível excluir o único perfil existente.', 'info');
        return;
      }
      const target = currentList.find((p) => p.id === id);
      if (!target) return;

      if (!skipConfirm) {
        const confirmed = await requestConfirm({ title: 'Excluir perfil?', message: `Tem certeza que deseja excluir o perfil "${target.name}"?`, confirmLabel: 'Excluir', tone: 'danger' });
        if (!confirmed) {
          return;
        }
      }

      const remaining = currentList.filter((p) => p.id !== id);
      await persistProfiles(remaining, remaining[0]?.id || '');
    },
    [persistProfiles]
  );

  const handleDuplicateProfile = useCallback(async () => {
    if (!activeProfile) return;
    const duplicated = buildDuplicatedProfile(activeProfile);
    await persistProfiles([...profilesRef.current, duplicated], duplicated.id);
  }, [activeProfile, persistProfiles]);

  const handleExportProfile = useCallback(
    (profileToExport?: AutomationProfile) => {
      const target = profileToExport || activeProfile;
      if (!target) {
        showToast('Nenhum perfil selecionado para exportação.', 'info');
        return;
      }

      try {
        const jsonStr = JSON.stringify(buildProfileExportData(target), null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = buildExportFileName(target.name);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err: any) {
        showToast(`Erro ao exportar perfil: ${err?.message || err}`, 'error');
      }
    },
    [activeProfile]
  );

  const importFileInputRef = useRef<HTMLInputElement>(null);

  const handleImportFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const parsed = JSON.parse(await file.text());
        const importedProfile = buildImportedProfile(parsed);
        if (!importedProfile) {
          showToast('Arquivo JSON inválido. O arquivo deve conter uma lista de etapas (steps) válida.', 'info');
          return;
        }

        await persistProfiles([...profilesRef.current, importedProfile], importedProfile.id);
        showToast(`Perfil "${importedProfile.name}" importado com sucesso!`, 'success');
      } catch (err: any) {
        showToast(`Falha ao importar perfil: ${err?.message || err}`, 'error');
      } finally {
        if (e.target) e.target.value = '';
      }
    },
    [persistProfiles]
  );

  const handleToggleStepEnabled = useCallback(
    async (stepId: string, enabled: boolean) => {
      if (!activeProfile) return;
      const next = setStepEnabled(profilesRef.current, activeProfile, stepId, enabled);
      await persistProfiles(next.profiles, next.activeId);
    },
    [activeProfile, persistProfiles]
  );

  return {
    settings,
    settingsRef,
    profiles,
    activeProfileId,
    activeProfile,
    missingRequiredPaths,
    importFileInputRef,
    handleSelectProfile,
    handleSaveProfile,
    handleDeleteProfile,
    handleDuplicateProfile,
    handleExportProfile,
    handleImportFileChange,
    handleToggleStepEnabled
  };
}
