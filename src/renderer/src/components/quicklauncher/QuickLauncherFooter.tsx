import React from 'react';
import { Zap } from 'lucide-react';

/** Rodapé com dicas de navegação e contagem de resultados. */
export const QuickLauncherFooter: React.FC<{ resultCount: number }> = ({ resultCount }) => (
  <div className="px-4 py-2 bg-muted/40 border-t border-border/80 text-2xs text-muted-foreground flex items-center justify-between">
    <div className="flex items-center space-x-3">
      <span>
        <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/60 font-mono text-2xs">
          ↑↓
        </kbd>{' '}
        Navegar
      </span>
      <span>
        <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/60 font-mono text-2xs">
          ↵
        </kbd>{' '}
        Executar
      </span>
    </div>
    <div className="flex items-center space-x-1 font-mono text-2xs">
      <Zap className="w-3 h-3 text-amber-500" />
      <span>{resultCount} resultados</span>
    </div>
  </div>
);
