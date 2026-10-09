import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { BundleDependencyCheckResult } from '../../../../../shared/types';

interface KarafInstallDepReportProps {
  check: BundleDependencyCheckResult;
}

export const KarafInstallDepReport: React.FC<KarafInstallDepReportProps> = ({ check }) => (
  <div className="p-3 bg-muted/40 border border-border rounded-xl space-y-2 text-xs">
    <div className="font-bold flex items-center gap-2">
      {check.alreadyInstalled ? (
        <AlertTriangle className="w-4 h-4 text-amber-500" />
      ) : (
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      )}
      <span className="text-foreground">
        {check.alreadyInstalled ? 'Substituição de Versão Detectada' : 'Novo Bundle no Container'}
      </span>
    </div>
    <p className="text-2xs text-muted-foreground">{check.warningMessage}</p>

    {check.dependentBundles.length > 0 && (
      <div className="mt-2 bg-background/50 border border-border rounded-lg p-2 max-h-28 overflow-y-auto space-y-1">
        <span className="text-2xs font-bold text-muted-foreground uppercase block">
          Bundles clientes afetados na reconexão:
        </span>
        {check.dependentBundles.map((dep) => (
          <div key={dep.id} className="text-2xs font-mono text-foreground">
            [{dep.id}] {dep.name} {dep.version ? `(${dep.version})` : ''}
          </div>
        ))}
      </div>
    )}
  </div>
);
