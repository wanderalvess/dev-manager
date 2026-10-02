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
  KeyRound,
  Workflow,
  Boxes,
  Database,
  Layers,
  GitPullRequest,
  Grid,
  FileSearch,
  FileText,
  Activity,
  ExternalLink,
  Copy,
  Check,
  CheckCheck,
  HelpCircle
} from 'lucide-react';
import { SystemAppInfo } from '../../../../../shared/types';
import { HelpCategory } from '../helpData';

interface HelpOverviewTabProps {
  appInfo: SystemAppInfo | null;
  webPort: number;
  sshPort: number;
  debugPort: number;
  portalWebUrl: string;
  consoleUrl: string;
  needsSetup: boolean;
  onNavigate?: (tab: string) => void;
  onRestartTour?: () => void;
  onResetPageTours?: () => void;
  setActiveCategory: (cat: HelpCategory) => void;
  handleOpenLink: (url: string) => void;
  copyToClipboard: (text: string, key?: string) => void;
  copiedItem: string | null;
}

export const HelpOverviewTab: React.FC<HelpOverviewTabProps> = ({
  appInfo,
  webPort,
  sshPort,
  debugPort,
  portalWebUrl,
  consoleUrl,
  needsSetup,
  onNavigate,
  onRestartTour,
  onResetPageTours,
  setActiveCategory,
  handleOpenLink,
  copyToClipboard,
  copiedItem
}) => {
  return (
    <div className="space-y-4">
      {/* HERO BANNER / COCKPIT COMMAND DECK */}
      <div className="cockpit-panel rounded-2xl p-5 sm:p-6 border border-border shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-[10px] uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                COCKPIT DO DESENVOLVEDOR
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                Dev Manager • v{appInfo?.appVersion || '1.22.0'}
              </span>
              {appInfo?.isAdmin ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/25">
                  <ShieldCheck className="w-3 h-3" /> Modo Administrador
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/25">
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

      {/* PIPELINE DO FLUXO DE TRABALHO DIÁRIO (5 PASSOS ESTRUTURADOS) */}
      <div className="cockpit-panel rounded-2xl p-5 border border-border shadow-xl space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-border flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Workflow className="w-4 h-4 text-primary" />
            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-foreground">
              Fluxo de Trabalho Diário Recomendado
            </h3>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">
            5 passos essenciais para máxima produtividade
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Passo 1: Preparar Ambiente */}
          <div className="p-4 rounded-xl bg-card/60 border border-cyan-500/20 hover:border-cyan-500/60 transition-all duration-200 flex flex-col justify-between space-y-3 group shadow-sm hover:shadow-md">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 flex items-center justify-center font-bold text-xs">
                  1
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-semibold">
                  Ambiente
                </span>
              </div>
              <h4 className="text-xs font-bold text-foreground group-hover:text-cyan-400 transition-colors">
                Preparar Ambiente
              </h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Encerra processos travados, libera portas TCP, inicia a IDE configurada e sobe os serviços em modo Debug.
              </p>
              <div className="flex flex-wrap gap-1 pt-1 font-mono text-[9px] text-muted-foreground">
                <span className="px-1.5 py-0.5 rounded bg-muted/70">:{debugPort} JDWP</span>
                <span className="px-1.5 py-0.5 rounded bg-muted/70">Portas</span>
              </div>
            </div>

            {onNavigate && (
              <button
                onClick={() => onNavigate('env')}
                className="pt-2 text-[11px] text-cyan-400 font-bold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <span>Ir para Ambiente</span> <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Passo 2: Perfis de Deploy */}
          <div className="p-4 rounded-xl bg-card/60 border border-amber-500/20 hover:border-amber-500/60 transition-all duration-200 flex flex-col justify-between space-y-3 group shadow-sm hover:shadow-md">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/25 flex items-center justify-center font-bold text-xs">
                  2
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-semibold">
                  Deploy
                </span>
              </div>
              <h4 className="text-xs font-bold text-foreground group-hover:text-amber-500 transition-colors">
                Compilar &amp; Deploy
              </h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Pipelines sequenciais de build Maven, deploy de bundles OSGi no Karaf (<code className="font-mono text-primary">client.bat</code>) e Docker com streaming de saída.
              </p>
              <div className="flex flex-wrap gap-1 pt-1 font-mono text-[9px] text-muted-foreground">
                <span className="px-1.5 py-0.5 rounded bg-muted/70">OSGi</span>
                <span className="px-1.5 py-0.5 rounded bg-muted/70">Docker</span>
                <span className="px-1.5 py-0.5 rounded bg-muted/70">Maven</span>
              </div>
            </div>

            {onNavigate && (
              <button
                onClick={() => onNavigate('deploy')}
                className="pt-2 text-[11px] text-amber-500 font-bold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <span>Ir para Deploy</span> <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Passo 3: Git & Pull Request */}
          <div className="p-4 rounded-xl bg-card/60 border border-blue-500/20 hover:border-blue-500/60 transition-all duration-200 flex flex-col justify-between space-y-3 group shadow-sm hover:shadow-md">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/25 flex items-center justify-center font-bold text-xs">
                  3
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 font-semibold">
                  Git Hub
                </span>
              </div>
              <h4 className="text-xs font-bold text-foreground group-hover:text-blue-500 transition-colors">
                Git &amp; Pull Request
              </h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Sincroniza branches locais com a develop e abre a tela de criação de Pull Request no Azure DevOps sem preenchimento manual.
              </p>
              <div className="flex flex-wrap gap-1 pt-1 font-mono text-[9px] text-muted-foreground">
                <span className="px-1.5 py-0.5 rounded bg-muted/70">Azure DevOps</span>
                <span className="px-1.5 py-0.5 rounded bg-muted/70">Branches</span>
              </div>
            </div>

            {onNavigate && (
              <button
                onClick={() => onNavigate('git')}
                className="pt-2 text-[11px] text-blue-500 font-bold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <span>Ir para Git &amp; Azure</span> <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Passo 4: Catálogo de Rotinas */}
          <div className="p-4 rounded-xl bg-card/60 border border-indigo-500/20 hover:border-indigo-500/60 transition-all duration-200 flex flex-col justify-between space-y-3 group shadow-sm hover:shadow-md">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 flex items-center justify-center font-bold text-xs">
                  4
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-semibold">
                  Rotinas
                </span>
              </div>
              <h4 className="text-xs font-bold text-foreground group-hover:text-indigo-400 transition-colors">
                Catálogo de Rotinas
              </h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Localização instantânea de executáveis Delphi (.exe e .pc), download direto e atualização pela Central de Controle WinThor (CCW) com backup .bak automático.
              </p>
              <div className="flex flex-wrap gap-1 pt-1 font-mono text-[9px] text-muted-foreground">
                <span className="px-1.5 py-0.5 rounded bg-muted/70">Delphi .exe</span>
                <span className="px-1.5 py-0.5 rounded bg-muted/70">CCW Download</span>
                <span className="px-1.5 py-0.5 rounded bg-muted/70">Backup .bak</span>
              </div>
            </div>

            {onNavigate && (
              <button
                onClick={() => onNavigate('routines')}
                className="pt-2 text-[11px] text-indigo-400 font-bold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <span>Ir para Rotinas</span> <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Passo 5: Banco de Dados & RAG */}
          <div className="p-4 rounded-xl bg-card/60 border border-violet-500/20 hover:border-violet-500/60 transition-all duration-200 flex flex-col justify-between space-y-3 group shadow-sm hover:shadow-md">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/25 flex items-center justify-center font-bold text-xs">
                  5
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 font-semibold">
                  Dados &amp; Docs
                </span>
              </div>
              <h4 className="text-xs font-bold text-foreground group-hover:text-violet-400 transition-colors">
                Banco &amp; Docs RAG
              </h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Studio SQL multi-vendor (Oracle/Postgres) com rotinas de backup, e busca semântica em contratos de API e manuais com IA.
              </p>
              <div className="flex flex-wrap gap-1 pt-1 font-mono text-[9px] text-muted-foreground">
                <span className="px-1.5 py-0.5 rounded bg-muted/70">Oracle / PG</span>
                <span className="px-1.5 py-0.5 rounded bg-muted/70">FastEmbed IA</span>
              </div>
            </div>

            {onNavigate && (
              <button
                onClick={() => onNavigate('database')}
                className="pt-2 text-[11px] text-violet-400 font-bold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <span>Ir para Banco</span> <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MATRIZ DE MÓDULOS & ATALHOS RÁPIDOS */}
      <div className="cockpit-panel rounded-2xl p-5 border border-border shadow-xl space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-border flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Boxes className="w-4 h-4 text-primary" />
            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-foreground">
              Ecossistema &amp; Módulos do Sistema
            </h3>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">
            Atalhos globais de acesso direto (Alt + 0..9)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5 gap-3">
          {/* 1. Ambiente */}
          <div
            onClick={() => onNavigate?.('env')}
            className="p-3.5 rounded-xl bg-card/60 border border-border hover:border-primary/50 transition-all cursor-pointer group flex items-start justify-between gap-3 shadow-xs"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                  Ambiente Dev
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                Serviços Windows, liberação de portas e servidor OSGi Debug.
              </p>
            </div>
            <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold shrink-0">
              Alt+1
            </kbd>
          </div>

          {/* 2. Banco de Dados */}
          <div
            onClick={() => onNavigate?.('database')}
            className="p-3.5 rounded-xl bg-card/60 border border-border hover:border-emerald-500/50 transition-all cursor-pointer group flex items-start justify-between gap-3 shadow-xs"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-xs font-bold text-foreground group-hover:text-emerald-500 transition-colors truncate">
                  Banco de Dados
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                Database Studio Oracle, PostgreSQL, MySQL e Backups agendados.
              </p>
            </div>
            <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold shrink-0">
              Alt+2
            </kbd>
          </div>

          {/* 3. Containers */}
          <div
            onClick={() => onNavigate?.('containers')}
            className="p-3.5 rounded-xl bg-card/60 border border-border hover:border-blue-400/50 transition-all cursor-pointer group flex items-start justify-between gap-3 shadow-xs"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="text-xs font-bold text-foreground group-hover:text-blue-400 transition-colors truncate">
                  Containers Docker
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                Gestão de ciclo de vida de containers, streaming de logs e status.
              </p>
            </div>
            <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold shrink-0">
              Alt+3
            </kbd>
          </div>

          {/* 4. Deploy */}
          <div
            onClick={() => onNavigate?.('deploy')}
            className="p-3.5 rounded-xl bg-card/60 border border-border hover:border-amber-500/50 transition-all cursor-pointer group flex items-start justify-between gap-3 shadow-xs"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-xs font-bold text-foreground group-hover:text-amber-500 transition-colors truncate">
                  Deploy &amp; OSGi
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                Pipelines Karaf, Maven builds, Docker compose e scripts custom.
              </p>
            </div>
            <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold shrink-0">
              Alt+4
            </kbd>
          </div>

          {/* 5. Git & Azure */}
          <div
            onClick={() => onNavigate?.('git')}
            className="p-3.5 rounded-xl bg-card/60 border border-border hover:border-blue-500/50 transition-all cursor-pointer group flex items-start justify-between gap-3 shadow-xs"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <GitPullRequest className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="text-xs font-bold text-foreground group-hover:text-blue-500 transition-colors truncate">
                  Git &amp; Azure DevOps
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                Status de branches, diffs, commits e criação ágil de Pull Requests.
              </p>
            </div>
            <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold shrink-0">
              Alt+5
            </kbd>
          </div>

          {/* 6. Rotinas */}
          <div
            onClick={() => onNavigate?.('routines')}
            className="p-3.5 rounded-xl bg-card/60 border border-border hover:border-indigo-500/50 transition-all cursor-pointer group flex items-start justify-between gap-3 shadow-xs"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Grid className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-xs font-bold text-foreground group-hover:text-indigo-400 transition-colors truncate">
                  Catálogo de Rotinas
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                Executáveis WinThor (.exe/.pc), download CCW e rollback .bak.
              </p>
            </div>
            <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold shrink-0">
              Alt+6
            </kbd>
          </div>

          {/* 7. Documentação RAG */}
          <div
            onClick={() => onNavigate?.('docs')}
            className="p-3.5 rounded-xl bg-card/60 border border-border hover:border-purple-500/50 transition-all cursor-pointer group flex items-start justify-between gap-3 shadow-xs"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <FileSearch className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="text-xs font-bold text-foreground group-hover:text-purple-400 transition-colors truncate">
                  Documentação (RAG)
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                Busca semântica em manuais e contratos de API com IA local.
              </p>
            </div>
            <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold shrink-0">
              Alt+7
            </kbd>
          </div>

          {/* 8. Logs */}
          <div
            onClick={() => onNavigate?.('logs')}
            className="p-3.5 rounded-xl bg-card/60 border border-border hover:border-sky-500/50 transition-all cursor-pointer group flex items-start justify-between gap-3 shadow-xs"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-sky-500 shrink-0" />
                <span className="text-xs font-bold text-foreground group-hover:text-sky-500 transition-colors truncate">
                  Logs em Tempo Real
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                Acompanhamento contínuo (tail -f) de logs de aplicações.
              </p>
            </div>
            <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold shrink-0">
              Alt+8
            </kbd>
          </div>

          {/* 9. APM & Traces */}
          <div
            onClick={() => onNavigate?.('apm')}
            className="p-3.5 rounded-xl bg-card/60 border border-border hover:border-rose-500/50 transition-all cursor-pointer group flex items-start justify-between gap-3 shadow-xs"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="text-xs font-bold text-foreground group-hover:text-rose-500 transition-colors truncate">
                  APM &amp; Traces
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                Receptor OpenTelemetry, latências, erros e waterfall de traces.
              </p>
            </div>
            <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold shrink-0">
              Alt+0
            </kbd>
          </div>

          {/* 10. Qualidade & Homologação */}
          <div
            onClick={() => onNavigate?.('quality')}
            className="p-3.5 rounded-xl bg-card/60 border border-border hover:border-emerald-500/50 transition-all cursor-pointer group flex items-start justify-between gap-3 shadow-xs"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <CheckCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-foreground group-hover:text-emerald-400 transition-colors truncate">
                  Qualidade (QA &amp; PO)
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                Matriz de validação, critérios de aceite e prontidão de releases.
              </p>
            </div>
            <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold shrink-0">
              Alt+Q
            </kbd>
          </div>

          {/* 11. Configurações */}
          <div
            onClick={() => onNavigate?.('settings')}
            className="p-3.5 rounded-xl bg-card/60 border border-border hover:border-primary/50 transition-all cursor-pointer group flex items-start justify-between gap-3 shadow-xs"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                  Configurações
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                Pastas do workspace, portas monitoradas, Karaf e IDEs.
              </p>
            </div>
          </div>

          {/* 12. Central de Ajuda */}
          <div
            onClick={() => onNavigate?.('help')}
            className="p-3.5 rounded-xl bg-card/60 border border-border hover:border-primary/50 transition-all cursor-pointer group flex items-start justify-between gap-3 shadow-xs"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                  Central de Ajuda
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                Tutoriais, documentação dos módulos, FAQ e atalhos globais.
              </p>
            </div>
            <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold shrink-0">
              Alt+9
            </kbd>
          </div>
        </div>
      </div>

      {/* DECK DE SERVIÇOS & ENDPOINTS LOCAIS */}
      <div className="cockpit-panel rounded-2xl p-5 border border-border shadow-xl space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-border flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Compass className="w-4 h-4 text-primary" />
            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-foreground">
              Serviços Locais &amp; Portais Externos
            </h3>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">
            Acesso rápido em 1 clique aos endpoints do ecossistema
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Portal Web Local */}
          <div className="p-4 rounded-xl bg-card/60 border border-border hover:border-primary/50 transition-all space-y-3 flex flex-col justify-between shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground block">
                  Portal Web Local
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                  :{webPort}
                </span>
              </div>
              <p className="text-[11px] font-mono text-muted-foreground truncate" title={portalWebUrl}>
                {portalWebUrl.replace('http://', '')}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => handleOpenLink(portalWebUrl)}
                className="flex-1 py-1.5 px-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir</span>
              </button>
              <button
                onClick={() => copyToClipboard(portalWebUrl, 'link-web')}
                className="p-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition cursor-pointer"
                title="Copiar URL"
              >
                {copiedItem === 'link-web' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* 2. Console Felix / OSGi */}
          <div className="p-4 rounded-xl bg-card/60 border border-border hover:border-amber-500/50 transition-all space-y-3 flex flex-col justify-between shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground block">
                  Console Felix / OSGi
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold">
                  Bundles
                </span>
              </div>
              <p className="text-[11px] font-mono text-muted-foreground truncate" title={consoleUrl}>
                {consoleUrl.replace('http://', '')}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => handleOpenLink(consoleUrl)}
                className="flex-1 py-1.5 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir</span>
              </button>
              <button
                onClick={() => copyToClipboard(consoleUrl, 'link-console')}
                className="p-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition cursor-pointer"
                title="Copiar URL"
              >
                {copiedItem === 'link-console' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* 3. Documentação Apache Karaf */}
          <div className="p-4 rounded-xl bg-card/60 border border-border hover:border-blue-500/50 transition-all space-y-3 flex flex-col justify-between shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground block">
                  Apache Karaf Docs
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 font-bold">
                  Manual
                </span>
              </div>
              <p className="text-[11px] font-mono text-muted-foreground truncate">
                karaf.apache.org/documentation
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => handleOpenLink('https://karaf.apache.org/documentation.html')}
                className="w-full py-1.5 px-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Acessar Manual</span>
              </button>
            </div>
          </div>

          {/* 4. Portal Azure DevOps */}
          <div className="p-4 rounded-xl bg-card/60 border border-border hover:border-indigo-500/50 transition-all space-y-3 flex flex-col justify-between shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground block">
                  Azure DevOps
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-bold">
                  PRs &amp; Repos
                </span>
              </div>
              <p className="text-[11px] font-mono text-muted-foreground truncate">
                dev.azure.com
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => handleOpenLink('https://dev.azure.com')}
                className="w-full py-1.5 px-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir Portal</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
