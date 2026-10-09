import React from 'react';
import { Copy, Check } from 'lucide-react';
import { AppLogo } from '../../AppLogo';
import { SystemAppInfo } from '../../../../../shared/types';

interface HelpAboutAppHeaderProps {
  appInfo: SystemAppInfo | null;
  copiedDiag: boolean;
  handleCopyDiagnostic: () => void;
}

export const HelpAboutAppHeader: React.FC<HelpAboutAppHeaderProps> = ({
  appInfo,
  copiedDiag,
  handleCopyDiagnostic
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div className="flex items-center space-x-3.5">
      <AppLogo size="md" />
      <div>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          Hub <span className="text-primary font-bold">Manager</span>
          <span className="text-2xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-bold border border-primary/30">
            v{appInfo?.appVersion || '1.31.0'}
          </span>
        </h3>
        <p className="text-2xs text-muted-foreground">
          Cockpit Integrado de Operação, Desenvolvimento e Qualidade
        </p>
        <p className="text-2xs text-muted-foreground/80 font-mono mt-0.5">
          Desenvolvido por <strong>Wanderson Alves</strong>
        </p>
      </div>
    </div>

    <button
      onClick={handleCopyDiagnostic}
      className="px-3.5 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer shrink-0"
      title="Copiar relatório completo de diagnóstico para a área de transferência" aria-label="Copiar relatório completo de diagnóstico para a área de transferência"
    >
      {copiedDiag ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-500" />
          <span>Diagnóstico Copiado!</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          <span>Copiar Diagnóstico do Sistema</span>
        </>
      )}
    </button>
  </div>
);
