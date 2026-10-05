import React from 'react';
import type { KarafInstallSourceType } from '../../../utils/karafInstallModalUtils';

interface KarafInstallSourceSelectorProps {
  value: KarafInstallSourceType;
  onChange: (value: KarafInstallSourceType) => void;
}

const OPTIONS: { type: KarafInstallSourceType; label: string }[] = [
  { type: 'project', label: 'Projeto do Workspace' },
  { type: 'mvn', label: 'Coordenada Maven' },
  { type: 'file', label: 'Arquivo .JAR Local' }
];

export const KarafInstallSourceSelector: React.FC<KarafInstallSourceSelectorProps> = ({ value, onChange }) => (
  <div>
    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Origem do Bundle</label>
    <div className="grid grid-cols-3 gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.type}
          type="button"
          onClick={() => onChange(opt.type)}
          className={`p-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
            value === opt.type
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-card text-muted-foreground hover:bg-muted'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);
