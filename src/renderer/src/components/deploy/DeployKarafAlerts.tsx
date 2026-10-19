import React from 'react';
import { AlertTriangle, Play, Settings } from 'lucide-react';

interface DeployKarafAlertsProps {
  karafValid: boolean | null;
  karafPath: string;
  showOfflineAlert: boolean;
  isStartingKaraf: boolean;
  onNavigateToSettings?: () => void;
  onStartKaraf: () => void;
}

export const DeployKarafAlerts: React.FC<DeployKarafAlertsProps> = ({
  karafValid,
  karafPath,
  showOfflineAlert,
  isStartingKaraf,
  onNavigateToSettings,
  onStartKaraf
}) => (
  <>
    {karafValid === false && (
      <div className="bg-danger/10 border border-danger/40 rounded-lg p-3 flex items-start space-x-2.5 text-xs text-danger">
        <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="font-bold block">Executável client.bat não localizado</span>
          <span className="text-2xs text-muted-foreground block mt-0.5">
            Não foi possível encontrar <code className="font-mono text-foreground">{karafPath}\bin\client.bat</code>. Isso só afeta etapas do tipo Karaf.
          </span>
          {onNavigateToSettings && (
            <button
              type="button"
              onClick={onNavigateToSettings}
              className="mt-2 px-2.5 py-1 bg-danger/20 hover:bg-danger/30 border border-danger/40 rounded-md text-2xs font-semibold text-danger flex items-center gap-1 transition-all"
            >
              <Settings className="w-3 h-3" />
              <span>Ajustar Diretório nas Configurações</span>
            </button>
          )}
        </div>
      </div>
    )}

    {showOfflineAlert && (
      <div className="bg-warning/10 border border-warning/40 rounded-lg p-3 flex items-start space-x-2.5 text-xs text-warning">
        <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="font-bold block">Karaf / OSGi offline</span>
          <span className="text-2xs text-muted-foreground block mt-0.5">
            O contêiner Karaf não está rodando (porta SSH inacessível). As etapas OSGi deste perfil falharão se ele não for iniciado.
          </span>
          <button
            type="button"
            onClick={onStartKaraf}
            disabled={isStartingKaraf}
            className="mt-2 px-2.5 py-1 bg-warning/20 hover:bg-warning/30 border border-warning/40 rounded-md text-2xs font-semibold text-warning flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <Play className={`w-3 h-3 ${isStartingKaraf ? 'animate-spin' : ''}`} />
            <span>{isStartingKaraf ? 'Iniciando Karaf...' : 'Iniciar Karaf Embutido'}</span>
          </button>
        </div>
      </div>
    )}
  </>
);
