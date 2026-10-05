import React from 'react';
import { X, Layers } from 'lucide-react';

interface DeployEditorHeaderProps {
  isEditing: boolean;
  onClose: () => void;
}

export const DeployEditorHeader: React.FC<DeployEditorHeaderProps> = ({ isEditing, onClose }) => (
  <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
    <div className="flex items-center gap-3">
      <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
        <Layers className="w-5 h-5" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-foreground">
          {isEditing ? 'Editar Perfil de Deploy' : 'Novo Perfil de Deploy'}
        </h2>
        <p className="text-xs text-muted-foreground">
          Defina a sequência de build e publicação (Karaf, Containers ou comandos genéricos)
        </p>
      </div>
    </div>
    <button
      onClick={onClose}
      className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors cursor-pointer"
    >
      <X className="w-5 h-5" />
    </button>
  </div>
);
