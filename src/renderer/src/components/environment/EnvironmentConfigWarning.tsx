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
    <div className="shrink-0 bg-amber-500/10 border border-amber-500/40 rounded-xl p-3 flex items-start space-x-2.5 text-xs text-amber-700 dark:text-amber-200">
      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
      <div className="flex-1">
        <span className="font-bold block">Configuração incompleta</span>
        <span className="text-[11px] text-muted-foreground block mt-0.5">
          Não encontramos automaticamente: {missingPaths.join(', ')}. Alguns recursos do Cockpit (subir serviços, abrir a IDE, deploy) não vão funcionar até esses caminhos serem definidos.
        </span>
        {onNavigateToSettings && (
          <button
            type="button"
            onClick={onNavigateToSettings}
            className="mt-2 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-[11px] font-bold text-amber-700 dark:text-amber-200 flex items-center gap-1 transition-all"
          >
            <Settings className="w-3 h-3" />
            <span>Configurar Agora</span>
          </button>
        )}
      </div>
    </div>
  );
};
