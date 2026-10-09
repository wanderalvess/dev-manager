import React from 'react';
import { AlertTriangle, Play, Settings, Terminal, X } from 'lucide-react';
import { LaunchFeedback, getLaunchFeedbackTitle } from '../../utils/routinesPageUtils';

interface LaunchFeedbackBannerProps {
  feedback: LaunchFeedback;
  isStartingKaraf: boolean;
  onNavigateToEnv?: () => void;
  onNavigateToSettings?: () => void;
  onStartKaraf: () => void;
  onLaunchDirect: () => void;
  onClose: () => void;
}

// Banner de feedback de execução de rotina
export const LaunchFeedbackBanner: React.FC<LaunchFeedbackBannerProps> = ({
  feedback,
  isStartingKaraf,
  onNavigateToEnv,
  onNavigateToSettings,
  onStartKaraf,
  onLaunchDirect,
  onClose
}) => (
  <div className={`shrink-0 rounded-xl p-3 flex items-start justify-between space-x-2.5 text-xs border ${
    feedback.karafOffline
      ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-200'
      : 'bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-200'
  }`}>
    <div className="flex items-start space-x-2.5 flex-1">
      <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${feedback.karafOffline ? 'text-amber-500' : 'text-rose-500'}`} />
      <div className="flex-1">
        <span className="font-bold block">{getLaunchFeedbackTitle(feedback)}</span>
        <span className="text-2xs text-muted-foreground block mt-0.5 leading-relaxed">
          {feedback.message}
        </span>

        {/* Ações contextuais de ajuda */}
        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
          {feedback.karafOffline && (
            <>
              {onNavigateToEnv && (
                <button
                  type="button"
                  onClick={onNavigateToEnv}
                  className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-2xs font-bold text-amber-700 dark:text-amber-200 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Terminal className="w-3 h-3" />
                  <span>Ir para Ambiente Dev &amp; Iniciar Karaf (Alt+1)</span>
                </button>
              )}
              <button
                type="button"
                onClick={onStartKaraf}
                disabled={isStartingKaraf}
                className="px-2.5 py-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-2xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>{isStartingKaraf ? 'Iniciando Karaf...' : 'Iniciar Karaf Agora'}</span>
              </button>
              <button
                type="button"
                onClick={onLaunchDirect}
                className="px-2.5 py-1 bg-card hover:bg-muted border border-border rounded-lg text-2xs font-semibold text-foreground flex items-center gap-1 transition-all cursor-pointer"
                title="Abre o executável diretamente pelo Windows sem passar pelos parâmetros autenticados do WinThor Start"
              >
                <span>Tentar abrir direto (sem autenticação)</span>
              </button>
            </>
          )}
          {feedback.authFailed && onNavigateToSettings && (
            <button
              type="button"
              onClick={onNavigateToSettings}
              className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 rounded-lg text-2xs font-bold text-rose-700 dark:text-rose-200 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Settings className="w-3 h-3" />
              <span>Configurar Credenciais do WTA</span>
            </button>
          )}
          {!feedback.karafOffline && (
            <button
              type="button"
              onClick={onLaunchDirect}
              className="px-2.5 py-1 bg-card hover:bg-muted border border-border rounded-lg text-2xs font-semibold text-foreground flex items-center gap-1 transition-all cursor-pointer"
              title="Abre o executável diretamente pelo Windows sem passar pelos parâmetros autenticados do WinThor Start"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Tentar abrir direto (sem autenticação)</span>
            </button>
          )}
        </div>
      </div>
    </div>
    <button
      type="button"
      onClick={onClose}
      className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
      title="Fechar aviso" aria-label="Fechar aviso"
    >
      <X className="w-3.5 h-3.5" />
    </button>
  </div>
);
