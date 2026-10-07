import React from 'react';
import { Star, Layers, Search } from 'lucide-react';

type BatchTargetType = 'favorites' | 'module' | 'custom';

interface CcwBatchTargetSelectorProps {
  value: BatchTargetType;
  onChange: (v: BatchTargetType) => void;
}

const cardClass = (selected: boolean) =>
  `p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
    selected
      ? 'bg-primary/10 border-primary/80 ring-1 ring-primary/40 text-foreground shadow-2xs'
      : 'bg-card border-border/80 hover:border-primary/40 text-muted-foreground'
  }`;

/** Seletor de tipo de alvo com acabamento tátil. */
export const CcwBatchTargetSelector: React.FC<CcwBatchTargetSelectorProps> = ({ value, onChange }) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
    <button type="button" onClick={() => onChange('favorites')} className={cardClass(value === 'favorites')}>
      <div className="flex items-center justify-between">
        <div className="p-1 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/30">
          <Star className="w-3.5 h-3.5 fill-amber-500" />
        </div>
        <span className="text-2xs font-mono font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/20 uppercase tracking-wider">
          Recomendado
        </span>
      </div>
      <div className="mt-2.5">
        <span className="text-xs font-bold block text-foreground">Rotinas Favoritas</span>
        <span className="text-2xs text-muted-foreground block mt-0.5">
          Atualiza todas as rotinas marcadas com estrela no catálogo.
        </span>
      </div>
    </button>

    <button type="button" onClick={() => onChange('module')} className={cardClass(value === 'module')}>
      <div className="flex items-center justify-between">
        <div className="p-1 rounded-md bg-primary/10 text-primary border border-primary/30">
          <Layers className="w-3.5 h-3.5" />
        </div>
      </div>
      <div className="mt-2.5">
        <span className="text-xs font-bold block text-foreground">Módulo Específico</span>
        <span className="text-2xs text-muted-foreground block mt-0.5">
          Atualiza todas as rotinas de uma pasta funcional (ex: MOD-001).
        </span>
      </div>
    </button>

    <button type="button" onClick={() => onChange('custom')} className={cardClass(value === 'custom')}>
      <div className="flex items-center justify-between">
        <div className="p-1 rounded-md bg-primary/10 text-primary border border-primary/30">
          <Search className="w-3.5 h-3.5" />
        </div>
      </div>
      <div className="mt-2.5">
        <span className="text-xs font-bold block text-foreground">Lista Customizada</span>
        <span className="text-2xs text-muted-foreground block mt-0.5">
          Informe uma lista livre de códigos ou nomes (ex: 132, 529).
        </span>
      </div>
    </button>
  </div>
);
