import React from 'react';
import { Trash2, Save } from 'lucide-react';
import type { DeployProfile } from '../../../../shared/types';

interface DeployEditorFooterProps {
  profile: DeployProfile | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
  onDelete?: (profileId: string) => Promise<void>;
}

export const DeployEditorFooter: React.FC<DeployEditorFooterProps> = ({
  profile,
  isSaving,
  onClose,
  onSave,
  onDelete
}) => (
  <div className="px-6 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
    <div>
      {onDelete && profile?.id && (
        <button
          type="button"
          onClick={async () => {
            if (confirm(`Tem certeza que deseja excluir o perfil "${profile.name}"?`)) {
              await onDelete(profile.id);
              onClose();
            }
          }}
          className="text-xs text-destructive hover:underline flex items-center gap-1 font-medium"
        >
          <Trash2 className="w-3.5 h-3.5" /> Excluir Perfil
        </button>
      )}
    </div>

    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-lg shadow-xs transition-all"
      >
        <Save className="w-3.5 h-3.5" />
        {isSaving ? 'Salvando...' : 'Salvar Perfil'}
      </button>
    </div>
  </div>
);
