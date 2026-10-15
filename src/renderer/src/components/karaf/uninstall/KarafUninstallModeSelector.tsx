import React from 'react';
import { Layers, Package } from 'lucide-react';

interface KarafUninstallModeSelectorProps {
  mode: 'feature' | 'bundle';
  onChange: (mode: 'feature' | 'bundle') => void;
}

const cardClass = (active: boolean) =>
  `p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
    active
      ? 'border-danger/60 bg-danger/10 text-foreground ring-1 ring-danger/30'
      : 'border-border bg-card hover:bg-muted/40 text-muted-foreground'
  }`;

export const KarafUninstallModeSelector: React.FC<KarafUninstallModeSelectorProps> = ({ mode, onChange }) => (
  <div className="space-y-2">
    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
      Tipo de Desinstalação
    </label>
    <div className="grid grid-cols-2 gap-2">
      <button type="button" onClick={() => onChange('feature')} className={cardClass(mode === 'feature')}>
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-danger" />
            Desinstalação Permanente
          </span>
          <span className="text-2xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-danger/20 text-danger">
            Recomendado
          </span>
        </div>
        <p className="text-2xs text-muted-foreground">
          Executa <code className="text-danger font-mono">feature:uninstall -r</code>. Não volta ao reiniciar o Karaf.
        </p>
      </button>

      <button type="button" onClick={() => onChange('bundle')} className={cardClass(mode === 'bundle')}>
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-warning" />
            Apenas Bundle (Memória)
          </span>
          <span className="text-2xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
            OSGi
          </span>
        </div>
        <p className="text-2xs text-muted-foreground">
          Executa <code className="text-warning font-mono">bundle:uninstall</code>. Pode retornar se Karaf reiniciar.
        </p>
      </button>
    </div>
  </div>
);
