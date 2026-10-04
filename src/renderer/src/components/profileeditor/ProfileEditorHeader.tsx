import React from 'react';
import { X, Layers } from 'lucide-react';

interface ProfileEditorHeaderProps {
  isEditing: boolean;
  onClose: () => void;
}

export const ProfileEditorHeader: React.FC<ProfileEditorHeaderProps> = ({ isEditing, onClose }) => (
  <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-primary/10 text-primary">
        <Layers className="w-5 h-5" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-foreground">
          {isEditing ? 'Editar Perfil de Automação' : 'Novo Perfil de Automação'}
        </h2>
        <p className="text-xs text-muted-foreground">
          Defina o fluxo sequencial de projetos, scripts e serviços do seu ambiente
        </p>
      </div>
    </div>
    <button
      onClick={onClose}
      className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
    >
      <X className="w-5 h-5" />
    </button>
  </div>
);
