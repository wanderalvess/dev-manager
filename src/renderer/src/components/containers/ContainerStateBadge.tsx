import React from 'react';

export const getStateBadge = (state: string): React.ReactNode => {
  switch (state) {
    case 'running':
      return (
        <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-2xs font-bold bg-success/10 text-success">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span>RODANDO</span>
        </span>
      );
    case 'exited':
      return (
        <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-2xs font-bold bg-muted text-muted-foreground border border-border/80">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
          <span>PARADO</span>
        </span>
      );
    case 'paused':
      return (
        <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-2xs font-bold bg-warning/10 text-warning">
          <span>PAUSADO</span>
        </span>
      );
    default:
      return (
        <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-2xs font-bold bg-muted text-muted-foreground border border-border/80">
          <span>{state.toUpperCase()}</span>
        </span>
      );
  }
};
