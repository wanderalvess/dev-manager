/** Operações puras de lista de etapas, compartilhadas pelos editores de perfil de Ambiente e de Deploy. */

export const swapItems = <T>(items: T[], a: number, b: number): T[] => {
  const copy = [...items];
  const temp = copy[a];
  copy[a] = copy[b];
  copy[b] = temp;
  return copy;
};

export const removeItemAt = <T>(items: T[], index: number): T[] => items.filter((_, i) => i !== index);

/** Índice selecionado após remover `removedIndex`; null se a removida era a selecionada. */
export const selectionAfterRemove = (selected: number | null, removedIndex: number): number | null => {
  if (selected === removedIndex) return null;
  if (selected !== null && selected > removedIndex) return selected - 1;
  return selected;
};

/** Mantém a seleção seguindo a etapa movida (ou a que trocou de lugar com ela). */
export const selectionAfterMove = (selected: number | null, index: number, target: number): number | null => {
  if (selected === index) return target;
  if (selected === target) return index;
  return selected;
};

/** Destino de um movimento 'up'/'down'; null se sair dos limites da lista. */
export const moveTargetIndex = (index: number, direction: 'up' | 'down', length: number): number | null => {
  const target = direction === 'up' ? index - 1 : index + 1;
  return target < 0 || target >= length ? null : target;
};
