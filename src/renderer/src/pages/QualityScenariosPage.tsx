import React from 'react';
import { ListChecks } from 'lucide-react';

export const QualityScenariosPage: React.FC<{ isActive: boolean }> = () => (
  <div className="h-full overflow-y-auto p-5 space-y-4">
    <div>
      <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2">
        <ListChecks className="w-5 h-5 text-primary" /> Validação de Cenários &amp; Segurança
      </h1>
      <p className="text-xs text-muted-foreground">Cenários comportamentais do WinThor em homologação (ex.: bloqueio de autenticação).</p>
    </div>
    <div className="bg-card border border-border rounded-xl p-4 text-xs text-muted-foreground">
      Cenário ativo: <strong className="text-foreground">Bloqueio de Login WTA (5 tentativas inválidas + janela de desbloqueio)</strong>.
    </div>
  </div>
);
