import React from 'react';
import { Copy, Check, ShieldCheck, Laptop } from 'lucide-react';
import { SystemAppInfo } from '../../../../../shared/types';

interface HelpAboutPackagingPanelProps {
  appInfo: SystemAppInfo | null;
  copiedItem: string | null;
  copyToClipboard: (text: string, key?: string) => void;
}

/** Geração e distribuição do executável (.exe) */
export const HelpAboutPackagingPanel: React.FC<HelpAboutPackagingPanelProps> = ({
  appInfo,
  copiedItem,
  copyToClipboard
}) => (
  <div className="cockpit-panel rounded-[14px] p-5 sm:p-6 border border-border space-y-3.5 shadow-xs">
    <div className="flex items-center justify-between pb-2 border-b border-border flex-wrap gap-2">
      <div className="flex items-center space-x-2">
        <div className="p-2 rounded-xl bg-success/10 text-success">
          <Laptop className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Empacotamento &amp; Geração de Executável (.exe)
          </h3>
          <span className="text-[13px] text-muted-foreground">Electron Builder • Windows Release</span>
        </div>
      </div>
      <button
        onClick={() => copyToClipboard('npm run build:electron', 'btn-copy-build')}
        className="px-3.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 shadow-xs cursor-pointer"
        title="Copiar comando de build"
      >
        {copiedItem === 'btn-copy-build' ? (
          <>
            <Check className="w-3.5 h-3.5 text-success" />
            <span>Comando Copiado!</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            <span>Copiar Comando de Build</span>
          </>
        )}
      </button>
    </div>

    <div className="text-xs text-muted-foreground space-y-3 leading-relaxed">
      <p>
        Para distribuir o <strong className="text-foreground">Hub Manager</strong> para outros desenvolvedores ou computadores em formato executável Windows sem necessidade de Node.js instalado:
      </p>

      <div className="p-3 rounded-xl bg-card/80 border border-border font-mono text-xs text-primary flex items-center justify-between shadow-inner">
        <span>npm run build:electron</span>
        <span className="text-2xs text-muted-foreground font-sans">PowerShell / CMD</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        <div className="p-3 rounded-xl bg-card/60 border border-border space-y-1 shadow-2xs">
          <span className="font-bold text-foreground block text-xs flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success" />
            Hub Manager {appInfo?.appVersion || '1.22.0'}.exe (Portátil)
          </span>
          <p className="text-2xs text-muted-foreground">
            Versão autônoma que não necessita instalação. Pode ser executada diretamente de pastas de rede ou pendrives.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-card/60 border border-border space-y-1 shadow-2xs">
          <span className="font-bold text-foreground block text-xs flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Hub Manager Setup {appInfo?.appVersion || '1.22.0'}.exe (Instalador)
          </span>
          <p className="text-2xs text-muted-foreground">
            Instalador padrão NSIS que cria atalhos no Menu Iniciar e Área de Trabalho com desinstalador integrado.
          </p>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-success/10 text-2xs text-success flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 shrink-0 text-success" />
        <span>Ambos os executáveis solicitam elevação de Administrador (UAC) automaticamente ao abrir.</span>
      </div>
    </div>
  </div>
);
