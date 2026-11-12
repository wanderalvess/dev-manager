import React from 'react';
import { Camera } from 'lucide-react';

export const EvidencePage: React.FC<{ isActive: boolean }> = () => (
  <div className="h-full overflow-y-auto p-5 space-y-4">
    <div>
      <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2">
        <Camera className="w-5 h-5 text-primary" /> Central de Evidências
      </h1>
      <p className="text-xs text-muted-foreground">Captura de passos de teste, anotações visuais e exportação em relatório.</p>
    </div>
    <div className="bg-card border border-border rounded-xl p-4 text-xs text-muted-foreground">
      Pronto para registrar novas evidências de homologação ou bugfix.
    </div>
  </div>
);
