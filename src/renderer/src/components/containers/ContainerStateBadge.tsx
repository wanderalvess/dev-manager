import React from 'react';

export const getStateBadge = (state: string): React.ReactNode => {
  switch (state) {
    case 'running':
      return (
        <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
          <span>RODANDO</span>
        </span>
      );
    case 'exited':
      return (
        <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border/80">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
          <span>PARADO</span>
        </span>
      );
    case 'paused':
      return (
        <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
          <span>PAUSADO</span>
        </span>
      );
    default:
      return (
        <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border/80">
          <span>{state.toUpperCase()}</span>
        </span>
      );
  }
};
