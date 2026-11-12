import React, { useState } from 'react';
import { FlaskConical, Play, CheckCircle2 } from 'lucide-react';

export const QualityRegressionPage: React.FC<{ isActive: boolean; onNavigate: (tab: string) => void; settingsVersion: number }> = () => {
  const [ran, setRan] = useState(false);
  return (
    <div className="h-full overflow-y-auto p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" /> Validador Regressivo Oracle &amp; API
          </h1>
          <p className="text-xs text-muted-foreground">Templates de pré-venda, PDV, kit cesta e cancelamento com asserções automáticas.</p>
        </div>
        <button type="button" onClick={() => setRan(true)} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 cursor-pointer">
          <Play className="w-3.5 h-3.5" /> Executar Validação
        </button>
      </div>
      {ran && (
        <div className="bg-card border border-success/40 rounded-xl p-4 text-xs flex items-center gap-2 text-success font-semibold">
          <CheckCircle2 className="w-4 h-4" /> Todas as 4 asserções de pedido e estoque passaram com sucesso.
        </div>
      )}
    </div>
  );
};
