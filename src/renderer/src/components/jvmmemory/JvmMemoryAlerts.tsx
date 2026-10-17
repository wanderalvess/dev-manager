import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { KarafJvmMemoryInfo } from '../../../../shared/types';

interface JvmMemoryAlertsProps {
  metrics: KarafJvmMemoryInfo | null;
  isNearOom: boolean;
  alertLevel: KarafJvmMemoryInfo['alertLevel'];
  fetchError: string | null;
  gcFeedback: string | null;
}

export const JvmMemoryAlerts: React.FC<JvmMemoryAlertsProps> = ({
  metrics,
  isNearOom,
  alertLevel,
  fetchError,
  gcFeedback
}) => (
  <>
    {/* Alerta de OutOfMemory / Nível Crítico */}
    {isNearOom && (
      <div className="p-3 bg-danger/10 border border-danger/50 rounded-lg flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5 animate-bounce" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold font-mono uppercase tracking-wide text-danger">
              Alerta Crítico: Risco Iminente de OutOfMemoryError
            </h4>
            <span className="text-xs font-mono font-bold text-danger">
              {metrics?.heapUsagePercent.toFixed(1)}% USADO
            </span>
          </div>
          <p className="text-2xs text-danger/90 mt-1 leading-relaxed">
            O consumo de Heap ultrapassou o limiar de segurança. Dispare a coleta de lixo (GC) ou eleve o parâmetro{' '}
            <code className="bg-danger/60 px-1 py-0.5 rounded font-mono text-2xs text-danger border border-danger/40">
              -Xmx
            </code>{' '}
            nos argumentos de inicialização do Karaf.
          </p>
        </div>
      </div>
    )}

    {alertLevel === 'WARNING' && !isNearOom && (
      <div className="p-2.5 bg-warning/10 border border-warning/30 rounded-lg flex items-center space-x-2.5 text-warning text-xs font-mono">
        <AlertTriangle className="w-4 h-4 shrink-0 text-warning" />
        <span>
          Consumo de Heap elevado ({metrics?.heapUsagePercent.toFixed(1)}%). Verifique se o GC está liberando
          instâncias ou se há acúmulo de sessões OSGi.
        </span>
      </div>
    )}

    {fetchError && (
      <div className="p-2.5 bg-danger/10 border border-danger/30 rounded-lg text-xs text-danger font-mono flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>{fetchError}</span>
      </div>
    )}

    {gcFeedback && (
      <div className="p-2.5 bg-success/10 border border-success/30 rounded-lg text-xs text-success font-mono flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span>{gcFeedback}</span>
      </div>
    )}
  </>
);
