import React from 'react';
import type { ContainerEnvironment, DockerContainerInfo } from '../../../../../shared/types';
import { useSaveEnvironmentModal } from '../../../hooks/containers/useSaveEnvironmentModal';
import { SaveEnvironmentHeader } from '../saveenv/SaveEnvironmentHeader';
import { SaveEnvironmentNameColor } from '../saveenv/SaveEnvironmentNameColor';
import { SaveEnvironmentPresets } from '../saveenv/SaveEnvironmentPresets';
import { SaveEnvironmentContainerList } from '../saveenv/SaveEnvironmentContainerList';
import { SaveEnvironmentSummary } from '../saveenv/SaveEnvironmentSummary';
import { SaveEnvironmentFooter } from '../saveenv/SaveEnvironmentFooter';
import { Modal } from '../../ui/Modal';

export interface SaveEnvironmentModalProps {
  isOpen: boolean;
  containers: DockerContainerInfo[];
  selectedDistro?: string;
  editingEnvironment?: ContainerEnvironment | null;
  preselectedContainerNames?: string[];
  onClose: () => void;
  onSave: (env: ContainerEnvironment) => void;
}

export const SaveEnvironmentModal: React.FC<SaveEnvironmentModalProps> = ({
  isOpen,
  containers,
  selectedDistro,
  editingEnvironment,
  preselectedContainerNames,
  onClose,
  onSave
}) => {
  const state = useSaveEnvironmentModal({
    isOpen,
    containers,
    selectedDistro,
    editingEnvironment,
    preselectedContainerNames,
    onClose,
    onSave
  });

  if (!isOpen) return null;

  return (
    <Modal
      open
      onClose={onClose}
      bare
      panelClassName="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in overflow-hidden"
      closeOnBackdrop={false}
      closeOnEscape={false}
    >
      <SaveEnvironmentHeader
        color={state.color}
        isEditing={state.isEditing}
        environmentName={editingEnvironment?.name}
      />

      {/* Corpo com Scroll */}
      <div className="p-4 overflow-y-auto space-y-4 flex-1">
        <SaveEnvironmentNameColor
          name={state.name}
          color={state.color}
          onNameChange={state.setName}
          onColorChange={state.setColor}
        />
        <SaveEnvironmentPresets
          cleanContainers={state.cleanContainers}
          selectedCount={state.selectedSlots.length}
          onApplyPreset={state.handleApplyPreset}
        />
        <SaveEnvironmentContainerList
          totalCount={state.cleanContainers.length}
          filteredContainers={state.filteredAvailableContainers}
          selectedSlots={state.selectedSlots}
          color={state.color}
          searchFilter={state.searchFilter}
          onSearchChange={state.setSearchFilter}
          getSlotIndex={state.getContainerSlotIndex}
          onToggle={state.handleToggleContainer}
          onUpdateDelay={state.handleUpdateDelay}
          onMove={state.handleMoveSlot}
        />
        <SaveEnvironmentSummary slots={state.selectedSlots} />
      </div>

      <SaveEnvironmentFooter
        isEditing={state.isEditing}
        canSave={Boolean(state.name.trim()) && state.selectedSlots.length > 0}
        onCancel={onClose}
        onSave={state.handleSave}
      />
    </Modal>
  );
};
