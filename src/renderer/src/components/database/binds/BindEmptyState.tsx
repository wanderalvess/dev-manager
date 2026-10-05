import React from 'react';
import { HelpCircle } from 'lucide-react';

export const BindEmptyState: React.FC = () => (
  <div className="p-8 text-center bg-muted/20 border border-dashed border-border rounded-xl text-muted-foreground text-xs space-y-2">
    <HelpCircle className="w-8 h-8 mx-auto opacity-30 text-violet-400" />
    <p className="font-semibold text-foreground">Nenhuma variável detectada no SQL.</p>
    <p className="text-[11px] max-w-sm mx-auto">
      Você pode usar sintaxes como <span className="font-mono text-violet-400">:CODCLI</span>,{' '}
      <span className="font-mono text-amber-500">&CODCLI</span> ou clicar em "Adicionar Variável Manual" acima.
    </p>
  </div>
);
