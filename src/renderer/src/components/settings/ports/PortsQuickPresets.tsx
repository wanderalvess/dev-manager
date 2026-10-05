import React from 'react';
import { QUICK_PORT_PRESETS } from '../../../utils/portsTabUtils';

interface PortsQuickPresetsProps {
  onAddPort: (port?: number, label?: string) => void;
}

export const PortsQuickPresets: React.FC<PortsQuickPresetsProps> = ({ onAddPort }) => (
  <div className="bg-card border border-border rounded-xl p-3 space-y-2 shadow-sm">
    <span className="text-2xs font-bold text-muted-foreground uppercase tracking-wider block">
      Atalhos Rápidos de Adição:
    </span>
    <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
      {QUICK_PORT_PRESETS.map((preset) => (
        <button
          key={preset.port}
          type="button"
          onClick={() => onAddPort(preset.port, preset.label)}
          className={`px-2.5 py-1 rounded bg-card hover:bg-muted text-foreground border border-border ${preset.hoverBorderClass} transition-colors shadow-sm`}
        >
          {preset.buttonLabel}
        </button>
      ))}
    </div>
  </div>
);
