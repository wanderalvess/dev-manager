import React from 'react';
import { RotateCw, ShieldCheck } from 'lucide-react';

export interface ConnectionModalFooterProps {
  isTesting: boolean;
  onTestConnection: () => void;
  onClose: () => void;
}

export const ConnectionModalFooter: React.FC<ConnectionModalFooterProps> = ({
  isTesting,
  onTestConnection,
  onClose
}) => {
  return (
    <div className="pt-3 flex items-center justify-between border-t border-border/60">
      <button
        type="button"
        onClick={onTestConnection}
        disabled={isTesting}
        className="px-3.5 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg font-semibold transition disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
      >
        {isTesting ? (
          <RotateCw className="w-3.5 h-3.5 animate-spin text-primary" />
        ) : (
          <ShieldCheck className="w-3.5 h-3.5 text-success" />
        )}
        <span>Testar Conexão</span>
      </button>

      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-1.5 text-muted-foreground hover:text-foreground font-semibold cursor-pointer transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-5 py-1.5 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition shadow-xs cursor-pointer"
        >
          Salvar
        </button>
      </div>
    </div>
  );
};
