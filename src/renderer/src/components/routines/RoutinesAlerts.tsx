import React from 'react';
import { AlertTriangle, Play, RefreshCw, Settings, Terminal } from 'lucide-react';
import { KarafWtaStatusResult } from '../../../../shared/types';
import { DEFAULT_WTA_URL } from '../../utils/routinesPageUtils';

interface KarafWarningBannerProps {
  karafStatus: KarafWtaStatusResult | null;
  isStartingKaraf: boolean;
  isCheckingKaraf: boolean;
  onNavigateToEnv?: () => void;
  onStartKaraf: () => void;
  onCheckKaraf: () => void;
}

// Alerta preventivo: Apache Karaf não está em execução
export const KarafWarningBanner: React.FC<KarafWarningBannerProps> = ({
  karafStatus,
  isStartingKaraf,
  isCheckingKaraf,
  onNavigateToEnv,
  onStartKaraf,
  onCheckKaraf
}) => (
  <div className="shrink-0 bg-amber-500/10 border border-amber-500/40 rounded-xl p-3 flex items-start justify-between space-x-2.5 text-xs text-amber-700 dark:text-amber-200">
    <div className="flex items-start space-x-2.5 flex-1">
      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
      <div className="flex-1">
        <span className="font-bold block">Apache Karaf não está em execução (WTA offline)</span>
        <span className="text-[11px] text-muted-foreground block mt-0.5 leading-relaxed">
          O WinThor Start está ativado e depende do servidor Apache Karaf / WTA ({karafStatus?.wtaUrl || DEFAULT_WTA_URL}) em execução para autenticar a sessão do usuário. Se você iniciar uma rotina agora, ela apresentará erro por falta de autenticação.
        </span>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {onNavigateToEnv && (
            <button
              type="button"
              onClick={onNavigateToEnv}
              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-[11px] font-bold text-amber-700 dark:text-amber-200 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Abrir o Gestor de Ambiente para iniciar o Karaf e ver logs"
            >
              <Terminal className="w-3 h-3" />
              <span>Ir para Ambiente Dev (Alt+1)</span>
            </button>
          )}
          <button
            type="button"
            onClick={onStartKaraf}
            disabled={isStartingKaraf}
            className="px-2.5 py-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            title="Disparar inicialização do Apache Karaf embedded em segundo plano"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>{isStartingKaraf ? 'Iniciando Karaf...' : 'Iniciar Karaf'}</span>
          </button>
          <button
            type="button"
            onClick={onCheckKaraf}
            disabled={isCheckingKaraf}
            className="px-2.5 py-1 bg-card hover:bg-muted border border-border rounded-lg text-[11px] font-semibold text-foreground flex items-center gap-1 transition-all cursor-pointer"
            title="Verificar novamente se a porta 8889 do Karaf já está respondendo"
          >
            <RefreshCw className={`w-3 h-3 ${isCheckingKaraf ? 'animate-spin' : ''}`} />
            <span>Verificar Status</span>
          </button>
        </div>
      </div>
    </div>
  </div>
);

interface AppPathWarningProps {
  onNavigateToSettings?: () => void;
}

// Alerta de diretório não configurado
export const AppPathWarning: React.FC<AppPathWarningProps> = ({ onNavigateToSettings }) => (
  <div className="shrink-0 bg-amber-500/10 border border-amber-500/40 rounded-xl p-3 flex items-start space-x-2.5 text-xs text-amber-700 dark:text-amber-200">
    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
    <div className="flex-1">
      <span className="font-bold block">Diretório de Rotinas WinThor não configurado</span>
      <span className="text-[11px] text-muted-foreground block mt-0.5">
        Defina a pasta onde os executáveis das rotinas estão localizados (ex: P:\ ou C:\Totvs\Winthor\Rotinas) para catalogá-los automaticamente.
      </span>
      {onNavigateToSettings && (
        <button
          type="button"
          onClick={onNavigateToSettings}
          className="mt-2 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-[11px] font-bold text-amber-700 dark:text-amber-200 flex items-center gap-1 transition-all cursor-pointer"
        >
          <Settings className="w-3 h-3" />
          <span>Configurar Diretório</span>
        </button>
      )}
    </div>
  </div>
);
