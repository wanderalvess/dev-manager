import React from 'react';
import { PlayCircle } from 'lucide-react';

export const QualityRunnersPage: React.FC<{ isActive: boolean; onNavigate: (tab: string) => void; settingsVersion: number }> = () => (
  <div className="h-full overflow-y-auto p-5 space-y-4">
    <div>
      <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2">
        <PlayCircle className="w-5 h-5 text-primary" /> Test Runners Automatizados
      </h1>
      <p className="text-xs text-muted-foreground">Execução de suítes Maven/JUnit e Vitest com publicação na matriz de homologação.</p>
    </div>
    <div className="bg-card border border-border rounded-xl p-4 text-xs text-muted-foreground">
      Suítes configuradas: <span className="font-mono text-foreground">wta-core-unit</span>, <span className="font-mono text-foreground">wta-fiscal-integration</span>.
    </div>
  </div>
);
