import React from 'react';
import { AlertTriangle, CheckCircle2, RotateCw } from 'lucide-react';
import type { BundleDependencyCheckResult } from '../../../../../shared/types';

interface KarafUninstallRiskPanelProps {
  isChecking: boolean;
  check: BundleDependencyCheckResult | null;
  confirmChecked: boolean;
  onConfirmCheckedChange: (value: boolean) => void;
}

export const KarafUninstallRiskPanel: React.FC<KarafUninstallRiskPanelProps> = ({
  isChecking,
  check,
  confirmChecked,
  onConfirmCheckedChange
}) => {
  if (isChecking) {
    return (
      <div className="p-4 bg-muted/20 border border-border rounded-xl flex items-center justify-center space-x-2 text-xs text-muted-foreground">
        <RotateCw className="w-4 h-4 animate-spin text-primary" />
        <span>Inspecionando fiação de dependências OSGi via Karaf...</span>
      </div>
    );
  }
  if (!check) return null;

  return (
    <div className="space-y-3">
      {/* Nível de Risco */}
      {check.riskLevel === 'HIGH' ? (
        <div className="p-3 bg-rose-500/10 dark:bg-rose-950/40 border border-rose-500/30 dark:border-rose-800/50 rounded-xl text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>RISCO ALTO: Bundles dependentes ativos detectados!</span>
          </div>
          <p className="text-2xs text-rose-700/90 dark:text-rose-300/90 leading-relaxed">
            Existem {check.dependentBundles.length} bundle(s) que dependem diretamente deste módulo.
            Ao desinstalar, esses módulos deixarão de funcionar no Karaf.
          </p>

          {/* Lista de dependentes */}
          <div className="mt-2 bg-card/80 border border-rose-500/30 rounded-lg p-2 max-h-32 overflow-y-auto space-y-1">
            {check.dependentBundles.map((dep) => (
              <div key={dep.id} className="text-2xs font-mono text-foreground flex items-center justify-between">
                <span>
                  [{dep.id}] {dep.name} {dep.version ? `(${dep.version})` : ''}
                </span>
                <span className="text-rose-600 dark:text-rose-400 font-semibold text-2xs">{dep.reason}</span>
              </div>
            ))}
          </div>
        </div>
      ) : check.riskLevel === 'MEDIUM' ? (
        <div className="p-3 bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 dark:border-amber-800/50 rounded-xl text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>ATENÇÃO: Pacotes exportados podem estar em uso</span>
          </div>
          <p className="text-2xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
            Este bundle exporta {check.exportedPackages.length} pacotes OSGi. Nenhum bundle cliente foi
            detectado com fiação direta no momento, mas dependências dinâmicas podem ser afetadas.
          </p>
        </div>
      ) : (
        <div className="p-3 bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 dark:border-emerald-800/50 rounded-xl text-xs flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Risco Baixo: Nenhuma dependência ativa encontrada. Seguro para desinstalar.</span>
        </div>
      )}

      {/* Confirmação explícita de risco se alto */}
      {check.riskLevel === 'HIGH' && (
        <label className="flex items-start gap-2.5 p-3 bg-muted/40 border border-border rounded-xl cursor-pointer text-xs">
          <input
            type="checkbox"
            checked={confirmChecked}
            onChange={(e) => onConfirmCheckedChange(e.target.checked)}
            className="mt-0.5 rounded border-border text-rose-500 focus:ring-rose-500"
          />
          <span className="text-foreground font-medium text-2xs">
            Estou ciente do impacto e confirmo que desejo desinstalar este bundle mesmo com bundles dependentes.
          </span>
        </label>
      )}
    </div>
  );
};
