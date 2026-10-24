import React from 'react';
import { AlertTriangle, Settings } from 'lucide-react';

interface EnvironmentConfigWarningProps {
  missingPaths: string[];
  onNavigateToSettings?: () => void;
}

/** Aviso de configuração incompleta: orienta o primeiro uso para as Configurações. */
export const EnvironmentConfigWarning: React.FC<EnvironmentConfigWarningProps> = ({
  missingPaths,
  onNavigateToSettings
}) => {
  if (missingPaths.length === 0) return null;

  return (
    <div className="shrink-0 bg-warning/10 rounded-xl p-3.5 flex items-start space-x-3 text-sm text-foreground">
      <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
      <div className="flex-1">
        <span className="font-semibold block">Configuração incompleta</span>
        <span className="text-[13px] text-muted-foreground block mt-0.5">
          Não encontramos automaticamente: {missingPaths.join(', ')}. Alguns recursos do Cockpit (subir serviços, abrir a IDE, deploy) não vão funcionar até esses caminhos serem definidos.
        </span>
        {onNavigateToSettings && (
          <button
            type="button"
            onClick={onNavigateToSettings}
            className="mt-2 h-8 px-3 bg-card hover:bg-muted border border-border rounded-lg text-[13px] font-medium text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Configurar agora</span>
          </button>
        )}
      </div>
    </div>
  );
};
