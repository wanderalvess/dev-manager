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
        ? 'bg-danger/10 border-danger/30 text-danger'
        : 'bg-card border-border text-foreground'
    }`}
  >
    <div
      className={`flex items-center space-x-1.5 text-2xs font-bold uppercase tracking-wider mb-1 ${
        isError ? 'text-danger' : 'text-muted-foreground'
      }`}
    >
      {isError && <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
      <span>{isError ? 'Erro no Git:' : 'Terminal Git:'}</span>
    </div>
    {output}
  </div>
);
