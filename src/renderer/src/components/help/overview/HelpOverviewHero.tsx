import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Globe,
  Terminal,
  Zap,
  Settings,
  ArrowRight,
  Sparkles,
  Compass,
  KeyRound
} from 'lucide-react';
import { SystemAppInfo } from '../../../../../shared/types';
import { HelpCategory } from '../helpData';

interface HelpOverviewHeroProps {
  appInfo: SystemAppInfo | null;
  webPort: number;
  sshPort: number;
  debugPort: number;
  needsSetup: boolean;
  onNavigate?: (tab: string) => void;
  onRestartTour?: () => void;
  onResetPageTours?: () => void;
  setActiveCategory: (cat: HelpCategory) => void;
}

export const HelpOverviewHero: React.FC<HelpOverviewHeroProps> = ({
  appInfo,
  webPort,
  sshPort,
  debugPort,
  needsSetup,
  onNavigate,
  onRestartTour,
  onResetPageTours,
  setActiveCategory
}) => (
  <div className="cockpit-panel rounded-2xl p-5 sm:p-6 border border-border shadow-xl relative overflow-hidden">
    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
      <div className="space-y-2.5 max-w-2xl">
        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          <span className="text-2xs uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
            COCKPIT DO DESENVOLVEDOR
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            Dev Manager • v{appInfo?.appVersion || '1.22.0'}
          </span>
          {appInfo?.isAdmin ? (
            <span className="inline-flex items-center gap-1 text-2xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/25">
              <ShieldCheck className="w-3 h-3" /> Modo Administrador
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-2xs font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/25">
              <ShieldAlert className="w-3 h-3" /> Usuário Padrão
            </span>
          )}
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
          Bem-vindo ao Dev Manager 🚀
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          O cockpit unificado para eliminar o atrito diário do desenvolvimento WinThor. Controle serviços do Windows, compile e publique bundles OSGi no Apache Karaf e containers Docker, sincronize branches e abra Pull Requests no Azure DevOps sem preenchimento manual.
        </p>

        {/* Chips de Informações Chave */}
        <div className="flex items-center gap-2 pt-1 flex-wrap text-xs">
          <div className="px-2.5 py-1 rounded-lg bg-muted/60 border border-border text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
            <Globe className="w-3 h-3 text-primary" />
            <span>Web: <strong className="text-foreground">:{webPort}</strong></span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-muted/60 border border-border text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
            <Terminal className="w-3 h-3 text-cyan-400" />
            <span>SSH Karaf: <strong className="text-foreground">:{sshPort}</strong></span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-muted/60 border border-border text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>JVM Debug: <strong className="text-foreground">:{debugPort}</strong></span>
          </div>
        </div>
      </div>

      {/* Botões de Ação Imediata do Hero */}
      <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate(needsSetup ? 'settings' : 'env')}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2 cursor-pointer"
          >
            {needsSetup ? <Settings className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
            <span>{needsSetup ? 'Configurar Ambiente' : 'Preparar Ambiente Dev'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}

        {onRestartTour && (
          <button
            type="button"
            onClick={onRestartTour}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-card/80 hover:bg-card text-foreground border border-border hover:border-primary/40 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            title="Reabrir o tour guiado de boas-vindas"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Ver Tour Guiado</span>
          </button>
        )}

        {onResetPageTours && (
          <button
            type="button"
            onClick={onResetPageTours}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-card/80 hover:bg-card text-foreground border border-border hover:border-primary/40 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            title="Reativa os tutoriais rápidos de cada tela (Banco, Rotinas, Deploy, Containers, Git...)"
          >
            <Compass className="w-3.5 h-3.5 text-primary" />
            <span>Rever Tours das Telas</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveCategory('shortcuts')}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-card/60 hover:bg-card text-muted-foreground hover:text-foreground border border-border hover:border-primary/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <KeyRound className="w-3.5 h-3.5 text-amber-400" />
          <span>Ver Atalhos de Teclado</span>
        </button>
      </div>
    </div>
  </div>
);
