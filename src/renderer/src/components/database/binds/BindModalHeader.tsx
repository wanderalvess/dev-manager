import React from 'react';
import { SlidersHorizontal, X } from 'lucide-react';

interface BindModalHeaderProps {
  count: number;
  onClose: () => void;
}

export const BindModalHeader: React.FC<BindModalHeaderProps> = ({ count, onClose }) => (
  <div className="flex items-center justify-between border-b border-border/60 pb-3">
    <div className="flex items-center space-x-2.5">
      <div className="p-2 rounded-lg bg-violet-500/20 text-violet-400">
        <SlidersHorizontal className="w-5 h-5" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-foreground text-sm">Parâmetros e Variáveis da Consulta</h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-400">
            {count} {count === 1 ? 'parâmetro' : 'parâmetros'}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Suporta binds (<span className="text-violet-400 font-mono">:VAR</span>), variáveis SQL*Plus/WinThor (
          <span className="text-amber-500 font-mono">&VAR</span>), scripts (<span className="text-sky-400 font-mono">@VAR</span>) e templates (<span className="text-pink-400 font-mono">{'${VAR}'}</span>).
        </p>
      </div>
    </div>
    <button
      type="button"
      onClick={onClose}
      className="text-muted-foreground hover:text-foreground p-1 rounded transition cursor-pointer"
    >
      <X className="w-4 h-4" />
    </button>
  </div>
);
