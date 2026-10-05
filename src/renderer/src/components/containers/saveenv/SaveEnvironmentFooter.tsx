import React from 'react';

interface SaveEnvironmentFooterProps {
  isEditing: boolean;
  canSave: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export const SaveEnvironmentFooter: React.FC<SaveEnvironmentFooterProps> = ({
  isEditing,
  canSave,
  onCancel,
  onSave
}) => (
  <div className="p-3 border-t border-border flex items-center justify-end space-x-2 shrink-0 bg-muted/10">
    <button
      type="button"
      onClick={onCancel}
      className="px-3 py-1.5 rounded-lg border border-border/80 bg-card hover:bg-muted text-xs font-semibold text-foreground transition cursor-pointer"
    >
      Cancelar
    </button>
    <button
      type="button"
      onClick={onSave}
      disabled={!canSave}
      className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 active:scale-98"
    >
      {isEditing ? 'Salvar Alterações' : 'Criar Grupo'}
    </button>
  </div>
);
