import React from 'react';
import {
  AppLogo
} from '../../AppLogo';
import {
  Copy,
  Check,
  Cpu,
  ShieldCheck,
  ShieldAlert,
  Monitor,
  HardDrive,
  Laptop,
  Download,
  RefreshCw,
  FileText,
  Code2
} from 'lucide-react';
import { SystemAppInfo, UpdateStatus } from '../../../../../shared/types';

interface HelpAboutTabProps {
  appInfo: SystemAppInfo | null;
  updateStatus: UpdateStatus | null;
  memoryUsagePercent: number;
  copiedDiag: boolean;
  copiedItem: string | null;
  handleCopyDiagnostic: () => void;
  handleCheckForUpdates: () => void;
  handleOpenChangelog: () => void;
  copyToClipboard: (text: string, key?: string) => void;
}

export const HelpAboutTab: React.FC<HelpAboutTabProps> = ({
  appInfo,
  updateStatus,
  memoryUsagePercent,
  copiedDiag,
  copiedItem,
  handleCopyDiagnostic,
  handleCheckForUpdates,
  handleOpenChangelog,
  copyToClipboard
}) => {
  return (
    <div className="space-y-4">
      {/* Informações da Aplicação & Banner */}
      <div className="cockpit-panel rounded-2xl p-5 sm:p-6 border border-border space-y-4 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <AppLogo size="md" />
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-foreground flex items-center gap-2">
                Dev <span className="text-primary font-bold">Manager</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-bold border border-primary/30">
                  v{appInfo?.appVersion || '1.28.0'}
                </span>
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Cockpit Integrado de Automação e Produtividade para Desenvolvedores
              </p>
              <p className="text-[10px] text-muted-foreground/80 font-mono mt-0.5">
                Desenvolvido por <strong>Wanderson Alves</strong>
              </p>
            </div>
          </div>

          <button
            onClick={handleCopyDiagnostic}
            className="px-3.5 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer shrink-0"
            title="Copiar relatório completo de diagnóstico para a área de transferência"
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

        {/* Tabela de Diagnóstico Técnico da Máquina */}
        <div className="pt-3 border-t border-border space-y-3">
          <div className="text-xs font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-primary" />
            <span>Diagnóstico do Ambiente de Execução</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {/* UAC / Permissão */}
            <div className="p-3.5 rounded-xl bg-card/60 border border-border space-y-1.5 shadow-xs">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                Elevação UAC (Windows):
              </span>
              <div className="flex items-center space-x-1.5 font-bold">
                {appInfo?.isAdmin ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span className="text-emerald-500">Modo Administrador (Ativo)</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    <span className="text-amber-500">Usuário Padrão (Sem Elevação)</span>
                  </>
                )}
              </div>
            </div>

            {/* Sistema Operacional */}
            <div className="p-3.5 rounded-xl bg-card/60 border border-border space-y-1.5 shadow-xs">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                Sistema Operacional:
              </span>
              <div className="flex items-center space-x-1.5 font-mono text-foreground font-semibold truncate">
                <Monitor className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="truncate">
                  {appInfo ? `Windows (${appInfo.osRelease} ${appInfo.osArch})` : 'Carregando...'}
                </span>
              </div>
            </div>

            {/* Memória RAM */}
            <div className="p-3.5 rounded-xl bg-card/60 border border-border space-y-1.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                  Memória RAM do Sistema:
                </span>
                <span className="text-[10px] font-mono text-primary font-bold">
                  {memoryUsagePercent}% em uso
                </span>
              </div>
              <div className="flex items-center space-x-1.5 font-mono text-foreground font-semibold">
                <HardDrive className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-[11px]">
                  {appInfo
                    ? `${appInfo.freeMemoryMb} MB livres de ${appInfo.totalMemoryMb} MB`
                    : 'Carregando...'}
                </span>
              </div>
              {/* Barra de Progresso de Memória */}
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${memoryUsagePercent}%` }}
                />
              </div>
            </div>

            {/* Versão Electron & Chromium */}
            <div className="p-3.5 rounded-xl bg-card/60 border border-border space-y-1.5 shadow-xs">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                Runtimes Desktop:
              </span>
              <div className="font-mono text-foreground text-[11px] truncate">
                Electron <strong className="text-primary">v{appInfo?.electronVersion}</strong> • Chrome{' '}
                <strong>v{appInfo?.chromeVersion}</strong>
              </div>
            </div>

            {/* Versão Node & V8 */}
            <div className="p-3.5 rounded-xl bg-card/60 border border-border space-y-1.5 shadow-xs">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                Motor JavaScript:
              </span>
              <div className="font-mono text-foreground text-[11px] truncate">
                Node.js <strong className="text-emerald-500">v{appInfo?.nodeVersion}</strong> • V8{' '}
                <strong>v{appInfo?.v8Version}</strong>
              </div>
            </div>

            {/* Hostname */}
            <div className="p-3.5 rounded-xl bg-card/60 border border-border space-y-1.5 shadow-xs">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                Nome da Máquina (Host):
              </span>
              <div className="font-mono text-foreground text-[11px] truncate flex items-center gap-1.5">
                <Laptop className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">{appInfo?.osHostname || 'Localhost'}</span>
              </div>
            </div>

            {/* Versão do App & Atualizações */}
            {Boolean(window.electronAPI?.onUpdateStatus) && (
              <div className="p-3.5 rounded-xl bg-card/60 border border-border space-y-1.5 shadow-xs">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                  Versão do Aplicativo:
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-foreground text-[11px]">
                    v{appInfo?.appVersion || '...'}
                    {updateStatus?.status === 'available' && (
                      <span className="ml-1.5 text-emerald-500 font-bold">→ v{updateStatus.version}</span>
                    )}
                  </span>
                  {updateStatus?.status === 'downloaded' ? (
                    <button
                      onClick={() => window.electronAPI?.installUpdate?.()}
                      className="flex items-center gap-1 px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                    >
                      <Download className="w-3 h-3" /> Instalar e Reiniciar
                    </button>
                  ) : updateStatus?.status === 'available' ? (
                    <button
                      onClick={() => window.electronAPI?.downloadUpdate?.()}
                      className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded-lg text-[10px] font-bold transition cursor-pointer"
                    >
                      <Download className="w-3 h-3" /> Baixar
                    </button>
                  ) : (
                    <button
                      onClick={handleCheckForUpdates}
                      disabled={updateStatus?.status === 'checking' || updateStatus?.status === 'downloading'}
                      className="flex items-center gap-1 px-2.5 py-1 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-[10px] font-bold transition disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${updateStatus?.status === 'checking' ? 'animate-spin' : ''}`} />
                      Verificar
                    </button>
                  )}
                </div>
                {updateStatus?.status === 'downloading' && (
                  <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.round(updateStatus.percent)}%` }}
                    />
                  </div>
                )}
                {updateStatus?.status === 'not-available' && (
                  <p className="text-[10px] text-muted-foreground">Você já está na versão mais recente.</p>
                )}
                {updateStatus?.status === 'error' && (
                  <p className="text-[10px] text-rose-500 truncate" title={updateStatus.message}>
                    Falha ao verificar: {updateStatus.message}
                  </p>
                )}
              </div>
            )}

            {/* Notas de Versão / Changelog */}
            <div className="p-3.5 rounded-xl bg-card/60 border border-border flex items-center justify-between gap-2 shadow-xs">
              <div className="min-w-0">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                  Notas de Versão
                </span>
                <span className="text-[11px] text-foreground truncate block">Histórico de mudanças e melhorias</span>
              </div>
              <button
                onClick={handleOpenChangelog}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-[10px] font-bold transition cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" /> Ver Changelog
              </button>
            </div>
          </div>

          {/* Caminho do Config JSON */}
          {appInfo?.configPath && (
            <div className="mt-3 p-3.5 rounded-xl bg-muted/60 border border-border flex items-center justify-between gap-2 shadow-inner">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Arquivo de Configurações Persistidas do Dev Manager:
                </span>
                <span className="text-[11px] font-mono text-foreground truncate block">
                  {appInfo.configPath}
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(appInfo.configPath, 'configPath')}
                className="p-1.5 rounded-lg bg-card hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer"
                title="Copiar caminho completo"
              >
                {copiedItem === 'configPath' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Geração e Distribuição do Executável (.exe) */}
      <div className="cockpit-panel rounded-2xl p-5 sm:p-6 border border-border space-y-3.5 shadow-md">
        <div className="flex items-center justify-between pb-2 border-b border-border flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-foreground">
                Empacotamento &amp; Geração de Executável (.exe)
              </h3>
              <span className="text-[10px] text-muted-foreground font-mono">Electron Builder • Windows Release</span>
            </div>
          </div>
          <button
            onClick={() => copyToClipboard('npm run build:electron', 'btn-copy-build')}
            className="px-3.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer"
            title="Copiar comando de build"
          >
            {copiedItem === 'btn-copy-build' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
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
            Para distribuir o <strong className="text-foreground">Dev Manager</strong> para outros desenvolvedores ou computadores em formato executável Windows sem necessidade de Node.js instalado:
          </p>

          <div className="p-3 rounded-xl bg-card/80 border border-border font-mono text-xs text-primary flex items-center justify-between shadow-inner">
            <span>npm run build:electron</span>
            <span className="text-[10px] text-muted-foreground font-sans">PowerShell / CMD</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-card/60 border border-border space-y-1 shadow-xs">
              <span className="font-bold text-foreground block text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Dev Manager {appInfo?.appVersion || '1.22.0'}.exe (Portátil)
              </span>
              <p className="text-[11px] text-muted-foreground">
                Versão autônoma que não necessita instalação. Pode ser executada diretamente de pastas de rede ou pendrives.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-card/60 border border-border space-y-1 shadow-xs">
              <span className="font-bold text-foreground block text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary" />
                Dev Manager Setup {appInfo?.appVersion || '1.22.0'}.exe (Instalador)
              </span>
              <p className="text-[11px] text-muted-foreground">
                Instalador padrão NSIS que cria atalhos no Menu Iniciar e Área de Trabalho com desinstalador integrado.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-600 dark:text-emerald-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>Ambos os executáveis solicitam elevação de Administrador (UAC) automaticamente ao abrir.</span>
          </div>
        </div>
      </div>

      {/* Tecnologias Utilizadas */}
      <div className="cockpit-panel rounded-2xl p-5 border border-border space-y-3 shadow-md">
        <div className="text-xs font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1.5">
          <Code2 className="w-4 h-4 text-primary" />
          <span>Stack Tecnológica do Painel</span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-lg bg-card border border-border text-foreground font-semibold">
            Electron 29
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-card border border-border text-cyan-400 font-semibold">
            React 18 + TypeScript 5
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-card border border-border text-blue-400 font-semibold">
            Tailwind CSS 3
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-card border border-border text-amber-400 font-semibold">
            Vite 5
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-card border border-border text-primary font-semibold">
            Lucide Icons
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-card border border-border text-purple-400 font-semibold">
            Apache Karaf OSGi
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-card border border-border text-emerald-400 font-semibold">
            Git &amp; Azure DevOps REST
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-card border border-border text-violet-400 font-semibold">
            Model Context Protocol (MCP)
          </span>
        </div>
      </div>
    </div>
  );
};
