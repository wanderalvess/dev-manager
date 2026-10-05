import { useState } from 'react';
import type { DeployProfile, DeployProfileHistoryEntry } from '../../../../shared/types';

export function useDeployModals() {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<DeployProfile | null>(null);
  const [isBundlesModalOpen, setIsBundlesModalOpen] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [isRoutine801ModalOpen, setIsRoutine801ModalOpen] = useState<boolean>(false);
  const [isFeaturesModalOpen, setIsFeaturesModalOpen] = useState<boolean>(false);
  const [isJvmMemoryModalOpen, setIsJvmMemoryModalOpen] = useState<boolean>(false);
  const [historyList, setHistoryList] = useState<DeployProfileHistoryEntry[]>([]);

  const openProfileEditor = (profile: DeployProfile | null) => {
    setEditingProfile(profile);
    setIsProfileModalOpen(true);
  };

  const closeProfileEditor = () => {
    setIsProfileModalOpen(false);
    setEditingProfile(null);
  };

  const handleOpenHistory = async () => {
    if (window.electronAPI?.getDeployProfileHistory) {
      const history = await window.electronAPI.getDeployProfileHistory();
      setHistoryList(history || []);
    }
    setIsHistoryModalOpen(true);
  };

  const handleClearHistory = async () => {
    if (window.electronAPI?.clearDeployProfileHistory) {
      await window.electronAPI.clearDeployProfileHistory();
      setHistoryList([]);
    }
  };

  return {
    isProfileModalOpen,
    editingProfile,
    openProfileEditor,
    closeProfileEditor,
    isBundlesModalOpen,
    setIsBundlesModalOpen,
    isHistoryModalOpen,
    setIsHistoryModalOpen,
    isRoutine801ModalOpen,
    setIsRoutine801ModalOpen,
    isFeaturesModalOpen,
    setIsFeaturesModalOpen,
    isJvmMemoryModalOpen,
    setIsJvmMemoryModalOpen,
    historyList,
    handleOpenHistory,
    handleClearHistory
  };
}

export type DeployModalsState = ReturnType<typeof useDeployModals>;
