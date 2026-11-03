import React from 'react';
import { ShieldCheck, ShieldAlert, Globe, Terminal, Zap, Settings, ArrowRight, KeyRound } from 'lucide-react';
import { SystemAppInfo } from '../../../../../shared/types';
import type { HelpCategory } from '../helpSections';

interface HelpOverviewHeroProps {
  appInfo: SystemAppInfo | null;
  webPort: number;
  sshPort: number;
  debugPort: number;
  needsSetup: boolean;
  onNavigate?: (tab: string) => void;
  setActiveCategory: (cat: HelpCategory) => void;
}

const CHIP_CLASS =
  'px-2.5 py-1 rounded-lg bg-muted/60 border border-border text-2xs font-mono text-muted-foreground flex items-center gap-1.5';

/** Faixa de abertura da Visão geral: situação deste PC e o próximo passo. O título já vem do cabeçalho da seção. */
export const HelpOverviewHero: React.FC<HelpOverviewHeroProps> = ({
  appInfo,
  webPort,
  sshPort,
  debugPort,
  needsSetup,
  onNavigate,
  setActiveCategory
}) => (
  <div className="cockpit-panel rounded-[14px] p-5 border border-border shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
    <div className="space-y-2.5 max-w-2xl">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-accent text-accent-foreground">Cockpit integrado</span>
        {appInfo?.isAdmin ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-success/10 text-success">
            <ShieldCheck className="w-3 h-3" /> Modo Administrador
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-warning/10 text-warning">
            <ShieldAlert className="w-3 h-3" /> Usuário Padrão
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Operação, desenvolvimento e qualidade do ecossistema WinThor em um só lugar: serviços e containers, banco de dados,
        deploys, rotinas, evidências de teste e esteira DevOps.
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <div className={CHIP_CLASS}>
          <Globe className="w-3 h-3 text-primary" /> Web: <strong className="text-foreground">:{webPort}</strong>
        </div>
        <div className={CHIP_CLASS}>
          <Terminal className="w-3 h-3 text-info" /> SSH Karaf: <strong className="text-foreground">:{sshPort}</strong>
        </div>
        <div className={CHIP_CLASS}>
          <Zap className="w-3 h-3 text-warning" /> JVM Debug: <strong className="text-foreground">:{debugPort}</strong>
        </div>
      </div>
    </div>

    <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
      {onNavigate && (
        <button
          type="button"
          onClick={() => onNavigate(needsSetup ? 'settings' : 'env')}
          className="h-10 px-4 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
        >
          {needsSetup ? <Settings className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
          <span>{needsSetup ? 'Configurar Ambiente' : 'Preparar Ambiente Dev'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
      <button
        type="button"
        onClick={() => setActiveCategory('shortcuts')}
        className="h-10 px-4 rounded-xl text-xs font-semibold bg-card hover:bg-muted text-foreground border border-border transition-colors flex items-center justify-center gap-2 cursor-pointer"
      >
        <KeyRound className="w-3.5 h-3.5 text-warning" />
        <span>Ver Atalhos de Teclado</span>
      </button>
    </div>
  </div>
);
