import React from 'react';

export const QuickLauncherFooter: React.FC<{ resultCount: number }> = ({ resultCount }) => (
  <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center justify-between text-2xs text-muted-foreground">
    <span>{resultCount} itens disponíveis</span>
    <span className="font-mono">↑↓ navegar • Enter abrir</span>
  </div>
);
