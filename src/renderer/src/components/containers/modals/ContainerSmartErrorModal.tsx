import React from 'react';
import {
  Download,
  Power,
  AlertCircle,
  Copy,
  Check,
  Terminal,
  RotateCw
} from 'lucide-react';
import { useCopyToClipboard } from '../../../hooks/useCopyToClipboard';

export interface SmartErrorInfo {
  title: string;
  message: string;
  distroName?: string;
  containerName?: string;
  isDaemonOffline?: boolean;
  isNotInstalled?: boolean;
  retryAction?: () => Promise<void>;
}

export interface ContainerSmartErrorModalProps {
  smartError: SmartErrorInfo | null;
  selectedDistro?: string;
  onClose: () => void;
  onStartDaemon: (distroName?: string) => Promise<void> | void;
  onOpenWslTerminal: (distroName?: string) => Promise<void> | void;
  isStartingDaemon: boolean;
}

export const ContainerSmartErrorModal: React.FC<ContainerSmartErrorModalProps> = ({
  smartError,
  selectedDistro,
  onClose,
  onStartDaemon,
  onOpenWslTerminal,
  isStartingDaemon
}) => {
  const { copy: copyInstallCmd, copiedKey: installCmdFeedback } = useCopyToClipboard();

  if (!smartError) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-5 animate-fade-in space-y-4">
        <div className="flex items-start space-x-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              smartError.isNotInstalled
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                : smartError.isDaemonOffline
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
            }`}
          >
            {smartError.isNotInstalled ? (
              <Download className="w-5 h-5" />
            ) : smartError.isDaemonOffline ? (
              <Power className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span>{smartError.title}</span>
              {smartError.distroName && (
                <span className="text-2xs font-mono px-1.5 py-0.2 rounded bg-muted border border-border text-muted-foreground font-normal">
                  WSL: {smartError.distroName}
                </span>
              )}
            </h3>
            {smartError.isNotInstalled ? (
              <div className="space-y-1.5 mt-1.5">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  O binário do Docker Engine (<code className="text-foreground font-mono">dockerd</code>) não está instalado na distro <strong className="text-foreground">{smartError.distroName || selectedDistro}</strong>.
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Para utilizá-la com containers, instale o pacote oficial via terminal WSL:
                </p>
                <div className="flex items-center justify-between p-2 bg-[#090D14] rounded-lg border border-border/70 font-mono text-[11px] text-amber-400">
                  <span className="select-all">sudo apt update && sudo apt install -y docker.io</span>
                  <button
                    type="button"
                    onClick={() => copyInstallCmd('sudo apt update && sudo apt install -y docker.io', 'install-box')}
                    className="ml-2 px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded border border-amber-500/30 text-2xs font-sans font-semibold flex items-center gap-1 cursor-pointer transition"
                  >
                    {installCmdFeedback === 'install-box' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : smartError.isDaemonOffline ? (
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                O Docker Engine não está rodando na distro <strong className="text-foreground">{smartError.distroName || selectedDistro}</strong>.
                Você pode iniciá-lo automaticamente agora com 1 clique.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Ocorreu uma falha durante a execução do comando no container engine.
              </p>
            )}
          </div>
        </div>

        {/* Detalhes Técnicos do Erro */}
        <div className="space-y-1.5">
          <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Detalhes técnicos:</span>
          <pre className="max-h-36 overflow-auto bg-[#090D14] p-3 text-[11px] font-mono text-rose-400/90 rounded-xl border border-border/50 whitespace-pre-wrap select-text leading-relaxed [scrollbar-width:thin]">
            {smartError.message}
          </pre>
        </div>

        {/* Ações de Recuperação */}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border">
          {smartError.isNotInstalled ? (
            <>
              <button
                type="button"
                onClick={() => copyInstallCmd('sudo apt update && sudo apt install -y docker.io', 'install-btn')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition cursor-pointer"
              >
                {installCmdFeedback === 'install-btn' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Comando Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Copiar Comando</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => onOpenWslTerminal(smartError.distroName)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Abrir Terminal WSL</span>
              </button>
            </>
          ) : smartError.isDaemonOffline ? (
            <>
              <button
                type="button"
                onClick={() => onOpenWslTerminal(smartError.distroName)}
                className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition cursor-pointer"
              >
                Abrir Terminal WSL
              </button>
              <button
                type="button"
                onClick={() => onStartDaemon(smartError.distroName)}
                disabled={isStartingDaemon}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isStartingDaemon ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Power className="w-3.5 h-3.5" />
                )}
                <span>{isStartingDaemon ? 'Iniciando Docker no WSL...' : 'Iniciar Docker no WSL'}</span>
              </button>
            </>
          ) : null}

          {smartError.retryAction && !smartError.isDaemonOffline && !smartError.isNotInstalled && (
            <button
              type="button"
              onClick={async () => {
                const retry = smartError.retryAction;
                onClose();
                if (retry) await retry();
              }}
              className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Tentar Novamente
            </button>
          )}

          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
