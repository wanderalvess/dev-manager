import React from 'react';

interface DatabaseMaximizedBarProps {
  onRestore: () => void;
}

export const DatabaseMaximizedBar: React.FC<DatabaseMaximizedBarProps> = ({ onRestore }) => (
  <div className="p-2.5 bg-card/60 border-t border-border/70 flex items-center justify-between text-xs text-muted-foreground shrink-0 animate-fade-in font-sans">
    <div className="flex items-center space-x-2">
      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
      <span className="font-semibold text-foreground">Modo Maximizado / Foco Ativo</span>
      <span className="text-[11px] text-muted-foreground">
        (O editor SQL está ocupando toda a tela para você visualizar queries grandes)
      </span>
    </div>
    <button
      type="button"
      onClick={onRestore}
      className="px-3 py-1 bg-card hover:bg-muted border border-border rounded-lg text-primary hover:text-primary-foreground hover:bg-primary font-bold transition cursor-pointer text-xs shadow-xs"
    >
      Restaurar Painel de Resultados
    </button>
  </div>
);
