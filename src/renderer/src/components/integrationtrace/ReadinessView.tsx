import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useIntegrationReadiness } from '../../hooks/integration/useIntegrationReadiness';
import { ReadinessEmptyState } from './ReadinessEmptyState';
import { ReadinessLayerCard } from './ReadinessLayerCard';
import { ReadinessVerdictBar } from './ReadinessVerdictBar';

interface ReadinessViewProps {
  onOpenSettings: () => void;
}

/** Aba "Pré-voo": confere WinThor, WSH, CH e PDV conforme o cadastro das Configurações. */
export const ReadinessView: React.FC<ReadinessViewProps> = ({ onOpenSettings }) => {
  const { result, running, error, run } = useIntegrationReadiness();

  return (
    <div className="space-y-4">
      <ReadinessVerdictBar result={result} running={running} onRun={() => void run()} />

      {error && (
        <div role="alert" className="px-4 py-2.5 rounded-xl border bg-danger/10 border-danger/30 text-danger text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4" data-testid="readiness-layers">
          {result.layers.map((layer) => (
            <ReadinessLayerCard key={layer.layer} readiness={layer} />
          ))}
        </div>
      ) : (
        <ReadinessEmptyState onOpenSettings={onOpenSettings} />
      )}
    </div>
  );
};
