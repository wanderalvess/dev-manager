import React from 'react';
import { FolderPlus, Pencil } from 'lucide-react';

interface SaveEnvironmentHeaderProps {
  color: string;
  isEditing: boolean;
  environmentName?: string;
}

export const SaveEnvironmentHeader: React.FC<SaveEnvironmentHeaderProps> = ({
  color,
  isEditing,
  environmentName
}) => (
  <div className="p-4 border-b border-border flex items-start space-x-3 shrink-0 bg-muted/20">
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
      style={{ backgroundColor: color }}
    >
      {isEditing ? <Pencil className="w-5 h-5" /> : <FolderPlus className="w-5 h-5" />}
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="text-sm font-bold text-foreground">
        {isEditing ? `Editar Grupo: ${environmentName || ''}` : 'Criar Grupo de Containers'}
      </h3>
      <p className="text-xs text-muted-foreground mt-0.5">
        Selecione quais containers fazem parte deste grupo e defina a ordem/delay de inicialização.
      </p>
    </div>
  </div>
);
