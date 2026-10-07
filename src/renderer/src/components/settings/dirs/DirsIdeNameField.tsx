import React from 'react';
import { AppSettings, detectIdeInfo } from '../../../../../shared/types';

interface DirsIdeNameFieldProps {
  settings: AppSettings;
  onChange: (value: string) => void;
}

export const DirsIdeNameField: React.FC<DirsIdeNameFieldProps> = ({ settings, onChange }) => (
  <div className="md:col-span-2 pt-1">
    <div className="bg-muted/40 border border-border/80 rounded-xl p-3 space-y-1">
      <label htmlFor="dirs-ide-name-field-1" className="block text-[11px] font-bold text-foreground">
        Rótulo de Exibição da IDE (Opcional):
      </label>
      <input id="dirs-ide-name-field-1"
        type="text"
        value={settings.ideName || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-1.5 text-foreground font-mono text-xs focus:outline-hidden focus:border-primary transition-colors"
        placeholder={`Padrão automático: "${detectIdeInfo(settings.intellijPath).name}"`}
      />
    </div>
  </div>
);
