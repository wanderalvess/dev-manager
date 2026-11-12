import React from 'react';
import { Zap } from 'lucide-react';

export const QualityTautPage: React.FC<{ isActive: boolean; onNavigate: (tab: string) => void; settingsVersion: number }> = () => (
  <div className="h-full overflow-y-auto p-5 space-y-4">
    <div>
      <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2">
        <Zap className="w-5 h-5 text-primary" /> TAUT (Automação E2E Cypress)
      </h1>
      <p className="text-xs text-muted-foreground">Execução E2E, cobertura de fluxos WinThor e importação via CSV.</p>
    </div>
    <div className="bg-card border border-border rounded-xl p-4 text-xs text-muted-foreground">
      Specs prontos: <span className="font-mono text-foreground">login.cy.ts</span>, <span className="font-mono text-foreground">pedido-venda.cy.ts</span>, <span className="font-mono text-foreground">nfce-pdv.cy.ts</span>.
    </div>
  </div>
);
