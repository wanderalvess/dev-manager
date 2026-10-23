import { useState } from 'react';
import { moveTargetIndex, removeItemAt, selectionAfterMove, selectionAfterRemove, swapItems } from '../utils/stepListUtils';

/** Estado de lista de etapas com seleção (adicionar, remover, mover, atualizar), comum aos editores de perfil. */
export function useStepListEditor<T>() {
  const [steps, setSteps] = useState<T[]>([]);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);

  const editingStep = editingStepIndex !== null ? steps[editingStepIndex] : null;

  const reset = (nextSteps: T[], nextIndex: number | null) => {
    setSteps(nextSteps);
    setEditingStepIndex(nextIndex);
  };

  const addStep = (step: T) => {
    setSteps((prev) => [...prev, step]);
    setEditingStepIndex(steps.length);
  };

  const removeStep = (index: number) => {
    setSteps((prev) => removeItemAt(prev, index));
    setEditingStepIndex(selectionAfterRemove(editingStepIndex, index));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const target = moveTargetIndex(index, direction, steps.length);
    if (target === null) return;
    setSteps((prev) => swapItems(prev, index, target));
    setEditingStepIndex(selectionAfterMove(editingStepIndex, index, target));
  };

  /** Substitui a etapa em edição pelo resultado de `patch(etapaAtual)`. */
  const updateCurrentStep = (patch: (step: T) => T) => {
    if (editingStepIndex === null || !steps[editingStepIndex]) return;
    setSteps((prev) => prev.map((step, i) => (i === editingStepIndex ? patch(step) : step)));
  };

  return {
    steps,
    setSteps,
    editingStep,
    editingStepIndex,
    setEditingStepIndex,
    reset,
    addStep,
    removeStep,
    moveStep,
    updateCurrentStep
  };
}
