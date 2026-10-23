import React from 'react';
import type { ContainerErrorsState } from '../../hooks/containers/useContainerErrors';
import type { ContainerToolModalsState } from '../../hooks/containers/useContainerToolModals';
import { OracleMaintenanceModal } from './modals/OracleMaintenanceModal';
import { WshUtilsModal } from './modals/WshUtilsModal';
import { WtaUtilsModal } from './modals/WtaUtilsModal';

interface ContainerToolModalsProps {
  tools: ContainerToolModalsState;
  errors: ContainerErrorsState;
}

/** Utilitários por stack WinThor (Oracle, WSH, WTA), usados pelos cartões de Containers e pela tela WinThor & WSL. */
export const ContainerToolModals: React.FC<ContainerToolModalsProps> = ({ tools, errors }) => (
  <>
    <OracleMaintenanceModal
      container={tools.oracleModalContainer}
      availableDumps={tools.availableDumps}
      isLoadingDumps={tools.isLoadingDumps}
      isOpeningDumpsFolder={tools.isOpeningDumpsFolder}
      onRefreshDumps={tools.loadAvailableDumps}
      onOpenDumpsFolder={tools.handleOpenDumpsFolder}
      onClose={tools.closeOracleModal}
      onError={errors.setErrorMessage}
    />

    <WshUtilsModal
      container={tools.wshModalContainer}
      wshPrereqs={tools.wshPrereqs}
      isLoadingWshPrereqs={tools.isLoadingWshPrereqs}
      isOpeningOptFolder={tools.isOpeningOptFolder}
      onLoadWshPrereqs={tools.loadWshPrereqs}
      onOpenOptFolder={tools.handleOpenOptFolder}
      onClose={tools.closeWshModal}
    />

    <WtaUtilsModal
      container={tools.wtaModalContainer}
      onClose={tools.closeWtaModal}
      onOpenKarafClient={tools.handleOpenKarafClient}
      isOpeningKarafClient={tools.isOpeningKarafClient}
    />
  </>
);
