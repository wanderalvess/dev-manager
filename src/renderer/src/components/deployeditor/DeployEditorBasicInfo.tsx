import React from 'react';

interface DeployEditorBasicInfoProps {
  name: string;
  description: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}

export const DeployEditorBasicInfo: React.FC<DeployEditorBasicInfoProps> = ({
  name,
  description,
  onNameChange,
  onDescriptionChange
}) => (
  <div className="px-6 py-3.5 border-b border-border bg-background grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-1">
        Nome do Perfil de Deploy
      </label>
      <input
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Ex: Deploy Karaf OSGi, Deploy Container Produção..."
        className="w-full bg-input/50 border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-1">
        Descrição (opcional)
      </label>
      <input
        type="text"
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        placeholder="Ex: Build + install no Karaf local, Build + push + restart do container..."
        className="w-full bg-input/50 border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  </div>
);
