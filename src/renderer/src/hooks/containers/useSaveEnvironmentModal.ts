import { useEffect, useMemo, useState } from 'react';
import type { ContainerEnvironment, DockerContainerInfo } from '../../../../shared/types';
import {
  COLOR_OPTIONS,
  DEFAULT_COLOR,
  buildEnvironment,
  buildInitialSlotsForNew,
  buildInitialSlotsFromEnvironment,
  computePresetSlots,
  filterContainers,
  isSlotName,
  moveSlot,
  toggleSlot,
  updateSlotDelay,
  withCleanNames,
  type SaveEnvironmentPreset,
  type SelectedSlotItem
} from '../../utils/saveEnvironmentUtils';

interface UseSaveEnvironmentModalParams {
  isOpen: boolean;
  containers: DockerContainerInfo[];
  selectedDistro?: string;
  editingEnvironment?: ContainerEnvironment | null;
  preselectedContainerNames?: string[];
  onClose: () => void;
  onSave: (env: ContainerEnvironment) => void;
}

export function useSaveEnvironmentModal({
  isOpen,
  containers,
  selectedDistro,
  editingEnvironment,
  preselectedContainerNames,
  onClose,
  onSave
}: UseSaveEnvironmentModalParams) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlotItem[]>([]);
  const [searchFilter, setSearchFilter] = useState('');

  // Inicializa dados ao abrir o modal ou mudar o ambiente sendo editado
  useEffect(() => {
    if (!isOpen) return;

    if (editingEnvironment) {
      setName(editingEnvironment.name || '');
      setColor(editingEnvironment.color || DEFAULT_COLOR);
      setSelectedSlots(buildInitialSlotsFromEnvironment(editingEnvironment));
    } else {
      // Criação de novo grupo
      setName('');
      setColor(COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)]);
      setSelectedSlots(buildInitialSlotsForNew(containers, preselectedContainerNames));
    }
    setSearchFilter('');
  }, [isOpen, editingEnvironment, preselectedContainerNames, containers]);

  const isEditing = Boolean(editingEnvironment);

  const cleanContainers = useMemo(() => withCleanNames(containers), [containers]);

  // Containers filtrados pela busca interna do modal
  const filteredAvailableContainers = useMemo(
    () => filterContainers(cleanContainers, searchFilter),
    [cleanContainers, searchFilter]
  );

  const getContainerSlotIndex = (cleanName: string) =>
    selectedSlots.findIndex((s) => isSlotName(s, cleanName));

  const handleToggleContainer = (cleanName: string) =>
    setSelectedSlots((prev) => toggleSlot(prev, cleanName));

  const handleUpdateDelay = (cleanName: string, delay: number) =>
    setSelectedSlots((prev) => updateSlotDelay(prev, cleanName, delay));

  const handleMoveSlot = (index: number, direction: 'up' | 'down') =>
    setSelectedSlots((prev) => moveSlot(prev, index, direction));

  const handleApplyPreset = (preset: SaveEnvironmentPreset) => {
    const next = computePresetSlots(preset, cleanContainers);
    if (!next) return;
    setSelectedSlots(next);
    if (preset === 'winthor' && !name) setName('WinThor Stack');
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(buildEnvironment({ name, color, slots: selectedSlots, editingEnvironment, selectedDistro }));
    onClose();
  };

  return {
    name,
    setName,
    color,
    setColor,
    selectedSlots,
    searchFilter,
    setSearchFilter,
    isEditing,
    cleanContainers,
    filteredAvailableContainers,
    getContainerSlotIndex,
    handleToggleContainer,
    handleUpdateDelay,
    handleMoveSlot,
    handleApplyPreset,
    handleSave
  };
}
