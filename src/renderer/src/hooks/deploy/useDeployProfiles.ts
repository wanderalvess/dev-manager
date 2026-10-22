import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { DeployProfile } from '../../../../shared/types';
import { showToast } from '../../components/ToastHost';
import {
  buildImportedProfile,
  buildProfileExportFileName,
  duplicateDeployProfile,
  profileNeedsKaraf,
  toggleProfileStep,
  toggleAllProfileSteps
} from '../../utils/deployProfileUtils';

export function useDeployProfiles(settingsVersion?: number) {
  const [profiles, setProfiles] = useState<DeployProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('');
  const [karafPath, setKarafPath] = useState<string>('');
  const [karafValid, setKarafValid] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Espelhos síncronos: cliques rápidos precisam partir do último estado gravado, não do fechamento do render.
  const profilesRef = useRef<DeployProfile[]>([]);
  const activeIdRef = useRef<string>('');
  const saveChainRef = useRef<Promise<unknown>>(Promise.resolve());

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
          profilesRef.current = st.deployProfiles;
          setProfiles(st.deployProfiles);
          setActiveProfileId((curr) => {
            const next = curr || st.activeDeployProfileId || st.deployProfiles?.[0]?.id || '';
            activeIdRef.current = next;
            return next;
          });
        }
      });
    }
  }, [settingsVersion]);

  const persistProfiles = async (updated: DeployProfile[], activeId: string) => {
    profilesRef.current = updated;
    activeIdRef.current = activeId;
    setProfiles(updated);
    setActiveProfileId(activeId);
    if (window.electronAPI && window.electronAPI.saveSettings) {
      // Grava em série: a última chamada sempre carrega o estado mais novo.
      const save = saveChainRef.current.then(() =>
        window.electronAPI.saveSettings({ deployProfiles: profilesRef.current, activeDeployProfileId: activeIdRef.current })
      );
      saveChainRef.current = save.catch(() => undefined);
      await save;
    }
  };

  /** Troca só o perfil ativo, sem regravar a lista de perfis. */
  const selectProfile = async (id: string) => {
    activeIdRef.current = id;
    setActiveProfileId(id);
    if (window.electronAPI?.saveSettings) {
      const save = saveChainRef.current.then(() => window.electronAPI.saveSettings({ activeDeployProfileId: id }));
      saveChainRef.current = save.catch(() => undefined);
      await save;
    }
  };

  const handleSaveProfile = async (saved: DeployProfile) => {
    const current = profilesRef.current;
    const exists = current.some((p) => p.id === saved.id);
    const updated = exists ? current.map((p) => (p.id === saved.id ? saved : p)) : [...current, saved];
    await persistProfiles(updated, saved.id);
  };

  const handleDeleteProfile = async (id: string) => {
    const current = profilesRef.current;
    if (current.length <= 1) {
      showToast('Mantenha ao menos um perfil de deploy.', 'info');
      return;
    }
    const remaining = current.filter((p) => p.id !== id);
    await persistProfiles(remaining, remaining[0]?.id || '');
  };

  const handleDuplicateProfile = async () => {
    if (!activeProfile) return;
    const duplicated = duplicateDeployProfile(activeProfile);
    await persistProfiles([...profilesRef.current, duplicated], duplicated.id);
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
        showToast('Arquivo JSON inválido para Perfil de Deploy.', 'info');
        return;
      }
      await persistProfiles([...profilesRef.current, imported], imported.id);
    } catch (err: any) {
      showToast(`Falha ao importar perfil: ${err?.message || err}`, 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Sempre parte do último estado gravado (ref), para que dois cliques seguidos se somem em vez de um desfazer o outro.
  const latestActiveProfile = () => {
    const list = profilesRef.current;
    return list.find((p) => p.id === activeIdRef.current) || list[0] || null;
  };

  const handleToggleStep = async (stepId: string) => {
    const base = latestActiveProfile();
    if (!base) return;
    await handleSaveProfile(toggleProfileStep(base, stepId));
  };

  const handleToggleAllSteps = async (enableAll: boolean) => {
    const base = latestActiveProfile();
    if (!base) return;
    await handleSaveProfile(toggleAllProfileSteps(base, enableAll));
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
    selectProfile,
    handleSaveProfile,
    handleDeleteProfile,
    handleDuplicateProfile,
    handleExportProfile,
    handleImportProfileClick,
    handleImportProfileFile,
    handleToggleStep,
    handleToggleAllSteps
  };
}
