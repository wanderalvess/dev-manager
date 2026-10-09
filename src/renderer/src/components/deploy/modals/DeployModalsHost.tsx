import React from 'react';
import type { DeployProfile, GitProjectInfo } from '../../../../../shared/types';
import type { DeployModalsState } from '../../../hooks/deploy/useDeployModals';
import { DeployProfileEditorModal } from '../../DeployProfileEditorModal';
import { KarafBundleManagerModal } from '../../KarafBundleManagerModal';
import { DeployHistoryModal } from '../../DeployHistoryModal';
import { Routine801CatalogModal } from '../../Routine801CatalogModal';
import { KarafJvmMemoryModal } from '../../KarafJvmMemoryModal';
import { KarafFeaturesModal } from '../../karaf/modals/KarafFeaturesModal';

interface DeployModalsHostProps {
  modals: DeployModalsState;
  projects: GitProjectInfo[];
  onSaveProfile: (profile: DeployProfile) => Promise<void>;
  onDeleteProfile: (id: string) => Promise<void>;
}

/** Agrupa todos os modais da página de Deploy para manter a página enxuta. */
export const DeployModalsHost: React.FC<DeployModalsHostProps> = ({
  modals,
  projects,
  onSaveProfile,
  onDeleteProfile
}) => (
  <>
    <DeployProfileEditorModal
      isOpen={modals.isProfileModalOpen}
      onClose={modals.closeProfileEditor}
      profile={modals.editingProfile}
      projects={projects}
      onSave={onSaveProfile}
      onDelete={onDeleteProfile}
    />

    {/* Modal Gerenciador de Bundles OSGi */}
    <KarafBundleManagerModal
      isOpen={modals.isBundlesModalOpen}
      onClose={() => modals.setIsBundlesModalOpen(false)}
      projects={projects}
    />

    {/* Modal Catálogo Oficial WinThor - Rotina 801 */}
    <Routine801CatalogModal
      isOpen={modals.isRoutine801ModalOpen}
      onClose={() => modals.setIsRoutine801ModalOpen(false)}
    />

    {/* Modal Histórico de Execuções de Deploy */}
    <DeployHistoryModal
      isOpen={modals.isHistoryModalOpen}
      onClose={() => modals.setIsHistoryModalOpen(false)}
      history={modals.historyList}
      onClear={modals.handleClearHistory}
    />

    {/* Modal Gerenciador de Features & Repositórios Maven */}
    <KarafFeaturesModal
      isOpen={modals.isFeaturesModalOpen}
      onClose={() => modals.setIsFeaturesModalOpen(false)}
    />

    {/* Modal Monitor de Memória JVM (Heap/Non-Heap/GC) */}
    <KarafJvmMemoryModal
      isOpen={modals.isJvmMemoryModalOpen}
      onClose={() => modals.setIsJvmMemoryModalOpen(false)}
    />
  </>
);
