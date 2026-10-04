import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { DeployProfile } from '../../../../shared/types';
import {
  buildImportedProfile,
  buildProfileExportFileName,
  duplicateDeployProfile,
  profileNeedsKaraf
} from '../../utils/deployProfileUtils';

export function useDeployProfiles(settingsVersion?: number) {
  const [profiles, setProfiles] = useState<DeployProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('');
  const [karafPath, setKarafPath] = useState<string>('');
  const [karafValid, setKarafValid] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeProfile = useMemo(() => {
    if (!profiles || profiles.length === 0) return null;
    return profiles.find((p) => p.id === activeProfileId) || profiles[0];
  }, [profiles, activeProfileId]);

  const activeProfileNeedsKaraf = useMemo(() => profileNeedsKaraf(activeProfile), [activeProfile]);

  // Carregar e sincronizar configurações do Karaf e perfis de deploy
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getSettings().then(async (st) => {
        setKarafPath(st.karafPath || '');
        if (st.karafPath) {
          const candidates = [
            `${st.karafPath}/bin/client.bat`,
            `${st.karafPath}/bin/client`,
            `${st.karafPath}/bin/client.sh`
          ];
          let found = false;
          for (const cand of candidates) {
            const check = await window.electronAPI.checkPath(cand);
            if (check && check.exists) {
              found = true;
              break;
            }
          }
          setKarafValid(found);
        }
        if (st.deployProfiles && st.deployProfiles.length > 0) {
          setProfiles(st.deployProfiles);
          setActiveProfileId((curr) => curr || st.activeDeployProfileId || st.deployProfiles?.[0]?.id || '');
        }
      });
    }
  }, [settingsVersion]);

  const persistProfiles = async (updated: DeployProfile[], activeId: string) => {
    setProfiles(updated);
    setActiveProfileId(activeId);
    if (window.electronAPI && window.electronAPI.saveSettings) {
      await window.electronAPI.saveSettings({ deployProfiles: updated, activeDeployProfileId: activeId });
    }
  };

  const handleSaveProfile = async (saved: DeployProfile) => {
    const exists = profiles.some((p) => p.id === saved.id);
    const updated = exists ? profiles.map((p) => (p.id === saved.id ? saved : p)) : [...profiles, saved];
    await persistProfiles(updated, saved.id);
  };

  const handleDeleteProfile = async (id: string) => {
    if (profiles.length <= 1) {
      alert('Mantenha ao menos um perfil de deploy.');
      return;
    }
    const remaining = profiles.filter((p) => p.id !== id);
    await persistProfiles(remaining, remaining[0]?.id || '');
  };

  const handleDuplicateProfile = async () => {
    if (!activeProfile) return;
    const duplicated = duplicateDeployProfile(activeProfile);
    await persistProfiles([...profiles, duplicated], duplicated.id);
  };

  const handleExportProfile = () => {
    if (!activeProfile) return;
    const jsonStr = JSON.stringify(activeProfile, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildProfileExportFileName(activeProfile.name);
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportProfileClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportProfileFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = buildImportedProfile(JSON.parse(text));
      if (!imported) {
        alert('Arquivo JSON inválido para Perfil de Deploy.');
        return;
      }
      await persistProfiles([...profiles, imported], imported.id);
    } catch (err: any) {
      alert(`Falha ao importar perfil: ${err?.message || err}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return {
    profiles,
    activeProfileId,
    setActiveProfileId,
    activeProfile,
    activeProfileNeedsKaraf,
    karafPath,
    karafValid,
    fileInputRef,
    persistProfiles,
    handleSaveProfile,
    handleDeleteProfile,
    handleDuplicateProfile,
    handleExportProfile,
    handleImportProfileClick,
    handleImportProfileFile
  };
}
