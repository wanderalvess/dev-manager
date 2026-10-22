import React from 'react';
import { Download, RefreshCw, ExternalLink, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { SystemAppInfo, UpdateStatus } from '../../../../../shared/types';

interface HelpAboutUpdateCardProps {
  appInfo: SystemAppInfo | null;
  updateStatus: UpdateStatus | null;
  handleCheckForUpdates: () => void;
}

const GITHUB_LATEST_RELEASE_URL = 'https://github.com/wanderalvess/dev-manager/releases/latest';

/** Versão do app + ações de atualização resilientes (suporta download automático e fallback manual via GitHub Releases). */
export const HelpAboutUpdateCard: React.FC<HelpAboutUpdateCardProps> = ({
  appInfo,
  updateStatus,
  handleCheckForUpdates
}) => {
  const handleOpenReleasePage = () => {
    if (window.electronAPI?.openExternal) {
      void window.electronAPI.openExternal(GITHUB_LATEST_RELEASE_URL);
    } else {
      window.open(GITHUB_LATEST_RELEASE_URL, '_blank');
    }
  };

  const isError = updateStatus?.status === 'error';
  const isDownloading = updateStatus?.status === 'downloading';
  const isChecking = updateStatus?.status === 'checking';
  const isAvailable = updateStatus?.status === 'available';
  const isDownloaded = updateStatus?.status === 'downloaded';

  return (
    <div className="p-3 rounded-xl bg-card/60 border border-border space-y-2 shadow-2xs">
      <div className="flex items-center justify-between">
        <span className="text-2xs text-muted-foreground uppercase font-bold tracking-wider block">
          Versão do Aplicativo:
        </span>
        <button
          type="button"
          onClick={handleOpenReleasePage}
          className="text-3xs text-muted-foreground hover:text-primary transition flex items-center gap-0.5 cursor-pointer"
          title="Ver página de lançamentos e instaladores oficiais no GitHub Releases"
        >
          <ExternalLink className="w-2.5 h-2.5" />
          <span>Releases</span>
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-foreground text-2xs truncate">
          v{appInfo?.appVersion || '...'}
          {isAvailable && (
            <span className="ml-1.5 text-success font-bold">→ v{updateStatus.version}</span>
          )}
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          {isDownloaded ? (
            <button
              type="button"
              onClick={() => window.electronAPI?.installUpdate?.()}
              className="flex items-center gap-1 px-2.5 py-1 bg-success hover:bg-success/90 text-background rounded-lg text-2xs font-bold transition cursor-pointer shadow-xs"
            >
              <Download className="w-3 h-3" /> Instalar e Reiniciar
            </button>
          ) : isAvailable ? (
            <button
              type="button"
              onClick={() => window.electronAPI?.downloadUpdate?.()}
              className="flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-2xs font-bold transition cursor-pointer shadow-xs"
            >
              <Download className="w-3 h-3" /> {updateStatus.manual ? 'Baixar instalador' : 'Baixar e Instalar'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCheckForUpdates}
              disabled={isChecking || isDownloading}
              className="flex items-center gap-1 px-2.5 py-1 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-2xs font-bold transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
              {isError ? 'Tentar novamente' : 'Verificar'}
            </button>
          )}

          {/* Botão de contingência para download manual se houver versão nova ou erro */}
          {(isAvailable || isError) && (
            <button
              type="button"
              onClick={handleOpenReleasePage}
              className="flex items-center gap-1 px-2 py-1 bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg text-2xs font-medium transition cursor-pointer"
              title="Abrir página oficial do release no navegador para baixar o executável manualmente"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Manual</span>
            </button>
          )}
        </div>
      </div>

      {isDownloading && (
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-3xs text-muted-foreground font-mono">
            <span>Baixando atualização...</span>
            <span className="font-bold text-foreground">{Math.round(updateStatus.percent)}%</span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-200"
              style={{ width: `${Math.round(updateStatus.percent)}%` }}
            />
          </div>
        </div>
      )}

      {isAvailable && updateStatus.manual && (
        <p className="text-2xs text-muted-foreground">
          Versão portátil: o instalador será aberto no navegador. Feche o cockpit e use o arquivo novo.
        </p>
      )}

      {isDownloaded && (
        <div className="flex items-center gap-1 text-2xs text-success font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>Atualização pronta! Clique em &quot;Instalar e Reiniciar&quot; para concluir.</span>
        </div>
      )}

      {updateStatus?.status === 'not-available' && (
        <p className="text-2xs text-muted-foreground">Você já está na versão mais recente.</p>
      )}

      {isError && (
        <div className="p-2.5 rounded-lg bg-danger/10 border border-danger/20 text-danger text-2xs space-y-1.5">
          <div className="flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-danger shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="font-bold block">Falha no processo de atualização:</span>
              <p className="text-3xs text-danger/90 break-words mt-0.5 leading-relaxed" title={updateStatus.message}>
                {updateStatus.message}
              </p>
            </div>
          </div>
          <p className="text-3xs text-muted-foreground pt-1 border-t border-danger/10">
            Dica: você pode clicar em <strong>Manual</strong> acima para baixar o instalador diretamente pelo GitHub.
          </p>
        </div>
      )}
    </div>
  );
};
