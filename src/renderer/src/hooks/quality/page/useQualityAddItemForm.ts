import { useState } from 'react';
import type React from 'react';
import type { QualityValidationItem, ValidationCategory } from '../../../utils/qualityPageUtils';
import { buildNewValidationItem } from '../../../utils/qualityPageView';

// O estado do formulário vive na página (não no modal) para ser preservado ao cancelar/reabrir.
export function useQualityAddItemForm(addItem: (item: QualityValidationItem) => void) {
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newCategory, setNewCategory] = useState<ValidationCategory>('routine');
  const [newNotes, setNewNotes] = useState('');

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newTarget.trim()) return;

    addItem(
      buildNewValidationItem({
        title: newTitle,
        target: newTarget,
        category: newCategory,
        notes: newNotes
      })
    );
    setNewTitle('');
    setNewTarget('');
    setNewNotes('');
    setIsAddModalOpen(false);
  };

  return {
    isAddModalOpen,
    setIsAddModalOpen,
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
