import React from 'react';
import { FileCode, Play } from 'lucide-react';

interface BindModalFooterProps {
  hasBinds: boolean;
  onClose: () => void;
  onSubstituteInline: () => void;
}

export const BindModalFooter: React.FC<BindModalFooterProps> = ({
  hasBinds,
  onClose,
  onSubstituteInline
}) => (
  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/60">
    <button
      type="button"
      onClick={onSubstituteInline}
      disabled={!hasBinds}
      className="px-3 py-1.5 rounded-lg border border-border/80 bg-muted/50 hover:bg-muted text-xs font-semibold text-foreground transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
      title="Substitui as variáveis diretamente no editor SQL pelos valores informados"
    >
      <FileCode className="w-3.5 h-3.5 text-amber-500" />
      <span>Substituir no SQL (Inline)</span>
    </button>

    <div className="flex items-center space-x-2 ml-auto">
      <button
        type="button"
        onClick={onClose}
        className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground text-xs transition cursor-pointer"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={!hasBinds}
        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
      >
        <Play className="w-3.5 h-3.5 fill-current" />
        <span>Executar Consulta</span>
      </button>
    </div>
  </div>
);
