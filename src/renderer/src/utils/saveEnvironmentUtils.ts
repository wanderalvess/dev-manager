import type {
  ContainerEnvironment,
  ContainerEnvironmentSlot,
  DockerContainerInfo
} from '../../../shared/types';

export const COLOR_OPTIONS = [
  '#0066cc', // Azul TOTVS / Docker
  '#10b981', // Esmeralda
  '#f59e0b', // Âmbar
  '#8b5cf6', // Roxo / Violeta
  '#ec4899', // Rosa
  '#06b6d4', // Ciano
  '#ef4444', // Vermelho
  '#64748b' // Ardósia
];

export const DEFAULT_COLOR = '#0066cc';

export interface SelectedSlotItem {
  name: string;
  delay: number;
}

export type CleanContainer = DockerContainerInfo & { cleanName: string };

export type SaveEnvironmentPreset = 'all' | 'running' | 'clear' | 'winthor';

export const cleanContainerName = (raw: string): string => raw.replace(/^\//, '').trim();

export const withCleanNames = (containers: DockerContainerInfo[]): CleanContainer[] =>
  containers.map((c) => ({ ...c, cleanName: cleanContainerName(c.names) }));

export const filterContainers = (containers: CleanContainer[], filter: string): CleanContainer[] => {
  if (!filter.trim()) return containers;
  const term = filter.toLowerCase();
  return containers.filter(
    (c) =>
      c.cleanName.toLowerCase().includes(term) ||
      c.image.toLowerCase().includes(term) ||
      c.ports.toLowerCase().includes(term)
  );
};

export const buildInitialSlotsFromEnvironment = (env: ContainerEnvironment): SelectedSlotItem[] => {
  const slots: SelectedSlotItem[] = [];
  for (const item of env.containers || []) {
    if (typeof item === 'string') {
      const delay = env.delays?.[item] || 0;
      slots.push({ name: cleanContainerName(item), delay });
    } else if (item && typeof item === 'object') {
      slots.push({ name: cleanContainerName(item.name), delay: item.delay || 0 });
    }
  }
  return slots;
};

export const buildInitialSlotsForNew = (
  containers: DockerContainerInfo[],
  preselected?: string[]
): SelectedSlotItem[] => {
  if (preselected && preselected.length > 0) {
    return preselected.map((n) => ({ name: cleanContainerName(n), delay: 0 }));
  }
  // Pré-seleciona containers ativos por padrão, se houver
  return containers
    .filter((c) => c.state === 'running')
    .map((c) => ({ name: cleanContainerName(c.names), delay: 0 }));
};

export const isSlotName = (slot: SelectedSlotItem, cleanName: string): boolean =>
  slot.name.toLowerCase() === cleanName.toLowerCase();

export const toggleSlot = (slots: SelectedSlotItem[], cleanName: string): SelectedSlotItem[] =>
  slots.some((s) => isSlotName(s, cleanName))
    ? slots.filter((s) => !isSlotName(s, cleanName))
    : [...slots, { name: cleanName, delay: 0 }];

export const clampDelay = (delay: number): number => Math.max(0, Math.min(300, isNaN(delay) ? 0 : delay));

export const updateSlotDelay = (
  slots: SelectedSlotItem[],
  cleanName: string,
  delay: number
): SelectedSlotItem[] => {
  const safeDelay = clampDelay(delay);
  return slots.map((s) => (isSlotName(s, cleanName) ? { ...s, delay: safeDelay } : s));
};

export const moveSlot = (
  slots: SelectedSlotItem[],
  index: number,
  direction: 'up' | 'down'
): SelectedSlotItem[] => {
  const next = [...slots];
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= next.length) return slots;
  const temp = next[index];
  next[index] = next[targetIndex];
  next[targetIndex] = temp;
  return next;
};

/** Retorna os novos slots do preset, ou null quando o preset WinThor não encontra nenhum container. */
export const computePresetSlots = (
  preset: SaveEnvironmentPreset,
  containers: CleanContainer[]
): SelectedSlotItem[] | null => {
  if (preset === 'all') return containers.map((c) => ({ name: c.cleanName, delay: 0 }));
  if (preset === 'running') {
    return containers.filter((c) => c.state === 'running').map((c) => ({ name: c.cleanName, delay: 0 }));
  }
  if (preset === 'clear') return [];

  const oracle = containers.find((c) => c.cleanName.toLowerCase().includes('oracle'));
  const wta = containers.find(
    (c) => c.cleanName.toLowerCase().includes('wta') || c.cleanName.toLowerCase().includes('linux')
  );
  const wsh = containers.find((c) => c.cleanName.toLowerCase().includes('wsh'));

  const list: SelectedSlotItem[] = [];
  if (oracle) list.push({ name: oracle.cleanName, delay: 30 });
  if (wta) list.push({ name: wta.cleanName, delay: 10 });
  if (wsh) list.push({ name: wsh.cleanName, delay: 0 });
  return list.length > 0 ? list : null;
};

export const hasWinthorCandidates = (containers: CleanContainer[]): boolean =>
  containers.some(
    (c) => c.cleanName.toLowerCase().includes('oracle') || c.cleanName.toLowerCase().includes('wta')
  );

interface BuildEnvironmentParams {
  name: string;
  color: string;
  slots: SelectedSlotItem[];
  editingEnvironment?: ContainerEnvironment | null;
  selectedDistro?: string;
}

export const buildEnvironment = ({
  name,
  color,
  slots: selected,
  editingEnvironment,
  selectedDistro
}: BuildEnvironmentParams): ContainerEnvironment => {
  const slots: ContainerEnvironmentSlot[] = selected.map((item, idx) => ({
    id: String(idx + 1),
    name: item.name,
    ...(item.delay > 0 ? { delay: item.delay } : {})
  }));

  const delaysMap: Record<string, number> = {};
  for (const item of selected) {
    if (item.delay > 0) delaysMap[item.name] = item.delay;
  }

  return {
    id: editingEnvironment?.id || `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: name.trim(),
    color,
    wslDistro: editingEnvironment?.wslDistro || selectedDistro || undefined,
    containers: slots,
    delays: Object.keys(delaysMap).length > 0 ? delaysMap : undefined
  };
};
