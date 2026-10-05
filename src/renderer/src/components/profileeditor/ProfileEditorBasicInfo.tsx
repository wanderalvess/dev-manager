import React from 'react';

interface ProfileEditorBasicInfoProps {
  name: string;
  description: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}

export const ProfileEditorBasicInfo: React.FC<ProfileEditorBasicInfoProps> = ({
  name,
  description,
  onNameChange,
  onDescriptionChange
}) => (
  <div className="px-6 py-3 border-b border-border bg-background grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-1">
        Nome do Perfil / Stack
      </label>
      <input
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Ex: Minha Stack, Frontend + Backend..."
        className="w-full bg-input/50 border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
        placeholder="Ex: PostgreSQL, SSO na 8787, Gateway 8080, API 8888, App 3000..."
        className="w-full bg-input/50 border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  </div>
);
