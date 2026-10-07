import React from 'react';
import { COLOR_OPTIONS } from '../../../utils/saveEnvironmentUtils';

interface SaveEnvironmentNameColorProps {
  name: string;
  color: string;
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
}

export const SaveEnvironmentNameColor: React.FC<SaveEnvironmentNameColorProps> = ({
  name,
  color,
  onNameChange,
  onColorChange
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
    <div className="sm:col-span-2">
      <label className="text-xs font-semibold text-foreground block mb-1">
        Nome do Grupo <span className="text-rose-500">*</span>
      </label>
      <input
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Ex: Stack Financeiro, Core Bancos, Mensageria"
        className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-medium"
        autoFocus
      />
    </div>

    <div>
      <label className="text-xs font-semibold text-foreground block mb-1">Cor de Identificação</label>
      <div className="flex items-center gap-1.5 flex-wrap pt-1">
        {COLOR_OPTIONS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onColorChange(c)}
            style={{ backgroundColor: c }}
            className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
              color === c
                ? 'scale-125 ring-2 ring-foreground/40 ring-offset-2 ring-offset-card shadow-2xs'
                : 'opacity-70 hover:opacity-100 hover:scale-110'
            }`}
          />
        ))}
      </div>
    </div>
  </div>
);
