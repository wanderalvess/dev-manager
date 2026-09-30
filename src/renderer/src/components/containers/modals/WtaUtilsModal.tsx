import React, { useState } from 'react';
import {
  Globe,
  X,
  ExternalLink,
  Terminal,
  HardDrive,
  Wrench,
  Key
} from 'lucide-react';
import type { DockerContainerInfo } from '../../../../../shared/types';
import { useCopyToClipboard } from '../../../hooks/useCopyToClipboard';
import { extractWtaPort } from '../../../utils/dockerContainerUtils';

export interface WtaUtilsModalProps {
  container: DockerContainerInfo | null;
  onClose: () => void;
  onOpenKarafClient?: (containerName: string) => Promise<void> | void;
  isOpeningKarafClient?: boolean;
}

export const WtaUtilsModal: React.FC<WtaUtilsModalProps> = ({
  container,
  onClose,
  onOpenKarafClient,
  isOpeningKarafClient = false
}) => {
  const [wtaActiveTab, setWtaActiveTab] = useState<'access' | 'karaf' | 'dev'>('access');
  const { copy: copyLogsToClipboard, copiedKey: copyFeedback } = useCopyToClipboard();

  if (!container) return null;

  const containerCleanName = container.names.replace(/^\//, '');

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/80 flex items-center justify-between bg-muted/20">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <span>Utilitários WTA — {containerCleanName}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                  Apache Karaf
                </span>
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Portal Web, Instalador, Console Karaf (/opt/pcsist) e Modo Desenvolvedor
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-border/70 px-5 gap-1 bg-muted/25 pt-2">
          <button
            onClick={() => setWtaActiveTab('access')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition cursor-pointer ${
              wtaActiveTab === 'access'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-card shadow-2xs'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Portais & Acesso Rápido</span>
          </button>

          <button
            onClick={() => setWtaActiveTab('karaf')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition cursor-pointer ${
              wtaActiveTab === 'karaf'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-card shadow-2xs'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Console Karaf & Portas</span>
          </button>

          <button
            onClick={() => setWtaActiveTab('dev')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition cursor-pointer ${
              wtaActiveTab === 'dev'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-card shadow-2xs'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Modo Desenvolvedor (~/.m2)</span>
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-auto p-5 space-y-4 [scrollbar-width:thin]">
          {/* ABA 1: PORTAIS E ACESSO RÁPIDO */}
          {wtaActiveTab === 'access' && (
            <div className="space-y-4">
              {/* Banner Explicativo */}
              <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3.5 flex items-start gap-3">
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
              {(() => {
                const port = extractWtaPort(container.ports);
                const portalUrl = `http://localhost:${port}/wta/`;
                const installerUrl = `http://localhost:${port}/instalador`;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 bg-card border border-border/80 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-cyan-500" />
                          <span>Portal WTA</span>
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
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

                    <div className="p-3.5 bg-card border border-border/80 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5 text-amber-500" />
                          <span>Instalador WTA</span>
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
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
                );
              })()}

              {/* Credenciais Padrão */}
              <div className="p-4 bg-muted/30 border border-border/80 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-primary" />
                    <span>Credenciais Padrão do WTA</span>
                  </span>
                  <button
                    onClick={() => copyLogsToClipboard('PCADMIN\t1', 'wta-creds')}
                    className="text-[10px] px-2 py-0.5 rounded bg-card hover:bg-muted text-foreground border border-border/80 font-medium transition cursor-pointer"
                  >
                    {copyFeedback === 'wta-creds' ? 'Copiado!' : 'Copiar Credenciais'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 bg-background rounded-lg border border-border/60">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Usuário</span>
                    <div className="font-mono text-xs font-bold text-foreground">PCADMIN</div>
                  </div>
                  <div className="p-2.5 bg-background rounded-lg border border-border/60">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Senha</span>
                    <div className="font-mono text-xs font-bold text-foreground">1</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: CONSOLE KARAF & PORTAS */}
          {wtaActiveTab === 'karaf' && (
            <div className="space-y-4">
              {/* Botão de Disparo do Console Karaf */}
              <div className="p-4 bg-card border border-border/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-cyan-500" />
                      <span>Console Interativo Karaf Client</span>
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Abre terminal interativo executando <code className="text-foreground font-mono">/opt/pcsist/apache-karaf/bin/client</code> dentro do container
                    </p>
                  </div>

                  <button
                    onClick={() => onOpenKarafClient?.(container.names)}
                    disabled={isOpeningKarafClient}
                    className="flex items-center space-x-1.5 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 active:scale-98"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>{isOpeningKarafClient ? 'Abrindo Console...' : 'Abrir Console Karaf'}</span>
                  </button>
                </div>
              </div>

              {/* Tabela de Portas do WTA */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-foreground px-1 block">
                  Mapeamento das Portas Padrão do Apache Karaf
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">HTTP Web</span>
                    <div className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">8080</div>
                    <p className="text-[10px] text-muted-foreground">Portal & APIs</p>
                  </div>

                  <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">SSH Karaf</span>
                    <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">8101</div>
                    <p className="text-[10px] text-muted-foreground">user/pass: karaf</p>
                  </div>

                  <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">JMX RMI</span>
                    <div className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">1099</div>
                    <p className="text-[10px] text-muted-foreground">Monitoramento</p>
                  </div>

                  <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Artemis JMS</span>
                    <div className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">61616</div>
                    <p className="text-[10px] text-muted-foreground">Broker de Filas</p>
                  </div>
                </div>
              </div>

              {/* Comandos Úteis */}
              <div className="p-3.5 bg-[#090D14] rounded-xl border border-border/60 text-xs font-mono text-emerald-400 space-y-1">
                <div className="text-muted-foreground text-[10px] font-sans font-semibold mb-1">
                  Comandos frequentes no console Karaf:
                </div>
                <div>bundle:list | grep -i winthor <span className="text-muted-foreground font-sans text-[10px]"># Lista bundles WinThor</span></div>
                <div>bundle:diag &lt;id&gt; <span className="text-muted-foreground font-sans text-[10px]"># Diagnóstico de falha de resolução</span></div>
                <div>log:tail <span className="text-muted-foreground font-sans text-[10px]"># Acompanha logs do Karaf em tempo real</span></div>
              </div>
            </div>
          )}

          {/* ABA 3: MODO DESENVOLVEDOR */}
          {wtaActiveTab === 'dev' && (
            <div className="space-y-4">
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3.5 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div className="text-xs leading-relaxed text-muted-foreground">
                  <strong className="text-foreground font-semibold block mb-0.5">
                    Modo Desenvolvedor: Montagem do Cache ~/.m2
                  </strong>
                  O container WTA monta o diretório de dependências Maven do host (<code className="text-foreground font-mono">~/.m2/repository</code>) diretamente em <code className="text-foreground font-mono">/root/.m2/repository</code>. Assim, qualquer JAR gerado via <code className="text-foreground font-mono">mvn install</code> no host fica imediatamente acessível pelo Karaf.
                </div>
              </div>

              <div className="p-3.5 bg-card border border-border/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Variáveis do arquivo wta.env (Modelo Oficial)</span>
                  <button
                    onClick={() =>
                      copyLogsToClipboard(
                        'DB_HOST=172.17.0.1\nDB_PORT=1521\nDB_SERVICE=XE\nDB_USER=LOCAL\nDB_PASSWORD=pcinfo\n',
                        'wta-env-sample'
                      )
                    }
                    className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground border border-border/80 font-medium transition cursor-pointer"
                  >
                    {copyFeedback === 'wta-env-sample' ? 'Copiado!' : 'Copiar Modelo wta.env'}
                  </button>
                </div>

                <pre className="bg-[#090D14] p-3 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto select-all border border-border/60">
DB_HOST=172.17.0.1
DB_PORT=1521
DB_SERVICE=XE
DB_USER=LOCAL
DB_PASSWORD=pcinfo
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/80 flex items-center justify-between bg-muted/10">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" />
            Interoperabilidade WTA INFR-Docker
          </span>

          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-card hover:bg-muted border border-border/80 text-foreground rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
