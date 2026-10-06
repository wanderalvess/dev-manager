import { useState } from 'react';
import type React from 'react';
import type { QualityValidationItem, ValidationCategory } from '../../../utils/qualityPageUtils';
import { buildNewValidationItem } from '../../../utils/qualityPageView';

type EditablePatch = Pick<QualityValidationItem, 'title' | 'targetName' | 'category' | 'notes'>;

// O estado do formulário vive na página (não no modal) para ser preservado ao cancelar/reabrir.
// Serve para criar e para editar (editingId definido = modo edição).
export function useQualityAddItemForm(
  addItem: (item: QualityValidationItem) => void,
  updateItem: (id: string, patch: EditablePatch) => void
) {
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newCategory, setNewCategory] = useState<ValidationCategory>('routine');
  const [newNotes, setNewNotes] = useState('');

  const resetFields = () => {
    setNewTitle('');
    setNewTarget('');
    setNewNotes('');
  };

  const openCreate = () => {
    // Descarta rascunho de uma edição cancelada para não vazar dados de outro cenário
    if (editingId) {
      resetFields();
      setEditingId(null);
    }
    setIsAddModalOpen(true);
  };

  const openEdit = (item: QualityValidationItem) => {
    setEditingId(item.id);
    setNewTitle(item.title);
    setNewTarget(item.targetName);
    setNewCategory(item.category);
    setNewNotes(item.notes ?? '');
    setIsAddModalOpen(true);
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    if (editingId) {
      resetFields();
      setEditingId(null);
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newTarget.trim()) return;

    if (editingId) {
      updateItem(editingId, {
        title: newTitle.trim(),
        targetName: newTarget.trim(),
        category: newCategory,
        notes: newNotes.trim() || undefined
      });
      setEditingId(null);
    } else {
      addItem(
        buildNewValidationItem({
          title: newTitle,
          target: newTarget,
          category: newCategory,
          notes: newNotes
        })
      );
    }
    resetFields();
    setIsAddModalOpen(false);
  };

  return {
    isAddModalOpen,
    isEditing: editingId !== null,
    openCreate,
    openEdit,
    closeModal,
    newTitle,
    setNewTitle,
    newTarget,
    setNewTarget,
    newCategory,
    setNewCategory,
    newNotes,
    setNewNotes,
    handleAddItem
  };
}
