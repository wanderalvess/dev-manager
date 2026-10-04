import React from 'react';
import { AlertCircle } from 'lucide-react';

interface GitOutputConsoleProps {
  output: string;
  isError: boolean;
}

export const GitOutputConsole: React.FC<GitOutputConsoleProps> = ({ output, isError }) => (
  <div
    className={`rounded-xl p-3 font-mono text-xs whitespace-pre-wrap border ${
      isError
        ? 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
        : 'bg-card border-border text-foreground'
    }`}
  >
    <div
      className={`flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider mb-1 ${
        isError ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'
      }`}
    >
      {isError && <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
      <span>{isError ? 'Erro no Git:' : 'Terminal Git:'}</span>
    </div>
    {output}
  </div>
);
