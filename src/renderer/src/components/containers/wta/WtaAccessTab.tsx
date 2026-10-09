import React from 'react';
import { ExternalLink, Globe, Key, Wrench } from 'lucide-react';
import {
  WTA_DEFAULT_CREDENTIALS_CLIPBOARD,
  wtaUtilsModalPortalUrls
} from '../../../utils/wtaUtilsModalUtils';

interface WtaAccessTabProps {
  port: number;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
}

export const WtaAccessTab: React.FC<WtaAccessTabProps> = ({ port, copiedKey, onCopy }) => {
  const { portalUrl, installerUrl } = wtaUtilsModalPortalUrls(port);

  return (
    <div className="space-y-4">
      {/* Banner Explicativo */}
      <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3 flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5">
          <Globe className="w-4 h-4" />
        </div>
        <div className="text-xs leading-relaxed text-muted-foreground">
          <strong className="text-foreground font-semibold block mb-0.5">
            Acesso Web ao WinThor Anywhere (WTA)
          </strong>
          Após a subida do container, o Apache Karaf inicia os bundles OSGi e publica os portais web na porta configurada (padrão <code className="text-foreground font-mono">8080</code>).
        </div>
      </div>

      {/* Links dos Portais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 bg-card border border-border/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-cyan-500" />
              <span>Portal WTA</span>
            </span>
            <span className="text-2xs font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
              Porta {port}
            </span>
          </div>
          <div className="text-xs font-mono text-cyan-600 dark:text-cyan-400 bg-background p-2 rounded-lg border border-border/60 break-all select-all">
            {portalUrl}
          </div>
          <button
            type="button"
            onClick={() => window.electronAPI?.openExternal?.(portalUrl)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-98"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Abrir Portal no Navegador</span>
          </button>
        </div>

        <div className="p-3 bg-card border border-border/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-amber-500" />
              <span>Instalador WTA</span>
            </span>
            <span className="text-2xs font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
              /instalador
            </span>
          </div>
          <div className="text-xs font-mono text-amber-600 dark:text-amber-400 bg-background p-2 rounded-lg border border-border/60 break-all select-all">
            {installerUrl}
          </div>
          <button
            type="button"
            onClick={() => window.electronAPI?.openExternal?.(installerUrl)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-600/10 hover:bg-amber-600/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-98"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Abrir Instalador no Navegador</span>
          </button>
        </div>
      </div>

      {/* Credenciais Padrão */}
      <div className="p-4 bg-muted/30 border border-border/80 rounded-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-primary" />
            <span>Credenciais Padrão do WTA</span>
          </span>
          <button
            onClick={() => onCopy(WTA_DEFAULT_CREDENTIALS_CLIPBOARD, 'wta-creds')}
            className="text-2xs px-2 py-0.5 rounded bg-card hover:bg-muted text-foreground border border-border/80 font-medium transition cursor-pointer"
          >
            {copiedKey === 'wta-creds' ? 'Copiado!' : 'Copiar Credenciais'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-2.5 bg-background rounded-lg border border-border/60">
            <span className="text-2xs text-muted-foreground uppercase font-bold block">Usuário</span>
            <div className="font-mono text-xs font-bold text-foreground">PCADMIN</div>
          </div>
          <div className="p-2.5 bg-background rounded-lg border border-border/60">
            <span className="text-2xs text-muted-foreground uppercase font-bold block">Senha</span>
            <div className="font-mono text-xs font-bold text-foreground">1</div>
          </div>
        </div>
      </div>
    </div>
  );
};
