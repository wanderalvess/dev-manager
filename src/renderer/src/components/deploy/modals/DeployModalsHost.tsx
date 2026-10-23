import React from 'react';
import type { DeployProfile, GitProjectInfo } from '../../../../../shared/types';
import type { DeployModalsState } from '../../../hooks/deploy/useDeployModals';
import { DeployProfileEditorModal } from '../../DeployProfileEditorModal';
import { KarafBundleManagerModal } from '../../KarafBundleManagerModal';
import { DeployHistoryModal } from '../../DeployHistoryModal';
import { Routine801CatalogModal } from '../../Routine801CatalogModal';
import { DeployQueueBuilderModal } from './DeployQueueBuilderModal';
import { DependencyChainModal } from './DependencyChainModal';

interface DeployModalsHostProps {
  modals: DeployModalsState;
  projects: GitProjectInfo[];
  activeProfile: DeployProfile | null;
  onSaveProfile: (profile: DeployProfile) => Promise<void>;
  onDeleteProfile: (id: string) => Promise<void>;
  onRunProfile?: (profile: DeployProfile) => void;
}

/** Agrupa todos os modais da página de Deploy para manter a página enxuta. */
export const DeployModalsHost: React.FC<DeployModalsHostProps> = ({
  modals,
  projects,
  activeProfile,
  onSaveProfile,
  onDeleteProfile,
  onRunProfile
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

    {/* Assistente: montar a fila de build a partir dos projetos do workspace */}
    <DeployQueueBuilderModal
      isOpen={modals.isQueueModalOpen}
      activeProfile={activeProfile}
      onClose={() => modals.setIsQueueModalOpen(false)}
      onApply={onSaveProfile}
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

    {/* Modal Cadeia de Dependências Multi-Camadas */}
    <DependencyChainModal
      isOpen={modals.isChainModalOpen}
      onClose={() => modals.setIsChainModalOpen(false)}
      projects={projects}
      onSaveProfile={onSaveProfile}
      onRunProfile={onRunProfile}
    />
  </>
);
